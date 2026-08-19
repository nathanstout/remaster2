import type { TestCase } from '../../types/evaluation';
import type { Problem, ProblemHint } from '../../types/problem';

/**
 * Builds one study-plan problem.
 *
 * Every exercise in this plan has the same shape — a single JavaScript file, a
 * behavioural suite, progressive hints and a recursive reference solution — so
 * the differences between them stay in the teaching content rather than in
 * boilerplate.
 */
export function traversalProblem(config: {
  id: string;
  title: string;
  /** Paragraphs; the last one is conventionally "What you're practicing". */
  description: string[];
  starter: string;
  solution: string;
  hints: ProblemHint[];
  cases: TestCase[];
}): Problem {
  return {
    id: config.id,
    version: 1,
    title: config.title,
    type: 'javascript',
    description: config.description.join('\n\n'),
    hints: config.hints,
    solution: { files: { 'solution.js': config.solution } },
    tests: { cases: config.cases },
    files: [
      {
        id: 'solution.js',
        name: 'solution.js',
        language: 'javascript',
        starterCode: config.starter,
      },
    ],
  };
}

/**
 * The generic tree fixture shared by several exercises, as source text.
 *
 * Reusing one shape across consecutive problems is deliberate: the data stops
 * being the puzzle, so what changes between exercises is only the traversal.
 */
export const SAMPLE_TREE = `const tree = {
  value: 'A',
  children: [
    { value: 'B', children: [] },
    {
      value: 'C',
      children: [{ value: 'D', children: [] }],
    },
  ],
};`;

/** The same shape the tests build, for use inside test sources. */
export const TEST_TREE = `const tree = {
  value: 'A',
  children: [
    { value: 'B', children: [] },
    { value: 'C', children: [{ value: 'D', children: [] }] },
  ],
};`;
