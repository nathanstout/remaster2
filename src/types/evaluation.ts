import type { Runtime, RuntimeSource, SerializedValue } from './runtime';

/** One executable check against the user's solution. */
export interface TestCase {
  id: string;
  name: string;
  /**
   * Test body, executed with `assert`, `sleep` and `waitFor` in scope. For
   * JavaScript problems it shares a lexical scope with the user's source, so
   * their declarations are directly callable.
   */
  source: string;
  /** Overrides the default per-test budget. */
  timeoutMs?: number;
}

export interface TestSuite {
  cases: TestCase[];
}

export type TestStatus = 'passed' | 'failed' | 'timed-out';

export interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  message?: string;
  /** Present for assertion failures that compared two values. */
  expected?: SerializedValue;
  actual?: SerializedValue;
  durationMs?: number;
}

/**
 * Evaluation reports on its own channel rather than through `RuntimeEvent`.
 *
 * Keeping the two streams separate is what guarantees a test run cannot clear
 * the console, spend its per-run message budget, or move the playground's run
 * status — the two are structurally unable to interfere.
 */
export type EvaluationEvent =
  | { type: 'evaluation-start'; total: number }
  | { type: 'test-result'; result: TestResult }
  | { type: 'evaluation-complete'; passed: number; failed: number; total: number }
  | { type: 'evaluation-cancelled' };

export type EvaluationEventHandler = (event: EvaluationEvent) => void;

/**
 * A runtime that can check a solution against a suite.
 *
 * An optional capability, like `PreviewRuntime` — the base `Runtime` stays two
 * methods wide, and nothing is forced to implement evaluation it cannot do.
 */
export interface EvaluatableRuntime extends Runtime {
  /** Runs every case in its own disposable environment, reporting as it goes. */
  evaluate(source: RuntimeSource, suite: TestSuite, emit: EvaluationEventHandler): void;
  /** Aborts an in-flight evaluation and releases whatever it was using. */
  cancelEvaluation(): void;
}

export function isEvaluatableRuntime(runtime: Runtime): runtime is EvaluatableRuntime {
  const candidate = runtime as Partial<EvaluatableRuntime>;
  return (
    typeof candidate.evaluate === 'function' && typeof candidate.cancelEvaluation === 'function'
  );
}

/** Default per-test budget. Async exercises need room; hangs must not linger. */
export const DEFAULT_TEST_TIMEOUT_MS = 2_000;
