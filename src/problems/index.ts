import type { Problem } from '../types/problem';
import { characterCounterProblem } from './characterCounter';
import { counterProblem } from './counter';
import { debounceProblem } from './debounce';
import { myMapProblem } from './myMap';
import { treeTraversalPlan } from './treeTraversal';

/**
 * The problem catalogue. Local data for now; the accessors below are the seam
 * where real API calls go later.
 */
const catalogue: Problem[] = [
  debounceProblem,
  myMapProblem,
  counterProblem,
  characterCounterProblem,
  // The study plan carries its own teaching order, including `flatten-object`,
  // which it reuses rather than duplicating — so that problem is not listed
  // separately above.
  ...treeTraversalPlan,
];

const byId: Record<string, Problem> = Object.fromEntries(
  catalogue.map((problem) => [problem.id, problem]),
);

// The catalogue is assembled from several sources now, and a duplicated id
// would quietly shadow one problem with another rather than fail. Ids are the
// key for drafts, records and placements, so the collision has to be loud.
if (Object.keys(byId).length !== catalogue.length) {
  const seen = new Set<string>();
  const duplicates = catalogue.map((p) => p.id).filter((id) => !seen.add(id));
  throw new Error(`Duplicate problem id(s) in the catalogue: ${duplicates.join(', ')}`);
}

export const DEFAULT_PROBLEM_ID = catalogue[0].id;

/** Ordered list, as shown in the problem selector. */
export function listProblems(): Problem[] {
  return catalogue;
}

export function getProblem(id: string): Problem | undefined {
  return byId[id];
}

/** The problem's untouched source, keyed by file id. */
export function starterFiles(problem: Problem): Record<string, string> {
  return Object.fromEntries(problem.files.map((file) => [file.id, file.starterCode]));
}

/** True when nothing has been attempted yet — every file is still the starter. */
export function matchesStarter(problem: Problem, files: Record<string, string>): boolean {
  return problem.files.every((file) => files[file.id] === file.starterCode);
}
