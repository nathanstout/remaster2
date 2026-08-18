import type {
  Runtime,
  RuntimeEventHandler,
  RuntimeSource,
} from '../../types/runtime';
import type { WorkerInbound, WorkerOutbound } from './protocol';

/** Longest the synchronous body may run before we assume it is stuck. */
const SYNC_TIMEOUT_MS = 4_000;
/** Hard ceiling on a whole execution, including pending timers/intervals. */
const TOTAL_TIMEOUT_MS = 10_000;

interface Execution {
  id: number;
  worker: Worker;
  syncTimer: number;
  totalTimer: number;
  done: boolean;
}

/**
 * Runs JavaScript problems in a disposable Web Worker.
 *
 * One instance lives for as long as the problem is open; each `run()` throws
 * the previous Worker away and builds a new one, which is what guarantees a
 * clean slate — no leftover globals, timers, listeners or module state.
 */
export class JavaScriptWorkerRuntime implements Runtime {
  private readonly emit: RuntimeEventHandler;
  private current: Execution | null = null;
  private nextId = 1;
  private disposed = false;

  constructor(emit: RuntimeEventHandler) {
    this.emit = emit;
  }

  run(source: RuntimeSource): void {
    if (this.disposed) return;

    this.teardown();

    const code = source.files[source.entry] ?? '';
    const id = this.nextId++;

    let worker: Worker;
    try {
      worker = new Worker(new URL('./javascript.worker.ts', import.meta.url), {
        type: 'module',
        name: `js-runtime-${id}`,
      });
    } catch (error) {
      this.emit({ type: 'start' });
      this.emit({
        type: 'error',
        message: `Failed to start execution environment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      this.emit({ type: 'complete', reason: 'error' });
      return;
    }

    const execution: Execution = {
      id,
      worker,
      done: false,
      syncTimer: window.setTimeout(() => {
        this.finish(id, 'timeout', 'Execution timed out.');
      }, SYNC_TIMEOUT_MS),
      totalTimer: window.setTimeout(() => {
        this.finish(
          id,
          'timeout',
          `Execution stopped after ${TOTAL_TIMEOUT_MS / 1000}s with async work still pending.`,
        );
      }, TOTAL_TIMEOUT_MS),
    };
    this.current = execution;

    worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
      this.handleMessage(id, event.data);
    };
    // Anything the worker could not handle itself (e.g. it failed to load).
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault?.();
      if (!this.isCurrent(id)) return;
      this.emit({ type: 'error', message: event.message || 'Unknown worker error' });
      this.finish(id, 'error');
    };
    worker.onmessageerror = () => {
      if (!this.isCurrent(id)) return;
      this.emit({ type: 'error', message: 'A console value could not be transferred.' });
    };

    // Clearing the console is part of starting a run, so the UI never mixes
    // output from two different executions.
    this.emit({ type: 'start' });

    const message: WorkerInbound = { type: 'run', code };
    worker.postMessage(message);
  }

  dispose(): void {
    this.disposed = true;
    this.teardown();
  }

  private isCurrent(id: number): boolean {
    return this.current !== null && this.current.id === id && !this.current.done;
  }

  private handleMessage(id: number, message: WorkerOutbound): void {
    if (!this.isCurrent(id)) return;

    switch (message.type) {
      case 'console':
        this.emit({ type: 'console', level: message.level, args: message.args });
        break;
      case 'error':
        this.emit({ type: 'error', message: message.message, stack: message.stack });
        break;
      case 'evaluated':
        // The synchronous body returned, so it is not a runaway loop. Pending
        // async work is now governed by the total timeout only.
        if (this.current) {
          window.clearTimeout(this.current.syncTimer);
        }
        break;
      case 'complete':
        this.finish(id, 'finished');
        break;
    }
  }

  private finish(
    id: number,
    reason: 'finished' | 'timeout' | 'error',
    errorMessage?: string,
  ): void {
    if (!this.isCurrent(id)) return;
    const execution = this.current!;
    execution.done = true;

    if (errorMessage) this.emit({ type: 'error', message: errorMessage });

    this.teardown();
    this.emit({ type: 'complete', reason });
  }

  /** Terminate and fully detach the active Worker, if any. */
  private teardown(): void {
    const execution = this.current;
    if (!execution) return;
    this.current = null;

    window.clearTimeout(execution.syncTimer);
    window.clearTimeout(execution.totalTimer);

    execution.worker.onmessage = null;
    execution.worker.onerror = null;
    execution.worker.onmessageerror = null;
    execution.worker.terminate();
  }
}
