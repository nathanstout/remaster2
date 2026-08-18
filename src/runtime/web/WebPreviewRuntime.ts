import type {
  EvaluatableRuntime,
  EvaluationEventHandler,
  TestSuite,
} from '../../types/evaluation';
import type { PreviewRuntime, RuntimeEventHandler, RuntimeSource } from '../../types/runtime';
import { IframeEvaluationHost } from '../shared/preview/IframeEvaluationHost';
import { IframePreviewHost } from '../shared/preview/IframePreviewHost';
import { buildWebPreviewDocument } from './previewDocument';

/**
 * Runs HTML/CSS/JS problems inside a disposable, sandboxed iframe.
 *
 * There is no compilation step, so this is little more than document assembly —
 * everything else (run ids, mounting, message routing, watchdog, teardown) is
 * the shared preview host, exactly as for React.
 */
export class WebPreviewRuntime implements PreviewRuntime, EvaluatableRuntime {
  private readonly host: IframePreviewHost;
  private readonly evaluationHost = new IframeEvaluationHost(({ runId, source, testCase }) =>
    Promise.resolve(buildWebPreviewDocument(runId, source, { testSource: testCase.source })),
  );

  constructor(emit: RuntimeEventHandler) {
    this.host = new IframePreviewHost(emit, {
      label: 'Preview',
      buildDocument: ({ runId, source }) =>
        Promise.resolve(buildWebPreviewDocument(runId, source)),
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
