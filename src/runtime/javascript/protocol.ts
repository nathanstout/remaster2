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
