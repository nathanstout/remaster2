import type { PreviewRuntime, RuntimeEventHandler, RuntimeSource } from '../../types/runtime';
import { IframePreviewHost } from '../shared/preview/IframePreviewHost';
import { buildWebPreviewDocument } from './previewDocument';

/**
 * Runs HTML/CSS/JS problems inside a disposable, sandboxed iframe.
 *
 * There is no compilation step, so this is little more than document assembly —
 * everything else (run ids, mounting, message routing, watchdog, teardown) is
 * the shared preview host, exactly as for React.
 */
export class WebPreviewRuntime implements PreviewRuntime {
  private readonly host: IframePreviewHost;

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

  dispose(): void {
    this.host.dispose();
  }
}
