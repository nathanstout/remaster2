/**
 * A Practice Session is a temporary ordered queue of problem ids.
 *
 * It decides what to practise next and nothing else: no scoring, no history, no
 * attempt state. Everything it needs about a problem is resolved through the
 * stable id at render time, so a session can never hold a stale copy of a
 * title, a mastery score, or source code — and deleting a session can never
 * take practice history with it.
 */

export type PracticeSessionMode = 'ordered' | 'shuffle';

/**
 * `pending` items are the remaining work; the first of them is the current one.
 *
 * Skipped items stay in the queue rather than being spliced out, which is what
 * lets the completion summary distinguish "completed" from "skipped" without
 * storing separate counters that could disagree with the queue.
 */
export type PracticeSessionItemStatus = 'pending' | 'completed' | 'skipped';

export interface PracticeSessionItem {
  problemId: string;
  status: PracticeSessionItemStatus;
}

export interface PracticeSession {
  /** Schema of this record, so a reader can migrate or reject older shapes. */
  version: number;
  id: string;

  sourceFolderId: string;
  mode: PracticeSessionMode;

  startedAt: string;

  queue: PracticeSessionItem[];
}

/**
 * Progress that survives Skip and Later.
 *
 * Deliberately not `index / length`: Later reorders the queue and Skip retires
 * items without completing them, so a linear index would misreport both.
 */
export interface PracticeSessionProgress {
  total: number;
  completed: number;
  skipped: number;
  remaining: number;
}
