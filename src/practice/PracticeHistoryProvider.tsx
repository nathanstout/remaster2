import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { appendRecord, loadHistory } from '../persistence/history';
import type { PracticeRecord } from '../types/practice';
import { PracticeHistoryContext, type PracticeHistoryValue } from './practiceHistoryContext';

/**
 * Holds practice history in state so finishing a session updates the UI at once.
 *
 * Storage stays authoritative — this is a read-through cache seeded once, not a
 * second source of truth. Nothing derived is kept here: health is recomputed
 * from these records and the current time wherever it is needed.
 */
export function PracticeHistoryProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<PracticeRecord[]>(() => loadHistory());
  const listeners = useRef(new Set<(record: PracticeRecord) => void>());

  const subscribe = useCallback((listener: (record: PracticeRecord) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const append = useCallback((record: PracticeRecord): boolean => {
    // Persist first: a session that could not be saved must not appear saved.
    if (!appendRecord(record)) return false;
    setRecords((previous) => [...previous, record]);

    // Only after the write succeeded, so nothing downstream can react to
    // practice that was not recorded. A listener that throws is contained: it
    // must not be able to break the completion it is merely observing.
    for (const listener of listeners.current) {
      try {
        listener(record);
      } catch (error) {
        if (import.meta.env.DEV) console.warn('[history] listener failed', error);
      }
    }
    return true;
  }, []);

  const value = useMemo<PracticeHistoryValue>(
    () => ({ records, append, subscribe }),
    [records, append, subscribe],
  );

  return (
    <PracticeHistoryContext.Provider value={value}>{children}</PracticeHistoryContext.Provider>
  );
}
