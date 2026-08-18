/**
 * Problem *organization*, kept deliberately separate from problem *content*.
 *
 * The catalogue owns what an exercise is; the taxonomy owns where it appears.
 * Keeping them apart is what lets Phase 7B make folders mutable without
 * touching problem definitions, drafts, or URLs.
 */

export interface ProblemFolder {
  /** Stable identity. Never derived from the name, and never renamed. */
  id: string;
  /** Presentation only. Free to change without affecting anything else. */
  name: string;
  /** null for a root folder. */
  parentId: string | null;
}

/** Where one problem lives. Exactly one placement per problem. */
export interface ProblemPlacement {
  problemId: string;
  folderId: string;
}

/**
 * Flat relational data, not a nested tree.
 *
 * Nesting is derived for rendering. Storing it flat keeps moves and renames in
 * Phase 7B to single-record edits rather than tree surgery.
 */
export interface Taxonomy {
  folders: ProblemFolder[];
  placements: ProblemPlacement[];
}
