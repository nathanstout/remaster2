import type { ActiveAttempt, AttemptProgress } from '../types/practice';
import type { Problem } from '../types/problem';

/**
 * Persistence for the in-progress practice session.
 *
 * An evolution of the Phase 6 draft rather than a second store: source and the
 * assistance that scoring depends on belong to the same record, so they cannot
 * drift apart. Finished sessions live in `history.ts` under their own key —
 * "what I am part-way through" and "what I have practised" stay separate.
 *
 * The storage key is unchanged from Phase 6 so existing work survives the
 * upgrade; only the payload grew, and v1 payloads are migrated on read.
 */

const NAMESPACE = 'practice-app';
const ATTEMPT_SCHEMA_VERSION = 2;

function attemptKey(problemId: string): string {
  return `${NAMESPACE}:draft:${problemId}`;
}

/**
 * Storage is a nice-to-have, never a dependency: private modes, disabled
 * storage and quota errors must all leave the editor completely usable.
 */
function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return action(window.localStorage);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[attempts] storage unavailable', error);
    return fallback;
  }
}

function isFileMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((file) => typeof file === 'string')
  );
}

/** Defaults for metadata a Phase 6 draft could not have carried. */
export function emptyProgress(startedAt = new Date().toISOString()): AttemptProgress {
  return {
    startedAt,
    revealedHintIds: [],
    solutionRevealed: false,
    testRuns: 0,
    failedTestRuns: 0,
  };
}

/**
 * Reads a stored attempt, migrating a Phase 6 draft if that is what it finds.
 *
 * A v1 record only ever held source, so it becomes an attempt whose assistance
 * counters start at zero — the user keeps their code, and the new metadata
 * simply begins from now.
 */
function parseAttempt(raw: string, problem: Problem): ActiveAttempt | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Partial<ActiveAttempt> & { version?: number };

  if (typeof candidate.problemVersion !== 'number') return null;
  if (candidate.problemVersion !== problem.version) return null;
  if (!isFileMap(candidate.files)) return null;

  if (candidate.version === 1) {
    return {
      version: ATTEMPT_SCHEMA_VERSION,
      problemVersion: candidate.problemVersion,
      files: candidate.files,
      updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
      ...emptyProgress(),
    };
  }

  if (candidate.version !== ATTEMPT_SCHEMA_VERSION) return null;

  return {
    version: ATTEMPT_SCHEMA_VERSION,
    problemVersion: candidate.problemVersion,
    files: candidate.files,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    startedAt: typeof candidate.startedAt === 'string' ? candidate.startedAt : new Date().toISOString(),
    revealedHintIds: Array.isArray(candidate.revealedHintIds)
      ? candidate.revealedHintIds.filter((id): id is string => typeof id === 'string')
      : [],
    solutionRevealed: candidate.solutionRevealed === true,
    testRuns: typeof candidate.testRuns === 'number' ? candidate.testRuns : 0,
    failedTestRuns: typeof candidate.failedTestRuns === 'number' ? candidate.failedTestRuns : 0,
  };
}

/**
 * The saved attempt for a problem, or null when there is nothing usable.
 *
 * A record that is corrupt, from an unknown schema, or written against an older
 * version of the problem is removed rather than repaired — the cost of a wrong
 * restore is mysterious stale code, and the cost of dropping one is retyping.
 */
export function loadAttempt(problem: Problem): ActiveAttempt | null {
  return withStorage((storage) => {
    const raw = storage.getItem(attemptKey(problem.id));
    if (raw === null) return null;

    const attempt = parseAttempt(raw, problem);
    if (!attempt) {
      storage.removeItem(attemptKey(problem.id));
      return null;
    }

    // Only files the problem still defines; anything else is stale.
    const files: Record<string, string> = {};
    for (const file of problem.files) {
      files[file.id] = attempt.files[file.id] ?? file.starterCode;
    }
    return { ...attempt, files };
  }, null);
}

export function saveAttempt(
  problem: Problem,
  files: Record<string, string>,
  progress: AttemptProgress,
): void {
  const attempt: ActiveAttempt = {
    version: ATTEMPT_SCHEMA_VERSION,
    problemVersion: problem.version,
    files,
    updatedAt: new Date().toISOString(),
    ...progress,
  };
  withStorage(
    (storage) => storage.setItem(attemptKey(problem.id), JSON.stringify(attempt)),
    undefined,
  );
}

export function deleteAttempt(problemId: string): void {
  withStorage((storage) => storage.removeItem(attemptKey(problemId)), undefined);
}
