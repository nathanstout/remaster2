import type { Taxonomy } from '../taxonomy/types';

/**
 * Persistence for the user's problem organization.
 *
 * Deliberately its own key and its own record, separate from Phase 6 drafts:
 * moving a problem between folders must never touch its saved attempt.
 */

const KEY = 'practice-app:taxonomy';
const SCHEMA_VERSION = 1;

export interface PersistedTaxonomy {
  version: number;
  folders: Taxonomy['folders'];
  placements: Taxonomy['placements'];
}

function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return action(window.localStorage);
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[taxonomy] storage unavailable', error);
    return fallback;
  }
}

/**
 * Returns whatever was stored, in raw form.
 *
 * Only the outer shape is checked here — repairing the contents is
 * reconciliation's job, and it is far better at it than a parser would be.
 */
export function loadPersistedTaxonomy(): Taxonomy | null {
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

    const candidate = parsed as Partial<PersistedTaxonomy> | null;
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      candidate.version !== SCHEMA_VERSION ||
      !Array.isArray(candidate.folders) ||
      !Array.isArray(candidate.placements)
    ) {
      storage.removeItem(KEY);
      return null;
    }

    return { folders: candidate.folders, placements: candidate.placements };
  }, null);
}

export function savePersistedTaxonomy(taxonomy: Taxonomy): void {
  const record: PersistedTaxonomy = {
    version: SCHEMA_VERSION,
    folders: taxonomy.folders,
    placements: taxonomy.placements,
  };
  withStorage((storage) => storage.setItem(KEY, JSON.stringify(record)), undefined);
}
