import type { ProblemFolder, Taxonomy } from './types';

/**
 * Traversal over flat taxonomy data.
 *
 * Plain functions over a `Taxonomy` value — no React, no module-level state —
 * so Phase 7B can pass a user-edited taxonomy through the same helpers, and so
 * they stay directly testable.
 */

interface TaxonomyIndex {
  foldersById: Map<string, ProblemFolder>;
  childrenByParent: Map<string | null, ProblemFolder[]>;
  problemsByFolder: Map<string, string[]>;
  folderByProblem: Map<string, string>;
}

/**
 * Indexes are cached per taxonomy object, so repeated queries during a render
 * pass stay O(1) without callers having to thread an index around.
 */
const indexCache = new WeakMap<Taxonomy, TaxonomyIndex>();

function indexOf(taxonomy: Taxonomy): TaxonomyIndex {
  const cached = indexCache.get(taxonomy);
  if (cached) return cached;

  const index: TaxonomyIndex = {
    foldersById: new Map(),
    childrenByParent: new Map(),
    problemsByFolder: new Map(),
    folderByProblem: new Map(),
  };

  for (const folder of taxonomy.folders) {
    index.foldersById.set(folder.id, folder);
    const siblings = index.childrenByParent.get(folder.parentId) ?? [];
    siblings.push(folder);
    index.childrenByParent.set(folder.parentId, siblings);
  }

  for (const placement of taxonomy.placements) {
    const problems = index.problemsByFolder.get(placement.folderId) ?? [];
    problems.push(placement.problemId);
    index.problemsByFolder.set(placement.folderId, problems);
    index.folderByProblem.set(placement.problemId, placement.folderId);
  }

  indexCache.set(taxonomy, index);
  return index;
}

export function getFolder(taxonomy: Taxonomy, folderId: string): ProblemFolder | undefined {
  return indexOf(taxonomy).foldersById.get(folderId);
}

export function getRootFolders(taxonomy: Taxonomy): ProblemFolder[] {
  return indexOf(taxonomy).childrenByParent.get(null) ?? [];
}

export function getChildFolders(taxonomy: Taxonomy, folderId: string): ProblemFolder[] {
  return indexOf(taxonomy).childrenByParent.get(folderId) ?? [];
}

/** Problems placed directly in this folder, not in its descendants. */
export function getDirectProblems(taxonomy: Taxonomy, folderId: string): string[] {
  return indexOf(taxonomy).problemsByFolder.get(folderId) ?? [];
}

export function getFolderForProblem(taxonomy: Taxonomy, problemId: string): string | undefined {
  return indexOf(taxonomy).folderByProblem.get(problemId);
}

/** Ancestors from the root down to the folder's parent. */
export function getAncestorFolders(taxonomy: Taxonomy, folderId: string): ProblemFolder[] {
  const index = indexOf(taxonomy);
  const ancestors: ProblemFolder[] = [];
  const seen = new Set<string>([folderId]);

  let current = index.foldersById.get(folderId)?.parentId ?? null;
  while (current !== null && !seen.has(current)) {
    const folder = index.foldersById.get(current);
    if (!folder) break;
    ancestors.unshift(folder);
    seen.add(current);
    current = folder.parentId;
  }
  return ancestors;
}

/** Every folder beneath this one, at any depth. */
export function getDescendantFolders(taxonomy: Taxonomy, folderId: string): ProblemFolder[] {
  const index = indexOf(taxonomy);
  const descendants: ProblemFolder[] = [];
  const seen = new Set<string>([folderId]);
  const queue = [...(index.childrenByParent.get(folderId) ?? [])];

  while (queue.length > 0) {
    const folder = queue.shift()!;
    if (seen.has(folder.id)) continue;
    seen.add(folder.id);
    descendants.push(folder);
    queue.push(...(index.childrenByParent.get(folder.id) ?? []));
  }
  return descendants;
}

/**
 * Every problem under this folder, direct and recursive, without duplicates.
 *
 * The query later phases lean on most: folder health, review queues and random
 * practice all mean "everything under here".
 */
export function getProblemsInSubtree(taxonomy: Taxonomy, folderId: string): string[] {
  const index = indexOf(taxonomy);
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const folder of [folderId, ...getDescendantFolders(taxonomy, folderId).map((f) => f.id)]) {
    for (const problemId of index.problemsByFolder.get(folder) ?? []) {
      if (seen.has(problemId)) continue;
      seen.add(problemId);
      problems.push(problemId);
    }
  }
  return problems;
}
