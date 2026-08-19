import type {
  PracticeSession,
  PracticeSessionItem,
  PracticeSessionMode,
  PracticeSessionProgress,
} from './types';

/**
 * Every change to a session, as pure functions.
 *
 * Each one takes a valid session and returns a candidate. Nothing is mutated in
 * place, so a candidate that fails validation or fails to persist can simply be
 * dropped, leaving the live session exactly as it was — there is no half-applied
 * state to unwind.
 */

export const SESSION_SCHEMA_VERSION = 1;

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The problem being practised, derived rather than stored.
 *
 * The first pending item *is* the current one. Making that a derivation rather
 * than a field is what makes "two current items" and "no current item while
 * work remains" unrepresentable instead of merely unlikely.
 */
export function currentItem(session: PracticeSession): PracticeSessionItem | undefined {
  return session.queue.find((item) => item.status === 'pending');
}

export function currentProblemId(session: PracticeSession): string | undefined {
  return currentItem(session)?.problemId;
}

export function sessionProgress(session: PracticeSession): PracticeSessionProgress {
  let completed = 0;
  let skipped = 0;
  let remaining = 0;
  for (const item of session.queue) {
    if (item.status === 'completed') completed += 1;
    else if (item.status === 'skipped') skipped += 1;
    else remaining += 1;
  }
  return { total: session.queue.length, completed, skipped, remaining };
}

/** True once nothing is left to practise, however the items got there. */
export function isSessionComplete(session: PracticeSession): boolean {
  return currentItem(session) === undefined;
}

export function createSession(input: {
  sourceFolderId: string;
  mode: PracticeSessionMode;
  problemIds: string[];
  id?: string;
  startedAt?: string;
}): PracticeSession {
  // Deduplicated at the boundary, preserving the intended order, so no queue
  // can contain the same problem twice even if the source ever hands back one.
  const seen = new Set<string>();
  const queue: PracticeSessionItem[] = [];
  for (const problemId of input.problemIds) {
    if (seen.has(problemId)) continue;
    seen.add(problemId);
    queue.push({ problemId, status: 'pending' });
  }

  return {
    version: SESSION_SCHEMA_VERSION,
    id: input.id ?? newSessionId(),
    sourceFolderId: input.sourceFolderId,
    mode: input.mode,
    startedAt: input.startedAt ?? new Date().toISOString(),
    queue,
  };
}

function replaceItem(
  session: PracticeSession,
  problemId: string,
  status: PracticeSessionItem['status'],
): PracticeSession {
  return {
    ...session,
    queue: session.queue.map((item) =>
      item.problemId === problemId ? { ...item, status } : item,
    ),
  };
}

/**
 * Marks the current item completed — but only if it is the problem named.
 *
 * The guard is what keeps practice done elsewhere from advancing the queue: a
 * record for any other problem returns the session unchanged.
 */
export function completeCurrent(
  session: PracticeSession,
  problemId: string,
): PracticeSession | null {
  if (currentProblemId(session) !== problemId) return null;
  return replaceItem(session, problemId, 'completed');
}

/** Retires the current item without recording anything. */
export function skipCurrent(session: PracticeSession): PracticeSession | null {
  const current = currentItem(session);
  if (!current) return null;
  return replaceItem(session, current.problemId, 'skipped');
}

/**
 * Sends the current item to the back of the queue.
 *
 * Only reorders — the item stays pending and its attempt is never touched, so
 * coming back to it later restores exactly what was left behind.
 */
export function deferCurrent(session: PracticeSession): PracticeSession | null {
  const current = currentItem(session);
  if (!current) return null;
  // With nothing else pending it would come straight back as current, which is
  // a no-op dressed up as an action.
  if (sessionProgress(session).remaining < 2) return null;

  const rest = session.queue.filter((item) => item.problemId !== current.problemId);
  return { ...session, queue: [...rest, current] };
}

/**
 * Makes a pending item current by moving it in front of the current one.
 *
 * Nothing is completed or skipped by jumping: the item that was current stays
 * pending, directly behind the one jumped to.
 */
export function makeCurrent(session: PracticeSession, problemId: string): PracticeSession | null {
  const target = session.queue.find((item) => item.problemId === problemId);
  if (!target || target.status !== 'pending') return null;
  if (currentProblemId(session) === problemId) return null;

  const rest = session.queue.filter((item) => item.problemId !== problemId);
  const insertAt = rest.findIndex((item) => item.status === 'pending');
  const at = insertAt === -1 ? rest.length : insertAt;
  return { ...session, queue: [...rest.slice(0, at), target, ...rest.slice(at)] };
}

/**
 * Drops queue items whose problem has left the catalogue.
 *
 * A session outlives edits to the problem list, so an id that no longer
 * resolves is removed on sight rather than becoming a dead route.
 */
export function pruneUnknownProblems(
  session: PracticeSession,
  isKnown: (problemId: string) => boolean,
): PracticeSession {
  const queue = session.queue.filter((item) => isKnown(item.problemId));
  return queue.length === session.queue.length ? session : { ...session, queue };
}
