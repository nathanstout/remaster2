import type { ConsoleLevel, SerializedValue } from '../../types/runtime';

/** Main thread -> Worker. */
export type WorkerInbound = {
  type: 'run';
  code: string;
};

/** Worker -> main thread. */
export type WorkerOutbound =
  | { type: 'console'; level: ConsoleLevel; args: SerializedValue[] }
  | { type: 'error'; message: string; stack?: string }
  /** The top-level (synchronous) body finished. Async work may still be pending. */
  | { type: 'evaluated' }
  /** Everything, including tracked async work, is done. */
  | { type: 'complete' };

/** Main thread -> evaluation Worker. One test per Worker, then terminate. */
export type EvaluationWorkerInbound = {
  type: 'run-test';
  userCode: string;
  testSource: string;
};

/** Evaluation Worker -> main thread. */
export type EvaluationWorkerOutbound = {
  type: 'result';
  status: 'passed' | 'failed';
  message?: string;
  expected?: SerializedValue;
  actual?: SerializedValue;
  durationMs?: number;
};
