/// <reference lib="es2023" />
import { serialize } from './serialize';
import type { WorkerInbound, WorkerOutbound } from './protocol';
import type { ConsoleLevel } from '../../types/runtime';

/**
 * Disposable execution sandbox for JavaScript problems.
 *
 * This file is the *only* place user code is ever evaluated. It runs on its own
 * thread with its own globals, so a runaway loop blocks nothing on the main
 * thread and the host can terminate it at any moment. The worker is never
 * reused: the host builds a fresh one per execution.
 */

interface WorkerScope {
  postMessage(message: WorkerOutbound): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerInbound>) => void): void;
  addEventListener(type: 'unhandledrejection', listener: (event: PromiseRejectionEvent) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  setTimeout(handler: () => void, timeout?: number): number;
  clearTimeout(id?: number): void;
  setInterval(handler: () => void, timeout?: number): number;
  clearInterval(id?: number): void;
  console: Record<string, unknown>;
}

const ctx = self as unknown as WorkerScope;

const nativeSetTimeout = ctx.setTimeout.bind(ctx);
const nativeClearTimeout = ctx.clearTimeout.bind(ctx);
const nativeSetInterval = ctx.setInterval.bind(ctx);
const nativeClearInterval = ctx.clearInterval.bind(ctx);

function post(message: WorkerOutbound): void {
  try {
    ctx.postMessage(message);
  } catch {
    // Serialization is supposed to guarantee this never happens; if it somehow
    // does, drop the message rather than killing the execution.
  }
}

/**
 * User code is compiled with `new Function`, so V8 reports its frames as
 * `<anonymous>:LINE:COL` where LINE is offset by the two lines of generated
 * wrapper. Everything else in the trace is this file's own plumbing, which is
 * meaningless to the person writing the answer — drop it.
 */
const USER_FRAME = /<anonymous>:(\d+):(\d+)/;

function formatStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;

  const frames = stack
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '));

  const userFrames: string[] = [];
  for (const frame of frames) {
    const match = USER_FRAME.exec(frame);
    if (!match) continue;
    const line = Number(match[1]) - WRAPPER_LINE_OFFSET;
    if (line < 1) continue;
    const name = frame.slice(3).split(' (')[0];
    const where = name && !name.startsWith('<anonymous>') && !name.startsWith('eval')
      ? `${name} (line ${line}:${match[2]})`
      : `line ${line}:${match[2]}`;
    userFrames.push(`    at ${where}`);
  }

  return userFrames.length > 0 ? userFrames.join('\n') : undefined;
}

/** `new Function(body)` emits `function anonymous(\n) {\n` before the body. */
const WRAPPER_LINE_OFFSET = 2;

function toErrorMessage(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) {
    return {
      message: `${value.name}: ${value.message}`,
      stack: formatStack(typeof value.stack === 'string' ? value.stack : undefined),
    };
  }
  try {
    return { message: `Uncaught ${String(value)}` };
  } catch {
    return { message: 'Uncaught (unprintable value)' };
  }
}

function reportError(value: unknown): void {
  post({ type: 'error', ...toErrorMessage(value) });
}

/* ------------------------------------------------------------------ console */

const CONSOLE_LEVELS: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

function installConsole(): void {
  const intercepted: Record<string, unknown> = {};

  for (const level of CONSOLE_LEVELS) {
    intercepted[level] = (...args: unknown[]) => {
      post({ type: 'console', level, args: args.map((arg) => serialize(arg)) });
    };
  }
  // Frequently-used no-op-ish extras so calling them never throws.
  intercepted.trace = intercepted.log;
  intercepted.dir = intercepted.log;
  intercepted.table = intercepted.log;
  intercepted.group = intercepted.log;
  intercepted.groupEnd = () => {};
  intercepted.clear = () => {};
  intercepted.assert = (condition: unknown, ...args: unknown[]) => {
    if (!condition) {
      post({
        type: 'console',
        level: 'error',
        args: [{ kind: 'string', value: 'Assertion failed:' }, ...args.map((a) => serialize(a))],
      });
    }
  };

  ctx.console = intercepted;
}

/* ------------------------------------------------- async task bookkeeping */

/**
 * User code is frequently asynchronous (the debounce problem is, by nature).
 * We keep the worker alive while tracked timers are outstanding and report
 * `complete` once everything has settled, so the host knows the run is over
 * without having to guess.
 */
let pendingTasks = 0;
let settleCheck: number | undefined;
let finished = false;

function scheduleSettleCheck(): void {
  if (finished || settleCheck !== undefined) return;
  // A macrotask hop guarantees the microtask queue has drained first.
  settleCheck = nativeSetTimeout(() => {
    // A second hop before declaring completion: an unhandled rejection is
    // reported in a task queued at the end of the one that rejected, so
    // completing on the first hop lets the host terminate this worker before
    // that notification is ever delivered. Message order does the rest — any
    // error posted during this window reaches the host ahead of `complete`.
    settleCheck = nativeSetTimeout(() => {
      settleCheck = undefined;
      if (!finished && pendingTasks === 0) {
        finished = true;
        post({ type: 'complete' });
      }
    }, 0);
  }, 0);
}

function guard(callback: () => void): void {
  try {
    callback();
  } catch (error) {
    reportError(error);
  }
}

function installTimers(): void {
  const liveTimeouts = new Set<number>();
  const liveIntervals = new Set<number>();

  const patched = ctx as unknown as Record<string, unknown>;

  patched.setTimeout = (handler: unknown, delay?: number, ...args: unknown[]): number => {
    if (typeof handler !== 'function') return 0;
    pendingTasks += 1;
    const id = nativeSetTimeout(() => {
      liveTimeouts.delete(id);
      pendingTasks -= 1;
      guard(() => (handler as (...a: unknown[]) => void)(...args));
      scheduleSettleCheck();
    }, delay);
    liveTimeouts.add(id);
    return id;
  };

  patched.clearTimeout = (id?: number): void => {
    if (id !== undefined && liveTimeouts.delete(id)) pendingTasks -= 1;
    nativeClearTimeout(id);
    scheduleSettleCheck();
  };

  patched.setInterval = (handler: unknown, delay?: number, ...args: unknown[]): number => {
    if (typeof handler !== 'function') return 0;
    pendingTasks += 1;
    const id = nativeSetInterval(() => {
      guard(() => (handler as (...a: unknown[]) => void)(...args));
    }, delay);
    liveIntervals.add(id);
    return id;
  };

  patched.clearInterval = (id?: number): void => {
    if (id !== undefined && liveIntervals.delete(id)) pendingTasks -= 1;
    nativeClearInterval(id);
    scheduleSettleCheck();
  };
}

/* ------------------------------------------------------------ error traps */

ctx.addEventListener('error', (event: ErrorEvent) => {
  event.preventDefault?.();
  reportError(event.error ?? event.message);
});

ctx.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  event.preventDefault?.();
  reportError(event.reason);
});

/* ------------------------------------------------------------- execution */

installConsole();
installTimers();

ctx.addEventListener('message', (event: MessageEvent<WorkerInbound>) => {
  const data = event.data;
  if (!data || data.type !== 'run') return;

  let compiled: () => void;
  try {
    // Evaluated inside the worker only — never in the application's window.
    compiled = new Function(data.code) as () => void;
  } catch (error) {
    // Almost always a SyntaxError from half-typed code.
    reportError(error);
    finished = true;
    post({ type: 'evaluated' });
    post({ type: 'complete' });
    return;
  }

  try {
    compiled();
  } catch (error) {
    reportError(error);
  }

  post({ type: 'evaluated' });
  scheduleSettleCheck();
});
