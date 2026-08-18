import { useEffect, useState } from 'react';

/** An hour is far below any half-life here, so nothing visible is ever stale. */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

/**
 * The current time, refreshed occasionally.
 *
 * Health decays continuously, but the smallest half-life is two days — updating
 * more often than hourly would re-render for a change too small to see.
 */
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
