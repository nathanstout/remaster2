import type {
  PreviewRuntime,
  RuntimeEventHandler,
  RuntimeSource,
} from '../../types/runtime';
import { compileModule, CompileError, getSerializerBundle } from './compiler';
import { buildPreviewDocument } from './previewDocument';
import { isPreviewMessage } from './protocol';

/**
 * How long bootstrapping may take before we assume the preview is wedged.
 *
 * See the note on infinite loops in the class docs: this catches a preview that
 * fails to start, not one that is burning the CPU synchronously.
 */
const BOOTSTRAP_TIMEOUT_MS = 8_000;

interface Execution {
  id: number;
  iframe: HTMLIFrameElement | null;
  timer: number;
  /** Bootstrapping reported complete (or failed); the preview stays alive. */
  settled: boolean;
}

/**
 * Runs React problems inside a disposable, sandboxed iframe.
 *
 * Lifecycle mirrors the Worker runtime: every `run()` destroys the previous
 * execution before starting a new one, so React state, globals, timers, DOM and
 * listeners cannot survive an edit. Unlike the Worker runtime, though, a
 * finished run stays alive — the whole point is that the user can click the
 * rendered output — so completion only closes the *bootstrap* phase, and
 * console/error events keep flowing from the active run afterwards.
 *
 * Isolation caveat: `sandbox="allow-scripts"` gives the frame an opaque origin
 * and no access to this document, but it does not guarantee a separate CPU
 * thread. Synchronous runaway code inside the preview can still block the host.
 */
export class ReactPreviewRuntime implements PreviewRuntime {
  private readonly emit: RuntimeEventHandler;
  private container: HTMLElement | null = null;
  private current: Execution | null = null;
  private nextId = 1;
  private disposed = false;

  constructor(emit: RuntimeEventHandler) {
    this.emit = emit;
    window.addEventListener('message', this.handleMessage);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    const iframe = this.current?.iframe;
    if (iframe && iframe.parentNode !== container) container.appendChild(iframe);
  }

  unmount(): void {
    this.current?.iframe?.remove();
    this.container = null;
  }

  run(source: RuntimeSource): void {
    if (this.disposed) return;

    // Tear down first: a stale preview must never stay on screen while the
    // newest source is still compiling — or failing to compile.
    this.teardown();

    const execution: Execution = { id: this.nextId++, iframe: null, timer: 0, settled: false };
    this.current = execution;

    this.emit({ type: 'start' });
    void this.startRun(execution, source);
  }

  dispose(): void {
    this.disposed = true;
    this.teardown();
    this.container = null;
    window.removeEventListener('message', this.handleMessage);
  }

  private async startRun(execution: Execution, source: RuntimeSource): Promise<void> {
    try {
      const entry = source.entry;
      const code = source.files[entry] ?? '';

      // Compilation and the (memoized) serializer build are both async, so an
      // older run can still be in flight here. Everything past an await must
      // re-check that this run is still the current one.
      const [serializerSource, compiled] = await Promise.all([
        getSerializerBundle(),
        compileModule(code, entry),
      ]);
      if (!this.isActive(execution.id)) return;

      const { reactRuntimeSources } = await import('./reactRuntimeSources');
      if (!this.isActive(execution.id)) return;

      const html = buildPreviewDocument({
        runId: execution.id,
        serializerSource,
        moduleSources: reactRuntimeSources,
        userCode: compiled.code,
      });

      const iframe = document.createElement('iframe');
      iframe.className = 'preview-frame';
      iframe.title = 'Preview';
      // Scripts, and nothing else. No allow-same-origin: the frame gets an
      // opaque origin and cannot reach this document, its storage or its DOM.
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.srcdoc = html;

      execution.iframe = iframe;
      this.container?.appendChild(iframe);

      execution.timer = window.setTimeout(() => {
        this.settle(execution.id, 'timeout', 'Preview timed out while starting up.');
      }, BOOTSTRAP_TIMEOUT_MS);
    } catch (error) {
      if (!this.isActive(execution.id)) return;
      this.emit({
        type: 'error',
        message:
          error instanceof CompileError
            ? error.message
            : `Failed to start preview: ${error instanceof Error ? error.message : String(error)}`,
      });
      this.settle(execution.id, 'error');
    }
  }

  /** True while this run owns the preview — regardless of bootstrap state. */
  private isActive(id: number): boolean {
    return !this.disposed && this.current !== null && this.current.id === id;
  }

  private readonly handleMessage = (event: MessageEvent): void => {
    const execution = this.current;
    if (!execution || this.disposed) return;
    // The frame's origin is opaque ("null"), so identity comes from the window
    // itself, plus the channel tag and run id.
    if (!execution.iframe || event.source !== execution.iframe.contentWindow) return;
    if (!isPreviewMessage(event.data) || event.data.runId !== execution.id) return;

    const message = event.data;
    switch (message.type) {
      case 'console':
        this.emit({ type: 'console', level: message.level, args: message.args });
        break;
      case 'error':
        this.emit({ type: 'error', message: message.message, stack: message.stack });
        break;
      case 'ready':
        this.settle(execution.id, 'finished');
        break;
    }
  };

  /**
   * Ends the bootstrap phase. The iframe deliberately keeps running so the
   * preview stays interactive; only a timeout tears it down.
   */
  private settle(id: number, reason: 'finished' | 'timeout' | 'error', errorMessage?: string): void {
    if (!this.isActive(id)) return;
    const execution = this.current!;
    if (execution.settled) return;
    execution.settled = true;

    window.clearTimeout(execution.timer);
    if (errorMessage) this.emit({ type: 'error', message: errorMessage });
    if (reason === 'timeout') this.teardown();

    this.emit({ type: 'complete', reason });
  }

  /** Destroys the active preview: removing the frame kills its scripts. */
  private teardown(): void {
    const execution = this.current;
    if (!execution) return;
    this.current = null;

    window.clearTimeout(execution.timer);
    execution.iframe?.remove();
    execution.iframe = null;
  }
}
