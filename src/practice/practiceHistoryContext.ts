import { createContext, useContext } from 'react';
import type { PracticeRecord } from '../types/practice';

export interface PracticeHistoryValue {
  /** Every stored record, across all problems. */
  records: PracticeRecord[];
  /**
   * Persists a record and, only on success, adds it to state. Returns whether
   * it was stored, so callers can refuse to end a session that was not saved.
   */
  append: (record: PracticeRecord) => boolean;
}

export const PracticeHistoryContext = createContext<PracticeHistoryValue | null>(null);

export function usePracticeHistory(): PracticeHistoryValue {
  const value = useContext(PracticeHistoryContext);
  if (!value) throw new Error('usePracticeHistory must be used inside a PracticeHistoryProvider.');
  return value;
}
