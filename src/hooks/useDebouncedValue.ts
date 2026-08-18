import { useEffect, useState } from 'react';

/**
 * Returns `value` delayed by `delayMs`. The first value is returned
 * immediately, so a freshly mounted editor executes without waiting.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs, debounced]);

  return debounced;
}
