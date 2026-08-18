import { useCallback, useEffect, useRef, useState } from 'react';
import { createRuntime } from '../runtime/createRuntime';
import { MAX_CONSOLE_ENTRIES } from '../runtime/shared/consoleLimit';
import {
  isEvaluatableRuntime,
  type EvaluationEvent,
  type TestResult,
  type TestSuite,
} from '../types/evaluation';
import type { Problem } from '../types/problem';
import {
  isPreviewRuntime,
  type ConsoleLevel,
  type Runtime,
  type RuntimeEvent,
  type RuntimeSource,
  type SerializedValue,
} from '../types/runtime';

export type ConsoleEntry =
  | { id: number; kind: 'console'; level: ConsoleLevel; args: SerializedValue[] }
  | { id: number; kind: 'error'; message: string; stack?: string }
  /** Runtime-level notice, e.g. that output was cut off. Not user output. */
  | { id: number; kind: 'notice'; message: string };


export { MAX_CONSOLE_ENTRIES };

export type RunStatus = 'idle' | 'running' | 'finished' | 'timeout' | 'error';

export type EvaluationStatus = 'idle' | 'running' | 'complete';

export interface EvaluationSummary {
  passed: number;
  failed: number;
  total: number;
}

export interface RunTestsOptions {
  /**
   * Called once when a run finishes on its own. Not called for a run that was
   * cancelled or superseded, so callers can safely treat it as "this exact run
   * produced this exact outcome".
   */
  onComplete?: (summary: EvaluationSummary) => void;
}

export interface EvaluationState {
  status: EvaluationStatus;
  results: TestResult[];
  /** Known once a run starts, so progress can be shown as results arrive. */
  total: number;
}

const IDLE_EVALUATION: EvaluationState = { status: 'idle', results: [], total: 0 };

export interface RuntimeController {
  entries: ConsoleEntry[];
  status: RunStatus;
  run: (source: RuntimeSource) => void;
  /**
   * Increments whenever a new runtime instance is created. Callers include it
   * in their run effect so the current source is re-executed against a
   * replacement runtime (problem switch, or React's dev-mode remount).
   */
  generation: number;
  /**
   * Ref callback for the preview container. Harmless to attach for runtimes
   * without preview capability — it simply never gets used.
   */
  previewRef: (element: HTMLElement | null) => void;
  /** Whether this problem's runtime can check a solution at all. */
  canEvaluate: boolean;
  evaluation: EvaluationState;
  runTests: (source: RuntimeSource, suite: TestSuite, options?: RunTestsOptions) => void;
  /** Cancels any in-flight evaluation and drops results that are now stale. */
  clearEvaluation: () => void;
}

/**
 * Owns the runtime instance for a problem and turns its event stream into
 * render-ready state. This is the only place the UI touches the runtime layer.
 */
export function useRuntime(problem: Problem | undefined): RuntimeController {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [generation, setGeneration] = useState(0);
  const [evaluation, setEvaluation] = useState<EvaluationState>(IDLE_EVALUATION);
  const runtimeRef = useRef<Runtime | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!problem) return;

    let entryId = 0;
    // Budget is per run, and every run starts with a full one.
    let remaining = MAX_CONSOLE_ENTRIES;

    /** Returns false once the run's budget is spent, emitting one notice. */
    const spendBudget = (): boolean => {
      if (remaining > 0) {
        remaining -= 1;
        return true;
      }
      if (remaining === 0) {
        remaining = -1;
        setEntries((prev) => [
          ...prev,
          {
            id: entryId++,
            kind: 'notice',
            message: `Output truncated after ${MAX_CONSOLE_ENTRIES} messages. The code is still running.`,
          },
        ]);
      }
      return false;
    };

    const handleEvent = (event: RuntimeEvent): void => {
      switch (event.type) {
        case 'start':
          // Every run begins from an empty console and a fresh budget.
          setEntries([]);
          setStatus('running');
          remaining = MAX_CONSOLE_ENTRIES;
          break;
        case 'console':
          if (!spendBudget()) break;
          setEntries((prev) => [
            ...prev,
            { id: entryId++, kind: 'console', level: event.level, args: event.args },
          ]);
          break;
        case 'error':
          if (!spendBudget()) break;
          setEntries((prev) => [
            ...prev,
            { id: entryId++, kind: 'error', message: event.message, stack: event.stack },
          ]);
          break;
        case 'complete':
          setStatus(event.reason === 'finished' ? 'finished' : event.reason);
          break;
      }
    };

    const runtime = createRuntime(problem, handleEvent);
    runtimeRef.current = runtime;
    // Refs are attached during commit, before this effect runs, so the
    // container is usually already waiting for the runtime that will use it.
    if (isPreviewRuntime(runtime) && containerRef.current) {
      runtime.mount(containerRef.current);
    }
    setGeneration((value) => value + 1);

    return () => {
      runtimeRef.current = null;
      // Disposal cancels evaluation too, so switching problems can never leave
      // a suite running against source that is no longer on screen.
      runtime.dispose();
    };
  }, [problem]);

  // A new problem starts with no results.
  useEffect(() => setEvaluation(IDLE_EVALUATION), [problem]);

  const run = useCallback((source: RuntimeSource) => {
    runtimeRef.current?.run(source);
  }, []);

  const previewRef = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
    const runtime = runtimeRef.current;
    if (!runtime || !isPreviewRuntime(runtime)) return;
    if (element) runtime.mount(element);
    else runtime.unmount();
  }, []);

  const runTests = useCallback((source: RuntimeSource, suite: TestSuite, options?: RunTestsOptions) => {
    const runtime = runtimeRef.current;
    if (!runtime || !isEvaluatableRuntime(runtime)) return;

    // Starting a run supersedes whatever was running before.
    runtime.cancelEvaluation();
    setEvaluation({ status: 'running', results: [], total: suite.cases.length });

    const handleEvent = (event: EvaluationEvent): void => {
      switch (event.type) {
        case 'evaluation-start':
          setEvaluation({ status: 'running', results: [], total: event.total });
          break;
        case 'test-result':
          // Results land one at a time, so progress is visible as it happens.
          setEvaluation((prev) => ({ ...prev, results: [...prev.results, event.result] }));
          break;
        case 'evaluation-complete':
          setEvaluation((prev) => ({ ...prev, status: 'complete' }));
          options?.onComplete?.({
            passed: event.passed,
            failed: event.failed,
            total: event.total,
          });
          break;
        case 'evaluation-cancelled':
          setEvaluation(IDLE_EVALUATION);
          break;
      }
    };

    runtime.evaluate(source, suite, handleEvent);
  }, []);

  const clearEvaluation = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime && isEvaluatableRuntime(runtime)) runtime.cancelEvaluation();
    setEvaluation((prev) => (prev === IDLE_EVALUATION ? prev : IDLE_EVALUATION));
  }, []);

  const canEvaluate =
    runtimeRef.current !== null && isEvaluatableRuntime(runtimeRef.current) && generation > 0;

  return {
    entries,
    status,
    run,
    generation,
    previewRef,
    canEvaluate,
    evaluation,
    runTests,
    clearEvaluation,
  };
}
