import type {
  PreviewRuntime,
  RuntimeEventHandler,
  RuntimeSource,
} from '../../../types/runtime';
import { isPreviewMessage } from './protocol';

/**
 * How long bootstrapping may take before we assume the preview is wedged.
 *
 * See the isolation note below: this catches a preview that fails to start, and
 * cleans up after one that never will. It is not a hard kill switch.
 */
const BOOTSTRAP_TIMEOUT_MS = 8_000;

/** Produces the complete document text for one run. */
export type PreviewDocumentBuilder = (context: {
  runId: number;
  source: RuntimeSource;
  /** False once a newer run has taken over; check after every await. */
  isActive: () => boolean;
}) => Promise<string>;

export interface IframePreviewHostOptions {
  buildDocument: PreviewDocumentBuilder;
  /** Prefixes failures that happen before the frame exists. */
  label: string;
}

interface Execution {
  id: number;
  iframe: HTMLIFrameElement | null;
  timer: number;
  /** Bootstrapping reported complete (or failed); the preview stays alive. */
  settled: boolean;
}

/**
 * Host-side lifecycle for any preview backed by a disposable sandboxed iframe.
 *
 * Every `run()` destroys the previous execution before starting a new one, so
 * DOM, globals, timers, listeners and framework state cannot survive an edit.
 * Unlike the Worker runtime, a finished run stays alive — the point of a
 * preview is that the user can interact with it — so completion closes only the
 * *bootstrap* phase, and console/error events keep flowing from the active run.
 *
 * Isolation caveat: `sandbox="allow-scripts"` gives the frame an opaque origin
 * and no access to this document, but it does not guarantee a separate CPU
 * thread. Synchronous runaway code inside a preview may still block the host on
 * browsers that do not isolate such frames into their own process.
 *
 * Runtimes compose this rather than extending it: what differs between React
 * and plain web previews is only how the document is built.
 */
export class IframePreviewHost implements PreviewRuntime {
  private readonly emit: RuntimeEventHandler;
  private readonly options: IframePreviewHostOptions;
  private container: HTMLElement | null = null;
  private current: Execution | null = null;
  private nextId = 1;
  private disposed = false;

  constructor(emit: RuntimeEventHandler, options: IframePreviewHostOptions) {
    this.emit = emit;
    this.options = options;
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
    // newest source is still being built — or failing to build.
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
    const isActive = () => this.isActive(execution.id);

    try {
      const html = await this.options.buildDocument({ runId: execution.id, source, isActive });
      // Building can be asynchronous, so an older run may still be in flight.
      if (!isActive()) return;

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
        this.settle(execution.id, 'timeout', `${this.options.label} timed out while starting up.`);
      }, BOOTSTRAP_TIMEOUT_MS);
    } catch (error) {
      if (!isActive()) return;
      this.emit({ type: 'error', message: describeBuildFailure(error, this.options.label) });
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

/** Build failures should read as the problem they are, not as internal noise. */
export interface PreviewBuildError extends Error {
  /** Set when the message is already user-facing (e.g. a compiler diagnostic). */
  isUserFacing?: boolean;
}

function describeBuildFailure(error: unknown, label: string): string {
  const candidate = error as PreviewBuildError | undefined;
  if (candidate?.isUserFacing) return candidate.message;
  return `Failed to start ${label.toLowerCase()}: ${
    error instanceof Error ? error.message : String(error)
  }`;
}
