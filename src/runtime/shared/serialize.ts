import type { SerializedValue } from '../../types/runtime';

const MAX_DEPTH = 4;
const MAX_ENTRIES = 100;
const MAX_STRING = 10_000;

function clampString(value: string): string {
  return value.length > MAX_STRING
    ? `${value.slice(0, MAX_STRING)}… (${value.length - MAX_STRING} more chars)`
    : value;
}

function constructorName(value: object): string | null {
  try {
    const proto = Object.getPrototypeOf(value) as { constructor?: { name?: string } } | null;
    if (proto === null) return 'Object(null prototype)';
    const name = proto.constructor?.name;
    return !name || name === 'Object' ? null : name;
  } catch {
    return null;
  }
}

/**
 * Convert an arbitrary value into a plain, structured-clone-safe tree.
 *
 * Runs inside the Worker so that no user value ever has to survive
 * postMessage on its own. Cycles, getters that throw, exotic hosts objects and
 * enormous structures are all handled by degrading the output rather than
 * throwing — a broken console must never break the user's execution.
 */
export function serialize(value: unknown, depth = 0, seen = new WeakSet<object>()): SerializedValue {
  try {
    return serializeValue(value, depth, seen);
  } catch (error) {
    return { kind: 'unserializable', text: `[unserializable: ${describeThrown(error)}]` };
  }
}

function describeThrown(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error);
  } catch {
    return 'unknown error';
  }
}

function serializeValue(value: unknown, depth: number, seen: WeakSet<object>): SerializedValue {
  if (value === null) return { kind: 'literal', text: 'null' };

  switch (typeof value) {
    case 'undefined':
      return { kind: 'literal', text: 'undefined' };
    case 'string':
      return { kind: 'string', value: clampString(value) };
    case 'number':
      return { kind: 'literal', text: Object.is(value, -0) ? '-0' : String(value) };
    case 'boolean':
      return { kind: 'literal', text: String(value) };
    case 'bigint':
      return { kind: 'literal', text: `${value}n` };
    case 'symbol':
      return { kind: 'literal', text: value.toString() };
    case 'function': {
      const fn = value as (...args: unknown[]) => unknown;
      const name = fn.name || '(anonymous)';
      const isClass = /^class[\s{]/.test(Function.prototype.toString.call(fn));
      return { kind: 'function', label: isClass ? `class ${name}` : `ƒ ${name}()` };
    }
  }

  const object = value as object;

  if (seen.has(object)) return { kind: 'circular' };

  if (object instanceof Error) {
    return {
      kind: 'error',
      name: object.name || 'Error',
      message: object.message,
      stack: typeof object.stack === 'string' ? clampString(object.stack) : undefined,
    };
  }

  if (object instanceof Date) {
    const time = object.getTime();
    return { kind: 'literal', text: Number.isNaN(time) ? 'Invalid Date' : object.toISOString() };
  }

  if (object instanceof RegExp) return { kind: 'literal', text: String(object) };

  if (depth >= MAX_DEPTH) {
    return { kind: 'truncated', label: Array.isArray(object) ? '[Array]' : '[Object]' };
  }

  seen.add(object);
  try {
    if (Array.isArray(object)) {
      const shown = Math.min(object.length, MAX_ENTRIES);
      const items: SerializedValue[] = [];
      for (let index = 0; index < shown; index += 1) {
        // Sparse arrays: a missing index is a hole, not `undefined`.
        items.push(index in object ? serialize(object[index], depth + 1, seen) : { kind: 'hole' });
      }
      return { kind: 'array', items, extra: Math.max(0, object.length - shown) };
    }

    if (object instanceof Set) {
      const items: SerializedValue[] = [];
      for (const item of object) {
        if (items.length >= MAX_ENTRIES) break;
        items.push(serialize(item, depth + 1, seen));
      }
      return {
        kind: 'collection',
        ctor: 'Set',
        size: object.size,
        items,
        extra: Math.max(0, object.size - items.length),
      };
    }

    if (object instanceof Map) {
      const items: SerializedValue[] = [];
      for (const [key, val] of object) {
        if (items.length >= MAX_ENTRIES) break;
        items.push({
          kind: 'array',
          items: [serialize(key, depth + 1, seen), serialize(val, depth + 1, seen)],
          extra: 0,
        });
      }
      return {
        kind: 'collection',
        ctor: 'Map',
        size: object.size,
        items,
        extra: Math.max(0, object.size - items.length),
      };
    }

    if (typeof (object as { then?: unknown }).then === 'function') {
      return { kind: 'truncated', label: 'Promise { … }' };
    }

    const keys = Reflect.ownKeys(object).filter(
      (key) => typeof key === 'string' || typeof key === 'symbol',
    );
    const entries: Array<{ key: string; value: SerializedValue }> = [];
    for (const key of keys.slice(0, MAX_ENTRIES)) {
      // A property may be an accessor that throws; never let that escape.
      let read: unknown;
      try {
        read = (object as Record<PropertyKey, unknown>)[key];
      } catch (error) {
        read = `[getter threw: ${describeThrown(error)}]`;
      }
      entries.push({ key: String(key), value: serialize(read, depth + 1, seen) });
    }

    return {
      kind: 'object',
      ctor: constructorName(object),
      entries,
      extra: Math.max(0, keys.length - entries.length),
    };
  } finally {
    seen.delete(object);
  }
}
