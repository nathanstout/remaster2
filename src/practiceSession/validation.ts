import { SESSION_SCHEMA_VERSION } from './mutations';
import type { PracticeSession, PracticeSessionItem } from './types';

/**
 * The guard between stored bytes and live session state.
 *
 * Session data is disposable, so the bias here is the opposite of the taxonomy's:
 * repair what is trivially repairable, and otherwise throw the session away.
 * Nothing else is ever touched — a corrupt queue says nothing about the
 * attempts, records or folders it refers to.
 */

const STATUSES = new Set(['pending', 'completed', 'skipped']);

function isItem(value: unknown): value is PracticeSessionItem {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PracticeSessionItem>;
  return (
    typeof candidate.problemId === 'string' &&
    candidate.problemId.length > 0 &&
    typeof candidate.status === 'string' &&
    STATUSES.has(candidate.status)
  );
}

/**
 * Parses a persisted session, or returns null if it cannot be trusted.
 *
 * Duplicate ids and individually malformed items are repaired by dropping them;
 * a wrong version, a wrong shape, or an empty result is fatal to the session.
 */
export function parseSession(value: unknown): PracticeSession | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<PracticeSession>;

  if (candidate.version !== SESSION_SCHEMA_VERSION) return null;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return null;
  if (typeof candidate.sourceFolderId !== 'string' || candidate.sourceFolderId.length === 0) {
    return null;
  }
  if (candidate.mode !== 'ordered' && candidate.mode !== 'shuffle') return null;
  if (typeof candidate.startedAt !== 'string') return null;
  if (!Array.isArray(candidate.queue)) return null;

  const seen = new Set<string>();
  const queue: PracticeSessionItem[] = [];
  for (const raw of candidate.queue) {
    if (!isItem(raw)) continue;
    if (seen.has(raw.problemId)) continue;
    seen.add(raw.problemId);
    queue.push({ problemId: raw.problemId, status: raw.status });
  }

  // A queue with nothing in it is not a session anyone can act on.
  if (queue.length === 0) return null;

  return {
    version: SESSION_SCHEMA_VERSION,
    id: candidate.id,
    sourceFolderId: candidate.sourceFolderId,
    mode: candidate.mode,
    startedAt: candidate.startedAt,
    queue,
  };
}

/**
 * Checks a candidate produced in-app before it is persisted or adopted.
 *
 * Returns the problems found, empty when the session is sound. Mutations are
 * pure and total, so this is a tripwire for a future bug rather than a routine
 * failure path — but it runs on every mutation so that a bad candidate is
 * refused instead of replacing a good session.
 */
export function validateSession(session: PracticeSession): string[] {
  const errors: string[] = [];

  if (session.version !== SESSION_SCHEMA_VERSION) errors.push('Unsupported session version.');
  if (session.queue.length === 0) errors.push('Session queue is empty.');

  const seen = new Set<string>();
  for (const item of session.queue) {
    if (seen.has(item.problemId)) errors.push(`Duplicate problem in queue: ${item.problemId}`);
    seen.add(item.problemId);
    if (!STATUSES.has(item.status)) errors.push(`Unknown item status: ${item.status}`);
  }

  return errors;
}
