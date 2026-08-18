import { useCallback, useEffect, useRef, useState } from 'react';
import { createRuntime } from '../runtime/createRuntime';
import { MAX_CONSOLE_ENTRIES } from '../runtime/shared/consoleLimit';
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
}

/**
 * Owns the runtime instance for a problem and turns its event stream into
 * render-ready state. This is the only place the UI touches the runtime layer.
 */
export function useRuntime(problem: Problem | undefined): RuntimeController {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [generation, setGeneration] = useState(0);
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
      runtime.dispose();
    };
  }, [problem]);

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

  return { entries, status, run, generation, previewRef };
}
