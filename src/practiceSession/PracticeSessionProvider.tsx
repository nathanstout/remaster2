import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, loadSession, saveSession } from '../persistence/session';
import { usePracticeHistory } from '../practice/practiceHistoryContext';
import { getProblem } from '../problems';
import { useTaxonomy } from '../taxonomy';
import { buildQueueOrder } from './ordering';
import {
  completeCurrent,
  createSession,
  currentProblemId as currentProblemIdOf,
  deferCurrent,
  isSessionComplete,
  makeCurrent,
  pruneUnknownProblems,
  sessionProgress,
  skipCurrent,
} from './mutations';
import { PracticeSessionContext, type PracticeSessionValue } from './sessionContext';
import { validateSession } from './validation';
import type { PracticeSession, PracticeSessionMode } from './types';

const SAVE_FAILED = 'Could not save session progress. The queue was left as it was.';

/** Progress for "no session at all", so consumers never branch on null counts. */
const NO_PROGRESS = { total: 0, completed: 0, skipped: 0, remaining: 0 } as const;

/**
 * Restores a stored session, dropping queue items that no longer resolve.
 *
 * A queue is only ever a list of ids, so a problem leaving the catalogue makes
 * an item meaningless rather than the session invalid — unless nothing usable
 * is left, in which case there is no queue to return to.
 */
function restoreSession(): PracticeSession | null {
  const stored = loadSession();
  if (!stored) return null;

  const pruned = pruneUnknownProblems(stored, (problemId) => getProblem(problemId) !== undefined);
  if (pruned.queue.length === 0) {
    clearSession();
    return null;
  }
  // Best effort: if this write fails the pruned queue is still the one used in
  // memory, because it is the only one that can be navigated.
  if (pruned !== stored) saveSession(pruned);
  return pruned;
}

/**
 * Owns the single active practice session.
 *
 * Everything here is scheduling: which problem to open next, and in what order.
 * It writes no practice records, calculates no mastery and never re-implements
 * Submit — it observes records that the normal flow has already stored, and
 * moves a queue pointer when the record is for the problem it was waiting on.
 */
export function PracticeSessionProvider({
  children,
  onDiscardAttempt,
}: {
  children: ReactNode;
  /**
   * Discards the unfinished attempt for a problem, using the app's existing
   * reset path. Only Skip uses it; the session never clears work otherwise.
   */
  onDiscardAttempt: (problemId: string) => void;
}) {
  const { taxonomy } = useTaxonomy();
  const { subscribe } = usePracticeHistory();
  const navigate = useNavigate();

  const [session, setSession] = useState<PracticeSession | null>(restoreSession);
  const [error, setError] = useState<string | null>(null);
  const [pendingAdvance, setPendingAdvance] = useState<{ problemId: string } | null>(null);

  // Read by the history listener, which is registered once and must always see
  // the live session rather than the one captured when it was registered.
  const sessionRef = useRef(session);
  sessionRef.current = session;

  /**
   * Adopts a candidate session only if it can be stored.
   *
   * Persist-then-adopt, so what is on screen is always what a reload would
   * produce. A refused candidate is simply dropped: the previous session stays
   * exactly as it was, with nothing partially applied.
   */
  const commit = useCallback((candidate: PracticeSession): boolean => {
    // A candidate that does not hold together is refused rather than stored:
    // better to keep a valid queue than to persist a broken one.
    const problems = validateSession(candidate);
    if (problems.length > 0) {
      if (import.meta.env.DEV) console.warn('[session] invalid candidate', problems);
      setError('That change would have left the session inconsistent, so it was not applied.');
      return false;
    }
    if (!saveSession(candidate)) {
      setError(SAVE_FAILED);
      return false;
    }
    setError(null);
    sessionRef.current = candidate;
    setSession(candidate);
    return true;
  }, []);

  /** Opens the queue's current problem, or stays put once nothing is left. */
  const openCurrent = useCallback(
    (next: PracticeSession) => {
      const problemId = currentProblemIdOf(next);
      if (problemId) navigate(`/problem/${problemId}`);
    },
    [navigate],
  );

  /**
   * Advancement, driven entirely by records the normal flow has already saved.
   *
   * The guard inside `completeCurrent` is the whole integration: a record for
   * anything other than the problem the queue is waiting on leaves the session
   * untouched, which is what lets practice happen freely outside the queue.
   */
  useEffect(
    () =>
      subscribe((record) => {
        const active = sessionRef.current;
        if (!active) return;

        const candidate = completeCurrent(active, record.problemId);
        if (!candidate) return;

        // If this write fails the record still stands — practice history is
        // never rolled back to keep a queue consistent. The queue stays where
        // it was, and the completion is remembered so it can be re-applied
        // without the user having to submit anything a second time.
        if (commit(candidate)) {
          setPendingAdvance(null);
          openCurrent(candidate);
        } else {
          setPendingAdvance({ problemId: record.problemId });
        }
      }),
    [subscribe, commit, openCurrent],
  );

  const start = useCallback(
    (input: { sourceFolderId: string; mode: PracticeSessionMode }): boolean => {
      const problemIds = buildQueueOrder(taxonomy, input.sourceFolderId, input.mode).filter(
        (problemId) => getProblem(problemId) !== undefined,
      );
      // Nothing to practise is not a session.
      if (problemIds.length === 0) return false;

      const candidate = createSession({ ...input, problemIds });
      if (!commit(candidate)) return false;
      openCurrent(candidate);
      return true;
    },
    [taxonomy, commit, openCurrent],
  );

  const skip = useCallback(() => {
    const active = sessionRef.current;
    if (!active) return;
    const problemId = currentProblemIdOf(active);
    if (!problemId) return;

    const candidate = skipCurrent(active);
    if (!candidate) return;
    // Queue first: work is only discarded once the skip is certain to stick.
    if (!commit(candidate)) return;
    onDiscardAttempt(problemId);
    openCurrent(candidate);
  }, [commit, openCurrent, onDiscardAttempt]);

  const defer = useCallback(() => {
    const active = sessionRef.current;
    if (!active) return;
    const candidate = deferCurrent(active);
    if (!candidate) return;
    if (!commit(candidate)) return;
    openCurrent(candidate);
  }, [commit, openCurrent]);

  const jumpTo = useCallback(
    (problemId: string) => {
      const active = sessionRef.current;
      if (!active) return;
      const candidate = makeCurrent(active, problemId);
      if (!candidate) {
        // Already current, or not pending: still a navigation request.
        if (getProblem(problemId)) navigate(`/problem/${problemId}`);
        return;
      }
      if (!commit(candidate)) return;
      openCurrent(candidate);
    },
    [commit, navigate, openCurrent],
  );

  const returnToSession = useCallback(() => {
    const active = sessionRef.current;
    if (active) openCurrent(active);
  }, [openCurrent]);

  /**
   * Applies a completion that history already accepted but the queue did not.
   *
   * Idempotent by construction rather than by a guard flag: `completeCurrent`
   * only produces a candidate while that problem is still the current item, so
   * a second call — from a double-click, or after the first one worked — finds
   * nothing to do and simply clears the recovery state. Nothing here can reach
   * practice history, so no retry can duplicate a record.
   */
  const retryAdvance = useCallback(() => {
    const active = sessionRef.current;
    const outstanding = pendingAdvance;
    if (!active || !outstanding) return;

    const candidate = completeCurrent(active, outstanding.problemId);
    if (!candidate) {
      setPendingAdvance(null);
      return;
    }
    if (!commit(candidate)) return;
    setPendingAdvance(null);
    openCurrent(candidate);
  }, [pendingAdvance, commit, openCurrent]);

  /**
   * Deletes the queue and nothing else.
   *
   * No record is written, no attempt is cleared, no route changes: whatever was
   * being worked on stays open and stays saved. Everything already completed
   * was recorded at the time it happened and is entirely unaffected.
   */
  const end = useCallback(() => {
    clearSession();
    sessionRef.current = null;
    setSession(null);
    setError(null);
    setPendingAdvance(null);
  }, []);

  const value = useMemo<PracticeSessionValue>(() => {
    const progress = session ? sessionProgress(session) : NO_PROGRESS;
    return {
      session,
      currentProblemId: session ? currentProblemIdOf(session) : undefined,
      progress,
      isComplete: session ? isSessionComplete(session) : false,
      error,
      pendingAdvance,
      start,
      skip,
      defer,
      jumpTo,
      returnToSession,
      retryAdvance,
      end,
      canDefer: progress.remaining > 1,
      dismissError: () => setError(null),
    };
  }, [session, error, pendingAdvance, start, skip, defer, jumpTo, returnToSession, retryAdvance, end]);

  return (
    <PracticeSessionContext.Provider value={value}>{children}</PracticeSessionContext.Provider>
  );
}
