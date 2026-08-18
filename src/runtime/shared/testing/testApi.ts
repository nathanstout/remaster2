/**
 * The assertion and timing helpers available to test cases.
 *
 * Deliberately tiny and dependency-free: it is imported directly by the
 * evaluation Worker and compiled to an IIFE for injection into evaluation
 * iframes, so one implementation serves every runtime.
 */

export class AssertionError extends Error {
  readonly expected: unknown;
  readonly actual: unknown;
  /** False for assertions with nothing meaningful to compare, like `ok`. */
  readonly hasComparison: boolean;

  constructor(message: string, comparison?: { expected: unknown; actual: unknown }) {
    super(message);
    this.name = 'AssertionError';
    this.expected = comparison?.expected;
    this.actual = comparison?.actual;
    this.hasComparison = comparison !== undefined;
  }
}

function describe(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'function') return `function ${value.name || '(anonymous)'}`;
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Structural comparison covering the shapes these exercises produce. */
export function deepEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEquals(item, b[index]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key) => Object.prototype.hasOwnProperty.call(right, key) && deepEquals(left[key], right[key]),
  );
}

export interface WaitForOptions {
  timeoutMs?: number;
  intervalMs?: number;
  message?: string;
}

export interface TestApi {
  assert: {
    ok(value: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    includes(container: unknown, value: unknown, message?: string): void;
  };
  sleep(ms: number): Promise<void>;
  waitFor(predicate: () => unknown, options?: WaitForOptions): Promise<void>;
}

export function createTestApi(): TestApi {
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  return {
    assert: {
      ok(value, message) {
        if (!value) {
          throw new AssertionError(message ?? `Expected a truthy value but received ${describe(value)}.`);
        }
      },
      equal(actual, expected, message) {
        if (!Object.is(actual, expected)) {
          throw new AssertionError(
            message ?? `Expected ${describe(expected)} but received ${describe(actual)}.`,
            { expected, actual },
          );
        }
      },
      deepEqual(actual, expected, message) {
        if (!deepEquals(actual, expected)) {
          throw new AssertionError(
            message ?? `Expected ${describe(expected)} but received ${describe(actual)}.`,
            { expected, actual },
          );
        }
      },
      includes(container, value, message) {
        const contained =
          typeof container === 'string'
            ? container.includes(String(value))
            : Array.isArray(container)
              ? container.some((item) => deepEquals(item, value))
              : false;
        if (!contained) {
          throw new AssertionError(
            message ?? `Expected ${describe(container)} to include ${describe(value)}.`,
            { expected: value, actual: container },
          );
        }
      },
    },

    sleep,

    async waitFor(predicate, options = {}) {
      const timeoutMs = options.timeoutMs ?? 1_000;
      const intervalMs = options.intervalMs ?? 20;
      const deadline = Date.now() + timeoutMs;

      for (;;) {
        let satisfied: unknown = false;
        let failure: unknown;
        try {
          satisfied = await predicate();
        } catch (error) {
          failure = error;
        }
        if (satisfied) return;

        if (Date.now() >= deadline) {
          const detail = failure instanceof Error ? ` Last error: ${failure.message}` : '';
          throw new AssertionError(
            `${options.message ?? 'Condition was not met'} within ${timeoutMs}ms.${detail}`,
          );
        }
        await sleep(intervalMs);
      }
    },
  };
}
