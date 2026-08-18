import type {
  EvaluatableRuntime,
  EvaluationEventHandler,
  TestSuite,
} from '../../types/evaluation';
import type { PreviewRuntime, RuntimeEventHandler, RuntimeSource } from '../../types/runtime';
import { IframeEvaluationHost } from '../shared/preview/IframeEvaluationHost';
import { IframePreviewHost } from '../shared/preview/IframePreviewHost';
import { compileModule } from './compiler';
import { buildReactEvaluationDocument, buildReactPreviewDocument } from './previewDocument';

/**
 * Runs React problems inside a disposable, sandboxed iframe.
 *
 * All of the iframe lifecycle — run ids, mounting, message routing, the
 * bootstrap watchdog, teardown — lives in `IframePreviewHost`. What is React's
 * own is only this: compiling TSX and assembling a document that can boot it.
 */
export class ReactPreviewRuntime implements PreviewRuntime, EvaluatableRuntime {
  private readonly host: IframePreviewHost;
  private readonly evaluationHost: IframeEvaluationHost;

  constructor(emit: RuntimeEventHandler) {
    // Tests get their own hidden frames, built from the same pieces as the
    // visible preview, so evaluating never disturbs what the user is looking at.
    this.evaluationHost = new IframeEvaluationHost(async ({ runId, source, testCase, isActive }) => {
      const compiled = await compileModule(source.files[source.entry] ?? '', source.entry);
      if (!isActive()) return '';
      const { reactRuntimeSources } = await import('./reactRuntimeSources');
      if (!isActive()) return '';

      return buildReactEvaluationDocument({
        runId,
        moduleSources: reactRuntimeSources,
        userCode: compiled.code,
        testSource: testCase.source,
      });
    });

    this.host = new IframePreviewHost(emit, {
      label: 'React preview',
      buildDocument: async ({ runId, source, isActive }) => {
        const entry = source.entry;
        const compiled = await compileModule(source.files[entry] ?? '', entry);
        if (!isActive()) return '';

        // Loaded lazily so ~1.1MB of React source stays out of the main bundle
        // for anyone who never opens a React problem.
        const { reactRuntimeSources } = await import('./reactRuntimeSources');
        if (!isActive()) return '';

        return buildReactPreviewDocument({
          runId,
          moduleSources: reactRuntimeSources,
          userCode: compiled.code,
        });
      },
    });
  }

  run(source: RuntimeSource): void {
    this.host.run(source);
  }

  mount(container: HTMLElement): void {
    this.host.mount(container);
  }

  unmount(): void {
    this.host.unmount();
  }

  evaluate(source: RuntimeSource, suite: TestSuite, emit: EvaluationEventHandler): void {
    this.evaluationHost.evaluate(source, suite, emit);
  }

  cancelEvaluation(): void {
    this.evaluationHost.cancel();
  }

  dispose(): void {
    this.evaluationHost.cancel();
    this.host.dispose();
  }
}
