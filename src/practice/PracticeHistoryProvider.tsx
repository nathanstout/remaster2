import { useCallback, useMemo, useState, type ReactNode } from 'react';
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

  const append = useCallback((record: PracticeRecord): boolean => {
    // Persist first: a session that could not be saved must not appear saved.
    if (!appendRecord(record)) return false;
    setRecords((previous) => [...previous, record]);
    return true;
  }, []);

  const value = useMemo<PracticeHistoryValue>(() => ({ records, append }), [records, append]);

  return (
    <PracticeHistoryContext.Provider value={value}>{children}</PracticeHistoryContext.Provider>
  );
}
