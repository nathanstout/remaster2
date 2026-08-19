import { parseSession } from '../practiceSession/validation';
import type { PracticeSession } from '../practiceSession/types';

/**
 * Persistence for the one active practice session.
 *
 * Its own key and its own version, deliberately separate from history and
 * attempts: a queue is disposable scheduling state, and losing or discarding it
 * must never be able to reach the two stores that hold real work.
 */

const KEY = 'practice-app:session';

function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return action(window.localStorage);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[session] storage unavailable', error);
    return fallback;
  }
}

/** The stored session, or null when there is none or it cannot be trusted. */
export function loadSession(): PracticeSession | null {
  return withStorage((storage) => {
    const raw = storage.getItem(KEY);
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storage.removeItem(KEY);
      return null;
    }

    const session = parseSession(parsed);
    // Unreadable session state is cleared here and nowhere else: attempts,
    // history and taxonomy live under their own keys and are not consulted.
    if (!session) storage.removeItem(KEY);
    return session;
  }, null);
}

/**
 * Writes the active session, reporting whether it was actually stored.
 *
 * The caller uses the answer to decide whether to adopt the candidate, so a
 * failed write leaves the previous valid session on screen rather than showing
 * progress that no reload would reproduce.
 */
export function saveSession(session: PracticeSession): boolean {
  return withStorage((storage) => {
    storage.setItem(KEY, JSON.stringify(session));
    const raw = storage.getItem(KEY);
    return raw !== null && parseSession(JSON.parse(raw) as unknown)?.id === session.id;
  }, false);
}

export function clearSession(): void {
  withStorage((storage) => storage.removeItem(KEY), undefined);
}
