import type { Taxonomy } from './types';

/**
 * Structural checks on source-controlled taxonomy data.
 *
 * The taxonomy is hand-written, so the realistic failure mode is a typo: a
 * placement pointing at a folder that was renamed away, or a problem that was
 * added to the catalogue but never filed. Catching those loudly during
 * development beats rendering a tree that quietly omits an exercise.
 */
export function validateTaxonomy(taxonomy: Taxonomy, knownProblemIds: string[]): string[] {
  const issues: string[] = [];
  const folderIds = new Set<string>();

  for (const folder of taxonomy.folders) {
    if (folderIds.has(folder.id)) issues.push(`Duplicate folder id "${folder.id}".`);
    folderIds.add(folder.id);
    if (folder.parentId === folder.id) issues.push(`Folder "${folder.id}" is its own parent.`);
  }

  for (const folder of taxonomy.folders) {
    if (folder.parentId !== null && !folderIds.has(folder.parentId)) {
      issues.push(`Folder "${folder.id}" has unknown parent "${folder.parentId}".`);
    }
  }

  // Walk each chain to the root; revisiting a folder means a cycle.
  const byId = new Map(taxonomy.folders.map((folder) => [folder.id, folder]));
  for (const folder of taxonomy.folders) {
    const seen = new Set<string>([folder.id]);
    let current = folder.parentId;
    while (current !== null) {
      if (seen.has(current)) {
        issues.push(`Folder "${folder.id}" is part of a parent cycle.`);
        break;
      }
      seen.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
  }

  const known = new Set(knownProblemIds);
  const placed = new Set<string>();
  for (const placement of taxonomy.placements) {
    if (placed.has(placement.problemId)) {
      issues.push(`Problem "${placement.problemId}" is placed more than once.`);
    }
    placed.add(placement.problemId);

    if (!folderIds.has(placement.folderId)) {
      issues.push(
        `Placement for "${placement.problemId}" references unknown folder "${placement.folderId}".`,
      );
    }
    if (!known.has(placement.problemId)) {
      issues.push(`Placement references unknown problem "${placement.problemId}".`);
    }
  }

  for (const problemId of knownProblemIds) {
    if (!placed.has(problemId)) issues.push(`Problem "${problemId}" has no folder placement.`);
  }

  return issues;
}

/**
 * Fails loudly in development, and stays out of the way in a build.
 *
 * A broken taxonomy in development is a typo to fix now; in a production build
 * the tree simply renders whatever is valid rather than white-screening.
 */
export function assertValidTaxonomy(taxonomy: Taxonomy, knownProblemIds: string[]): void {
  const issues = validateTaxonomy(taxonomy, knownProblemIds);
  if (issues.length === 0) return;

  const report = `Invalid taxonomy:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`;
  if (import.meta.env.DEV) throw new Error(report);
  console.error(report);
}
