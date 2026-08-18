import {
  DEFAULT_TEST_TIMEOUT_MS,
  type EvaluationEventHandler,
  type TestCase,
  type TestResult,
  type TestSuite,
} from '../../types/evaluation';
import type { RuntimeSource } from '../../types/runtime';
import type { EvaluationWorkerInbound, EvaluationWorkerOutbound } from './protocol';

/**
 * Runs a suite against a JavaScript solution, one disposable Worker per test.
 *
 * Separate from the playground Worker in `JavaScriptWorkerRuntime`: evaluation
 * never disturbs what the user is looking at, and the playground's own
 * execution lifecycle is untouched by a test run.
 */
export class JavaScriptEvaluator {
  private generation = 0;
  private activeWorker: Worker | null = null;

  evaluate(source: RuntimeSource, suite: TestSuite, emit: EvaluationEventHandler): void {
    this.cancel();
    const generation = this.generation;
    void this.runSuite(generation, source, suite, emit);
  }

  cancel(): void {
    this.generation += 1;
    this.terminateActive();
  }

  private terminateActive(): void {
    if (!this.activeWorker) return;
    this.activeWorker.onmessage = null;
    this.activeWorker.onerror = null;
    this.activeWorker.terminate();
    this.activeWorker = null;
  }

  private isCurrent(generation: number): boolean {
    return this.generation === generation;
  }

  private async runSuite(
    generation: number,
    source: RuntimeSource,
    suite: TestSuite,
    emit: EvaluationEventHandler,
  ): Promise<void> {
    const userCode = source.files[source.entry] ?? '';
    emit({ type: 'evaluation-start', total: suite.cases.length });

    let passed = 0;
    let failed = 0;

    for (const testCase of suite.cases) {
      if (!this.isCurrent(generation)) return;

      const result = await this.runCase(generation, userCode, testCase);
      if (!this.isCurrent(generation)) return;

      if (result.status === 'passed') passed += 1;
      else failed += 1;
      emit({ type: 'test-result', result });
    }

    if (!this.isCurrent(generation)) return;
    emit({ type: 'evaluation-complete', passed, failed, total: suite.cases.length });
  }

  private runCase(generation: number, userCode: string, testCase: TestCase): Promise<TestResult> {
    return new Promise<TestResult>((resolve) => {
      const worker = new Worker(new URL('./evaluation.worker.ts', import.meta.url), {
        type: 'module',
        name: `js-evaluation-${testCase.id}`,
      });
      this.activeWorker = worker;

      let settled = false;
      const finish = (result: TestResult): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (this.activeWorker === worker) this.terminateActive();
        resolve(result);
      };

      const timer = window.setTimeout(() => {
        finish({
          id: testCase.id,
          name: testCase.name,
          status: 'timed-out',
          message: `Test did not finish within ${testCase.timeoutMs ?? DEFAULT_TEST_TIMEOUT_MS}ms.`,
        });
      }, testCase.timeoutMs ?? DEFAULT_TEST_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<EvaluationWorkerOutbound>) => {
        const message = event.data;
        if (!message || message.type !== 'result') return;
        finish({
          id: testCase.id,
          name: testCase.name,
          status: message.status,
          message: message.message,
          expected: message.expected,
          actual: message.actual,
          durationMs: message.durationMs,
        });
      };

      worker.onerror = (event: ErrorEvent) => {
        event.preventDefault?.();
        finish({
          id: testCase.id,
          name: testCase.name,
          status: 'failed',
          message: event.message || 'The evaluation environment failed to start.',
        });
      };

      const message: EvaluationWorkerInbound = {
        type: 'run-test',
        userCode,
        testSource: testCase.source,
      };
      worker.postMessage(message);

      // A generation bump during setup (edit, switch, re-run) must not leave
      // this Worker running.
      if (!this.isCurrent(generation)) this.terminateActive();
    });
  }
}
