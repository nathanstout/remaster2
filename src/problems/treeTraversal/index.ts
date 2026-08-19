import type { Problem } from '../../types/problem';
import { flattenObjectProblem } from '../flattenObject';
import {
  countNestedNumbersProblem,
  findMaxNestedProblem,
  sumNestedArrayProblem,
} from './section1';
import {
  collectTreeValuesProblem,
  countTreeNodesProblem,
  findNodeByIdProblem,
  treeContainsValueProblem,
} from './section2';
import {
  findPathToNodeProblem,
  maxTreeDepthProblem,
  rootToLeafPathsProblem,
  valuesAtDepthProblem,
} from './section3';
import {
  flattenDepthProblem,
  flattenEmployeesProblem,
  flattenNestedArrayProblem,
  listFilePathsProblem,
  managementChainProblem,
} from './section4';
import {
  filterTreePreservingPathsProblem,
  mapTreeProblem,
  removeNodesProblem,
} from './section5';

export * from './section1';
export * from './section2';
export * from './section3';
export * from './section4';
export * from './section5';

/**
 * The study plan in teaching order.
 *
 * The order is the curriculum: each problem assumes the recursion practised by
 * the ones before it. Nothing enforces it — a problem can be opened at any time
 * — but the taxonomy places them in this sequence so the intended path is the
 * obvious one.
 *
 * `flatten-object` already existed and belongs at step 14, so it is reused here
 * by reference rather than rewritten; its id, history and health carry over.
 */
export const treeTraversalPlan: Problem[] = [
  // 1 — Recursion Basics: nested arrays of numbers.
  countNestedNumbersProblem,
  sumNestedArrayProblem,
  findMaxNestedProblem,

  // 2 — Traversing and Collecting: the { value, children } tree.
  countTreeNodesProblem,
  collectTreeValuesProblem,
  treeContainsValueProblem,
  findNodeByIdProblem,

  // 3 — Paths, Depth and Context: carrying state down, building answers up.
  maxTreeDepthProblem,
  valuesAtDepthProblem,
  findPathToNodeProblem,
  rootToLeafPathsProblem,

  // 4 — Real-World Nested Data.
  flattenNestedArrayProblem,
  flattenDepthProblem,
  flattenObjectProblem,
  flattenEmployeesProblem,
  managementChainProblem,
  listFilePathsProblem,

  // 5 — Tree Transformations: building a new tree instead of reading one.
  mapTreeProblem,
  removeNodesProblem,
  filterTreePreservingPathsProblem,
];
