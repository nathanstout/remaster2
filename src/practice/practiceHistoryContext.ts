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
  /**
   * Observes records that were actually written, in append order.
   *
   * The narrow seam features built *on top of* practice hang off — a practice
   * session advancing its queue, for instance — without any of them having to
   * re-implement or wrap Submit and Finish Without Solving. Listeners fire only
   * after `append` has confirmed the record is stored, and returns an
   * unsubscribe function.
   */
  subscribe: (listener: (record: PracticeRecord) => void) => () => void;
}

export const PracticeHistoryContext = createContext<PracticeHistoryValue | null>(null);

export function usePracticeHistory(): PracticeHistoryValue {
  const value = useContext(PracticeHistoryContext);
  if (!value) throw new Error('usePracticeHistory must be used inside a PracticeHistoryProvider.');
  return value;
}
