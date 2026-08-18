import type { Problem } from '../types/problem';

/**
 * Draft persistence for unfinished attempts.
 *
 * The only thing stored is source text: no runtime state, no results, and — by
 * design — no record of finished work. A later practice history will live under
 * its own key namespace, so "what I am part-way through" and "what I have
 * practised" never share a record.
 */

const NAMESPACE = 'practice-app';
const DRAFT_SCHEMA_VERSION = 1;

/** Shape written to storage. Read defensively; anything else is discarded. */
export interface ProblemDraft {
  /** Schema of this record, so the reader can reject shapes it predates. */
  version: number;
  /** The problem definition it was written against. */
  problemVersion: number;
  files: Record<string, string>;
  updatedAt: string;
}

function draftKey(problemId: string): string {
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
    if (import.meta.env.DEV) console.warn('[drafts] storage unavailable', error);
    return fallback;
  }
}

function isDraft(value: unknown): value is ProblemDraft {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ProblemDraft>;
  return (
    candidate.version === DRAFT_SCHEMA_VERSION &&
    typeof candidate.problemVersion === 'number' &&
    typeof candidate.files === 'object' &&
    candidate.files !== null &&
    Object.values(candidate.files).every((file) => typeof file === 'string')
  );
}

/**
 * Returns the saved files for a problem, or null when there is nothing usable.
 *
 * A record that is corrupt, from an older schema, or written against an older
 * version of the problem is removed rather than repaired — the cost of a wrong
 * restore is mysterious stale code, and the cost of dropping one is retyping.
 */
export function loadDraft(problem: Problem): Record<string, string> | null {
  return withStorage((storage) => {
    const raw = storage.getItem(draftKey(problem.id));
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storage.removeItem(draftKey(problem.id));
      return null;
    }

    if (!isDraft(parsed) || parsed.problemVersion !== problem.version) {
      storage.removeItem(draftKey(problem.id));
      return null;
    }

    // Only files the problem still defines; anything else is stale.
    const files: Record<string, string> = {};
    for (const file of problem.files) {
      files[file.id] = parsed.files[file.id] ?? file.starterCode;
    }
    return files;
  }, null);
}

export function saveDraft(problem: Problem, files: Record<string, string>): void {
  const draft: ProblemDraft = {
    version: DRAFT_SCHEMA_VERSION,
    problemVersion: problem.version,
    files,
    updatedAt: new Date().toISOString(),
  };
  withStorage((storage) => storage.setItem(draftKey(problem.id), JSON.stringify(draft)), undefined);
}

export function deleteDraft(problemId: string): void {
  withStorage((storage) => storage.removeItem(draftKey(problemId)), undefined);
}
