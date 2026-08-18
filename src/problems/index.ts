import type { Problem } from '../types/problem';
import { counterProblem } from './counter';
import { debounceProblem } from './debounce';
import { flattenObjectProblem } from './flattenObject';
import { myMapProblem } from './myMap';

/**
 * The problem catalogue. Local data for now; the accessors below are the seam
 * where real API calls go later.
 */
const catalogue: Problem[] = [debounceProblem, myMapProblem, flattenObjectProblem, counterProblem];

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
