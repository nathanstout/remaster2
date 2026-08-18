import type { Problem } from '../types/problem';
import { characterCounterProblem } from './characterCounter';
import { counterProblem } from './counter';
import { debounceProblem } from './debounce';
import { flattenObjectProblem } from './flattenObject';
import { myMapProblem } from './myMap';

/**
 * The problem catalogue. Local data for now; the accessors below are the seam
 * where real API calls go later.
 */
const catalogue: Problem[] = [
  debounceProblem,
  myMapProblem,
  flattenObjectProblem,
  counterProblem,
  characterCounterProblem,
];

const byId: Record<string, Problem> = Object.fromEntries(
  catalogue.map((problem) => [problem.id, problem]),
);

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
