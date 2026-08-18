import { getChildFolders, getDescendantFolders, getDirectProblems } from './queries';
import type { ProblemFolder, Taxonomy } from './types';
import { validateTaxonomy } from './validation';

/**
 * Organization edits, as pure functions.
 *
 * Every operation builds a *candidate* taxonomy and validates it before
 * returning. A rejected operation returns the reason and nothing else, so the
 * caller's current taxonomy is left exactly as it was — mutations are atomic by
 * construction rather than by careful unwinding.
 */
export type MutationResult =
  | { ok: true; taxonomy: Taxonomy }
  | { ok: false; error: string };

export function newFolderId(): string {
  // Identity is generated, never derived from the name, so renaming is free.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `folder-${crypto.randomUUID()}`;
  }
  return `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function commit(candidate: Taxonomy, knownProblemIds: string[]): MutationResult {
  const issues = validateTaxonomy(candidate, knownProblemIds);
  if (issues.length > 0) return { ok: false, error: issues[0] };
  return { ok: true, taxonomy: candidate };
}

function cleanName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function createFolder(
  taxonomy: Taxonomy,
  { name, parentId, id }: { name: string; parentId: string | null; id?: string },
  knownProblemIds: string[],
): MutationResult {
  const cleaned = cleanName(name);
  if (!cleaned) return { ok: false, error: 'Folder name cannot be empty.' };
  if (parentId !== null && !taxonomy.folders.some((folder) => folder.id === parentId)) {
    return { ok: false, error: 'That parent folder no longer exists.' };
  }

  const folder: ProblemFolder = { id: id ?? newFolderId(), name: cleaned, parentId };
  // Appending keeps sibling order stable and predictable.
  return commit(
    { folders: [...taxonomy.folders, folder], placements: taxonomy.placements },
    knownProblemIds,
  );
}

/** Changes the name and nothing else — id, parent, children and placements all hold. */
export function renameFolder(
  taxonomy: Taxonomy,
  { folderId, name }: { folderId: string; name: string },
  knownProblemIds: string[],
): MutationResult {
  const cleaned = cleanName(name);
  if (!cleaned) return { ok: false, error: 'Folder name cannot be empty.' };
  if (!taxonomy.folders.some((folder) => folder.id === folderId)) {
    return { ok: false, error: 'That folder no longer exists.' };
  }

  return commit(
    {
      folders: taxonomy.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: cleaned } : folder,
      ),
      placements: taxonomy.placements,
    },
    knownProblemIds,
  );
}

/**
 * Reparents a folder. Descendants follow automatically, because they reference
 * their parent by stable id rather than being nested inside it.
 */
export function moveFolder(
  taxonomy: Taxonomy,
  { folderId, parentId }: { folderId: string; parentId: string | null },
  knownProblemIds: string[],
): MutationResult {
  if (!taxonomy.folders.some((folder) => folder.id === folderId)) {
    return { ok: false, error: 'That folder no longer exists.' };
  }
  if (parentId === folderId) {
    return { ok: false, error: 'A folder cannot be moved into itself.' };
  }
  if (parentId !== null) {
    if (!taxonomy.folders.some((folder) => folder.id === parentId)) {
      return { ok: false, error: 'That destination folder no longer exists.' };
    }
    // The invariant that matters: a folder may never become its own descendant.
    if (getDescendantFolders(taxonomy, folderId).some((folder) => folder.id === parentId)) {
      return { ok: false, error: 'A folder cannot be moved inside one of its own subfolders.' };
    }
  }

  return commit(
    {
      folders: taxonomy.folders.map((folder) =>
        folder.id === folderId ? { ...folder, parentId } : folder,
      ),
      placements: taxonomy.placements,
    },
    knownProblemIds,
  );
}

/**
 * Repoints a problem's single placement. The problem definition, its route and
 * its draft are all untouched — only where it appears in the tree changes.
 */
export function moveProblem(
  taxonomy: Taxonomy,
  { problemId, folderId }: { problemId: string; folderId: string },
  knownProblemIds: string[],
): MutationResult {
  if (!taxonomy.folders.some((folder) => folder.id === folderId)) {
    return { ok: false, error: 'That destination folder no longer exists.' };
  }

  const placements = taxonomy.placements.map((placement) =>
    placement.problemId === problemId ? { ...placement, folderId } : placement,
  );
  if (!placements.some((placement) => placement.problemId === problemId)) {
    placements.push({ problemId, folderId });
  }

  return commit({ folders: taxonomy.folders, placements }, knownProblemIds);
}

/**
 * Deletes an empty folder only.
 *
 * Recursive deletion would silently take problems and subfolders with it; making
 * the user empty a folder first keeps a destructive action explicit. A default
 * folder is as deletable as any other — reconciliation can recreate it later if
 * a new problem needs it.
 */
export function deleteFolder(
  taxonomy: Taxonomy,
  { folderId }: { folderId: string },
  knownProblemIds: string[],
): MutationResult {
  const folder = taxonomy.folders.find((candidate) => candidate.id === folderId);
  if (!folder) return { ok: false, error: 'That folder no longer exists.' };

  if (getChildFolders(taxonomy, folderId).length > 0 || getDirectProblems(taxonomy, folderId).length > 0) {
    return {
      ok: false,
      error: `Can't delete "${folder.name}". Move its problems and subfolders first.`,
    };
  }

  return commit(
    {
      folders: taxonomy.folders.filter((candidate) => candidate.id !== folderId),
      placements: taxonomy.placements,
    },
    knownProblemIds,
  );
}
