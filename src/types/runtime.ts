/**
 * The contract between the app and any execution runtime.
 *
 * The editor produces source code; a Runtime turns it into RuntimeEvents.
 * Neither side knows how the other works: the editor does not know about
 * Workers, and the runtime does not know which problem is loaded.
 */

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * A structured-clone-safe description of a value.
 *
 * Console arguments are serialized inside the runtime (Worker side) before
 * they cross a postMessage boundary, so the UI only ever receives inert data.
 * This avoids DataCloneError on functions, DOM nodes, cyclic graphs, etc.
 */
export type SerializedValue =
  | { kind: 'string'; value: string }
  | { kind: 'literal'; text: string }
  | { kind: 'function'; label: string }
  | { kind: 'error'; name: string; message: string; stack?: string }
  | { kind: 'array'; items: SerializedValue[]; extra: number }
  | {
      kind: 'object';
      ctor: string | null;
      entries: Array<{ key: string; value: SerializedValue }>;
      extra: number;
    }
  | {
      kind: 'collection';
      ctor: 'Map' | 'Set';
      size: number;
      items: SerializedValue[];
      extra: number;
    }
  | { kind: 'circular' }
  /** A hole in a sparse array, e.g. the middle slot of `[1, , 3]`. */
  | { kind: 'hole' }
  | { kind: 'truncated'; label: string }
  | { kind: 'unserializable'; text: string };

/** Events a runtime emits for a single execution, in occurrence order. */
export type RuntimeEvent =
  | { type: 'start' }
  | { type: 'console'; level: ConsoleLevel; args: SerializedValue[] }
  | { type: 'error'; message: string; stack?: string }
  | { type: 'complete'; reason: 'finished' | 'timeout' | 'error' };

export type RuntimeEventHandler = (event: RuntimeEvent) => void;

/**
 * Every execution model (Worker today; sandboxed iframes for React/web later)
 * implements this. `run` must be safe to call repeatedly — it tears down the
 * previous execution before starting a new one.
 */
export interface Runtime {
  run(source: RuntimeSource): void;
  dispose(): void;
}

/** What gets executed. A map of file id -> contents. */
export interface RuntimeSource {
  files: Record<string, string>;
  entry: string;
}
