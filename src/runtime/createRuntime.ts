import type { Problem, ProblemType } from '../types/problem';
import type { Runtime, RuntimeEventHandler } from '../types/runtime';
import { JavaScriptWorkerRuntime } from './javascript/JavaScriptWorkerRuntime';
import { ReactPreviewRuntime } from './react/ReactPreviewRuntime';
import { WebPreviewRuntime } from './web/WebPreviewRuntime';

/** Problem types whose runtime renders something the user can look at. */
const PREVIEW_TYPES = new Set<ProblemType>(['react', 'web']);

/**
 * Whether a problem's runtime will want a preview surface.
 *
 * The workspace has to lay out its panes during the first render, before the
 * runtime instance exists, so capability is answered from the problem here in
 * the runtime layer rather than by inspecting an instance in the UI layer.
 */
export function supportsPreview(problem: Problem): boolean {
  return PREVIEW_TYPES.has(problem.type);
}

/**
 * Picks the execution model for a problem type.
 *
 * Adding HTML/CSS/JS support means adding a case here plus a class implementing
 * `Runtime` (and `PreviewRuntime` if it renders). Nothing in the editor,
 * console or problem layer has to change.
 */
export function createRuntime(problem: Problem, emit: RuntimeEventHandler): Runtime {
  switch (problem.type) {
    case 'javascript':
      return new JavaScriptWorkerRuntime(emit);
    case 'react':
      return new ReactPreviewRuntime(emit);
    case 'web':
      return new WebPreviewRuntime(emit);
  }
}
