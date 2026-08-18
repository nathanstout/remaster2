import {
  DEFAULT_TEST_TIMEOUT_MS,
  type EvaluationEventHandler,
  type TestCase,
  type TestResult,
  type TestSuite,
} from '../../../types/evaluation';
import type { RuntimeSource } from '../../../types/runtime';
import { isPreviewMessage } from './protocol';

/**
 * Extra time an evaluation frame gets on top of its test budget, to cover
 * parsing its runtime and reaching first render. React's development build is
 * over a megabyte, so this is not negligible.
 */
const BOOTSTRAP_ALLOWANCE_MS = 3_000;

/** Builds the evaluation document for one test case. */
export type EvaluationDocumentBuilder = (context: {
  runId: number;
  source: RuntimeSource;
  testCase: TestCase;
  isActive: () => boolean;
}) => Promise<string>;

/**
 * Runs a suite in hidden, disposable iframes — one per test case.
 *
 * Deliberately separate from the visible preview: evaluation never mounts into
 * the workspace's container, so running tests cannot reset a preview, alter
 * React state, or type into what the user is looking at.
 */
export class IframeEvaluationHost {
  private readonly buildDocument: EvaluationDocumentBuilder;
  private generation = 0;
  private container: HTMLElement | null = null;
  private activeFrame: HTMLIFrameElement | null = null;
  private listener: ((event: MessageEvent) => void) | null = null;

  constructor(buildDocument: EvaluationDocumentBuilder) {
    this.buildDocument = buildDocument;
  }

  evaluate(source: RuntimeSource, suite: TestSuite, emit: EvaluationEventHandler): void {
    this.cancel();
    void this.runSuite(this.generation, source, suite, emit);
  }

  cancel(): void {
    this.generation += 1;
    this.teardownFrame();
    this.releaseContainer();
  }

  private isCurrent(generation: number): boolean {
    return this.generation === generation;
  }

  /**
   * Off-screen rather than `display: none`: hidden frames still need real
   * layout so tests can measure elements and dispatch clicks.
   */
  private ensureContainer(): HTMLElement {
    if (!this.container) {
      const container = document.createElement('div');
      container.setAttribute('data-evaluation', '');
      container.style.cssText =
        'position:fixed;left:-10000px;top:0;width:800px;height:600px;pointer-events:none;';
      document.body.appendChild(container);
      this.container = container;
    }
    return this.container;
  }

  private releaseContainer(): void {
    this.container?.remove();
    this.container = null;
  }

  private teardownFrame(): void {
    if (this.listener) {
      window.removeEventListener('message', this.listener);
      this.listener = null;
    }
    this.activeFrame?.remove();
    this.activeFrame = null;
  }

  private async runSuite(
    generation: number,
    source: RuntimeSource,
    suite: TestSuite,
    emit: EvaluationEventHandler,
  ): Promise<void> {
    emit({ type: 'evaluation-start', total: suite.cases.length });

    let passed = 0;
    let failed = 0;

    for (const testCase of suite.cases) {
      if (!this.isCurrent(generation)) return;

      const result = await this.runCase(generation, source, testCase);
      if (!this.isCurrent(generation)) return;

      if (result.status === 'passed') passed += 1;
      else failed += 1;
      emit({ type: 'test-result', result });
    }

    this.releaseContainer();
    if (!this.isCurrent(generation)) return;
    emit({ type: 'evaluation-complete', passed, failed, total: suite.cases.length });
  }

  private async runCase(
    generation: number,
    source: RuntimeSource,
    testCase: TestCase,
  ): Promise<TestResult> {
    const runId = this.generation * 1000 + Math.floor(Math.random() * 997);
    const base: Pick<TestResult, 'id' | 'name'> = { id: testCase.id, name: testCase.name };

    let html: string;
    try {
      html = await this.buildDocument({
        runId,
        source,
        testCase,
        isActive: () => this.isCurrent(generation),
      });
    } catch (error) {
      return {
        ...base,
        status: 'failed',
        message: `Could not build your solution: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
    if (!this.isCurrent(generation)) return { ...base, status: 'failed' };

    return new Promise<TestResult>((resolve) => {
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.style.cssText = 'width:800px;height:600px;border:0;';
      frame.srcdoc = html;

      const started = Date.now();
      /** Errors reported by the frame explain failures far better than a bare assertion. */
      let firstError: string | undefined;
      let settled = false;

      const finish = (result: TestResult): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        if (this.listener === onMessage) this.listener = null;
        frame.remove();
        if (this.activeFrame === frame) this.activeFrame = null;
        resolve(result);
      };

      const onMessage = (event: MessageEvent): void => {
        if (event.source !== frame.contentWindow) return;
        if (!isPreviewMessage(event.data) || event.data.runId !== runId) return;
        const message = event.data;

        if (message.type === 'error') {
          firstError ??= message.message;
          return;
        }
        if (message.type !== 'test') return;

        finish({
          ...base,
          status: message.status,
          message:
            message.status === 'failed' && firstError && !message.expected
              ? `${message.message ?? 'Test failed.'}\nYour solution reported: ${firstError}`
              : message.message,
          expected: message.expected,
          actual: message.actual,
          durationMs: message.durationMs ?? Date.now() - started,
        });
      };

      const timer = window.setTimeout(
        () => {
          finish({
            ...base,
            status: 'timed-out',
            message: firstError
              ? `Test did not finish in time. Your solution reported: ${firstError}`
              : 'Test did not finish in time.',
          });
        },
        (testCase.timeoutMs ?? DEFAULT_TEST_TIMEOUT_MS) + BOOTSTRAP_ALLOWANCE_MS,
      );

      this.listener = onMessage;
      this.activeFrame = frame;
      window.addEventListener('message', onMessage);
      this.ensureContainer().appendChild(frame);
    });
  }
}
