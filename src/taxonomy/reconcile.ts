import { getDescendantFolders } from './queries';
import type { ProblemFolder, ProblemPlacement, Taxonomy } from './types';
import { validateTaxonomy } from './validation';

/**
 * Brings a persisted taxonomy back into agreement with the current catalogue.
 *
 * The catalogue keeps growing, so a taxonomy saved months ago must not make new
 * problems invisible — but neither should a catalogue change discard the user's
 * organization. The bias throughout is to preserve user structure and repair
 * only what is actually broken.
 */
export function reconcileTaxonomy(
  persisted: Taxonomy | null,
  defaults: Taxonomy,
  knownProblemIds: string[],
): Taxonomy {
  if (!persisted) return cloneTaxonomy(defaults);

  const folders = normalizeFolders(persisted.folders);
  const placements = normalizePlacements(persisted.placements, folders, knownProblemIds);

  // Anything the catalogue knows about but the saved taxonomy does not gets its
  // source-controlled home — recreating just enough default structure to hold it.
  const placed = new Set(placements.map((placement) => placement.problemId));
  for (const problemId of knownProblemIds) {
    if (placed.has(problemId)) continue;
    const folderId = ensureDefaultHome(problemId, folders, defaults);
    placements.push({ problemId, folderId });
    placed.add(problemId);
  }

  const reconciled: Taxonomy = { folders, placements };

  // Repair is best-effort; if the result still does not hold together, a clean
  // default tree beats a subtly broken one.
  if (validateTaxonomy(reconciled, knownProblemIds).length > 0) {
    return cloneTaxonomy(defaults);
  }
  return reconciled;
}

function cloneTaxonomy(taxonomy: Taxonomy): Taxonomy {
  return {
    folders: taxonomy.folders.map((folder) => ({ ...folder })),
    placements: taxonomy.placements.map((placement) => ({ ...placement })),
  };
}

/**
 * Drops duplicate ids and detaches folders whose parent is missing or cyclic.
 *
 * Promoting a broken folder to the root keeps the user's folder and its contents
 * rather than deleting a branch because one link went bad.
 */
function normalizeFolders(input: ProblemFolder[]): ProblemFolder[] {
  const byId = new Map<string, ProblemFolder>();
  for (const folder of input) {
    if (!folder || typeof folder.id !== 'string' || typeof folder.name !== 'string') continue;
    if (byId.has(folder.id)) continue;
    byId.set(folder.id, { ...folder });
  }

  for (const folder of byId.values()) {
    if (folder.parentId === null) continue;
    if (folder.parentId === folder.id || !byId.has(folder.parentId)) {
      folder.parentId = null;
      continue;
    }
    // Walk to the root; revisiting this folder means the chain loops.
    const seen = new Set<string>([folder.id]);
    let current: string | null = folder.parentId;
    while (current !== null) {
      if (seen.has(current)) {
        folder.parentId = null;
        break;
      }
      seen.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
  }

  return [...byId.values()];
}

/** Keeps exactly one placement per known problem, pointing at a folder that exists. */
function normalizePlacements(
  input: ProblemPlacement[],
  folders: ProblemFolder[],
  knownProblemIds: string[],
): ProblemPlacement[] {
  const folderIds = new Set(folders.map((folder) => folder.id));
  const known = new Set(knownProblemIds);
  const seen = new Set<string>();
  const placements: ProblemPlacement[] = [];

  for (const placement of input) {
    if (!placement || typeof placement.problemId !== 'string') continue;
    // A problem that left the catalogue takes its placement with it.
    if (!known.has(placement.problemId)) continue;
    if (!folderIds.has(placement.folderId)) continue;
    if (seen.has(placement.problemId)) continue;
    seen.add(placement.problemId);
    placements.push({ ...placement });
  }

  return placements;
}

/**
 * Makes sure a problem's default folder exists, recreating the smallest chain
 * of default ancestors needed — with their original stable ids, so a folder the
 * user later renames or moves keeps its identity.
 *
 * Only folders required to place something are recreated: a default folder the
 * user deliberately deleted stays deleted until a problem needs it again.
 */
function ensureDefaultHome(
  problemId: string,
  folders: ProblemFolder[],
  defaults: Taxonomy,
): string {
  const existing = new Set(folders.map((folder) => folder.id));
  const defaultsById = new Map(defaults.folders.map((folder) => [folder.id, folder]));
  const defaultPlacement = defaults.placements.find((p) => p.problemId === problemId);

  const targetId = defaultPlacement?.folderId ?? defaults.folders.find((f) => f.parentId === null)?.id;
  if (!targetId) {
    // No default structure at all to fall back on; keep the tree valid anyway.
    const fallback: ProblemFolder = { id: 'unsorted', name: 'Unsorted', parentId: null };
    if (!existing.has(fallback.id)) folders.push(fallback);
    return fallback.id;
  }

  // Collect the chain from the target up to a root, then create it top-down.
  const chain: ProblemFolder[] = [];
  const seen = new Set<string>();
  let current: string | null = targetId;
  while (current !== null && !existing.has(current) && !seen.has(current)) {
    seen.add(current);
    const definition = defaultsById.get(current);
    if (!definition) break;
    chain.unshift(definition);
    current = definition.parentId;
  }

  for (const definition of chain) {
    folders.push({ ...definition });
    existing.add(definition.id);
  }

  // If the chain could not be rebuilt (target absent from defaults too), fall
  // back to any existing root so the problem still appears somewhere.
  if (!existing.has(targetId)) {
    const root = folders.find((folder) => folder.parentId === null);
    if (root) return root.id;
    const fallback: ProblemFolder = { id: 'unsorted', name: 'Unsorted', parentId: null };
    folders.push(fallback);
    return fallback.id;
  }
  return targetId;
}

/** Re-exported for callers that want the descendant check without the barrel. */
export { getDescendantFolders };
