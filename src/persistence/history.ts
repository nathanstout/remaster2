import type { PracticeRecord } from '../types/practice';

/**
 * Append-only practice history.
 *
 * Every finished session adds a record; nothing is ever rewritten, because the
 * *sequence* is the point — later phases derive health from how mastery moved
 * over time, which an overwriting store would destroy.
 */

const KEY = 'practice-app:history';
const HISTORY_SCHEMA_VERSION = 1;

export interface PracticeHistoryState {
  version: number;
  records: PracticeRecord[];
}

function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return action(window.localStorage);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[history] storage unavailable', error);
    return fallback;
  }
}

function isRecord(value: unknown): value is PracticeRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PracticeRecord>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.problemId === 'string' &&
    typeof candidate.completedAt === 'string' &&
    (candidate.outcome === 'solved' || candidate.outcome === 'gave-up') &&
    typeof candidate.masteryScore === 'number'
  );
}

export function loadHistory(): PracticeRecord[] {
  return withStorage((storage) => {
    const raw = storage.getItem(KEY);
    if (raw === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storage.removeItem(KEY);
      return [];
    }

    const state = parsed as Partial<PracticeHistoryState> | null;
    if (
      typeof state !== 'object' ||
      state === null ||
      state.version !== HISTORY_SCHEMA_VERSION ||
      !Array.isArray(state.records)
    ) {
      storage.removeItem(KEY);
      return [];
    }

    // Drop individually malformed rows rather than the whole history.
    return state.records.filter(isRecord);
  }, []);
}

/**
 * Appends one record, reporting whether it was actually stored.
 *
 * The caller uses the return value to decide whether the attempt may be
 * discarded: a session that could not be recorded must not be thrown away, and
 * must not be reported as saved.
 */
export function appendRecord(record: PracticeRecord): boolean {
  return withStorage((storage) => {
    const state: PracticeHistoryState = {
      version: HISTORY_SCHEMA_VERSION,
      records: [...loadHistory(), record],
    };
    storage.setItem(KEY, JSON.stringify(state));

    // Only claim success if it can be read back.
    return loadHistory().some((stored) => stored.id === record.id);
  }, false);
}

export function getRecordsForProblem(problemId: string): PracticeRecord[] {
  return loadHistory().filter((record) => record.problemId === problemId);
}

export function getLatestRecordForProblem(problemId: string): PracticeRecord | undefined {
  return getRecordsForProblem(problemId).reduce<PracticeRecord | undefined>(
    (latest, record) =>
      !latest || record.completedAt > latest.completedAt ? record : latest,
    undefined,
  );
}
