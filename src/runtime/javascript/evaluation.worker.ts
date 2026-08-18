/// <reference lib="es2023" />
import { serialize } from '../shared/serialize';
import { AssertionError, createTestApi } from '../shared/testing/testApi';
import type { EvaluationWorkerInbound, EvaluationWorkerOutbound } from './protocol';

/**
 * Runs exactly one test case against one copy of the user's solution.
 *
 * The host builds a fresh Worker per case and terminates it afterwards, so no
 * test can observe or corrupt state left by another, and a hanging test is
 * killed without touching the rest of the suite.
 */

interface WorkerScope {
  postMessage(message: EvaluationWorkerOutbound): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<EvaluationWorkerInbound>) => void,
  ): void;
  console: Record<string, unknown>;
}

const ctx = self as unknown as WorkerScope;

/**
 * Evaluation output is intentionally discarded. Results travel on their own
 * channel, and a noisy solution must not be able to drown them out or spend
 * the playground console's budget.
 */
function silenceConsole(): void {
  const noop = () => {};
  const silent: Record<string, unknown> = {};
  for (const name of ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'table', 'group', 'groupEnd', 'assert', 'clear']) {
    silent[name] = noop;
  }
  ctx.console = silent;
}

type AsyncFunctionConstructor = new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as
  AsyncFunctionConstructor;

function describeFailure(error: unknown): EvaluationWorkerOutbound {
  if (error instanceof AssertionError) {
    return {
      type: 'result',
      status: 'failed',
      message: error.message,
      expected: error.hasComparison ? serialize(error.expected) : undefined,
      actual: error.hasComparison ? serialize(error.actual) : undefined,
    };
  }
  if (error instanceof Error) {
    return { type: 'result', status: 'failed', message: `${error.name}: ${error.message}` };
  }
  return { type: 'result', status: 'failed', message: `Test threw ${String(error)}` };
}

ctx.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'run-test') return;

  silenceConsole();
  const api = createTestApi();

  let run: (...args: unknown[]) => Promise<unknown>;
  try {
    // User source and test source share one lexical scope, so declarations like
    // `function debounce() {}` are directly callable from the test without the
    // exercise needing exports or globals. `await` works at the test's top
    // level because the whole thing is compiled as an async function body.
    //
    // The test body sits in its own block: solutions declare whatever names
    // they like at top level, and a test that happens to reuse one must shadow
    // it rather than collide with it.
    run = new AsyncFunction(
      'assert',
      'sleep',
      'waitFor',
      `${data.userCode}\n;\n{\n${data.testSource}\n}`,
    );
  } catch (error) {
    ctx.postMessage({
      type: 'result',
      status: 'failed',
      message: `Could not run your solution: ${
        error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      }`,
    });
    return;
  }

  const started = Date.now();
  run(api.assert, api.sleep, api.waitFor).then(
    () => {
      ctx.postMessage({ type: 'result', status: 'passed', durationMs: Date.now() - started });
    },
    (error: unknown) => {
      ctx.postMessage({ ...describeFailure(error), durationMs: Date.now() - started });
    },
  );
});
