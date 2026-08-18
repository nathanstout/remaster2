import type { PreviewRuntime, RuntimeEventHandler, RuntimeSource } from '../../types/runtime';
import { IframePreviewHost } from '../shared/preview/IframePreviewHost';
import { compileModule } from './compiler';
import { buildReactPreviewDocument } from './previewDocument';

/**
 * Runs React problems inside a disposable, sandboxed iframe.
 *
 * All of the iframe lifecycle — run ids, mounting, message routing, the
 * bootstrap watchdog, teardown — lives in `IframePreviewHost`. What is React's
 * own is only this: compiling TSX and assembling a document that can boot it.
 */
export class ReactPreviewRuntime implements PreviewRuntime {
  private readonly host: IframePreviewHost;

  constructor(emit: RuntimeEventHandler) {
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

  dispose(): void {
    this.host.dispose();
  }
}
