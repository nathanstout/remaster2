import type { Problem } from '../types/problem';
import type { Runtime, RuntimeEventHandler } from '../types/runtime';
import { JavaScriptWorkerRuntime } from './javascript/JavaScriptWorkerRuntime';

/**
 * Picks the execution model for a problem type.
 *
 * Adding React or HTML/CSS/JS support means adding a case here plus a class
 * that implements `Runtime` (backed by a sandboxed iframe). Nothing in the
 * editor, console or problem layer has to change.
 */
export function createRuntime(problem: Problem, emit: RuntimeEventHandler): Runtime {
  switch (problem.type) {
    case 'javascript':
      return new JavaScriptWorkerRuntime(emit);
    case 'react':
    case 'web':
      return new UnsupportedRuntime(problem.type, emit);
  }
}

/** Placeholder so an unimplemented type degrades to a console message. */
class UnsupportedRuntime implements Runtime {
  private readonly type: string;
  private readonly emit: RuntimeEventHandler;

  constructor(type: string, emit: RuntimeEventHandler) {
    this.type = type;
    this.emit = emit;
  }

  run(): void {
    this.emit({ type: 'start' });
    this.emit({ type: 'error', message: `No runtime is registered for "${this.type}" problems yet.` });
    this.emit({ type: 'complete', reason: 'error' });
  }

  dispose(): void {}
}
