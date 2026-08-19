import { createContext, useContext } from 'react';
import type { PracticeSession, PracticeSessionMode, PracticeSessionProgress } from './types';

/**
 * The one authoritative view of the active session.
 *
 * The bottom bar, the queue viewer and the folder page all read from here, so
 * there is no second copy of queue state anywhere that could drift from it.
 */
export interface PracticeSessionValue {
  session: PracticeSession | null;
  /** The problem the session is waiting on, if any work remains. */
  currentProblemId: string | undefined;
  progress: PracticeSessionProgress;
  /** True when a session exists but has nothing left to practise. */
  isComplete: boolean;
  /** Set when a session change could not be saved; cleared by the next success. */
  error: string | null;
  /**
   * A completion that was recorded but could not be written to the queue.
   *
   * Its presence means the practice result is safely in history while the queue
   * is out of date — the one case where the two stores legitimately disagree.
   * Held in memory only: the write that would have persisted it is the one that
   * failed, so there is nowhere to put it.
   */
  pendingAdvance: { problemId: string } | null;

  /** Snapshots a folder subtree into a new queue and opens its first problem. */
  start: (input: { sourceFolderId: string; mode: PracticeSessionMode }) => boolean;
  /** Retires the current problem, discarding its unfinished attempt. */
  skip: () => void;
  /** Sends the current problem to the back of the queue, attempt untouched. */
  defer: () => void;
  /** Makes a pending queue item current without completing anything. */
  jumpTo: (problemId: string) => void;
  /** Navigates back to the current queued problem. */
  returnToSession: () => void;
  /**
   * Re-applies a recorded completion to the queue.
   *
   * Touches the session and nothing else — history already has the record, so
   * this can never append a second one, and re-running it after it has already
   * succeeded is a no-op.
   */
  retryAdvance: () => void;
  /** Discards the queue. Records, attempts and health are untouched. */
  end: () => void;

  /** False when deferring would just hand the same problem straight back. */
  canDefer: boolean;
  dismissError: () => void;
}

export const PracticeSessionContext = createContext<PracticeSessionValue | null>(null);

export function usePracticeSession(): PracticeSessionValue {
  const value = useContext(PracticeSessionContext);
  if (!value) {
    throw new Error('usePracticeSession must be used inside a PracticeSessionProvider.');
  }
  return value;
}
