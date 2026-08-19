import { traversalProblem } from './shared';

/**
 * Section 1 — Recursion Basics.
 *
 * Three deliberately easy exercises over the same nested-array shape. The point
 * is repetition: the traversal never changes, only what each call does with the
 * answers its children hand back.
 */

const NESTED_SAMPLE = `const values = [1, [2, 3], [[4], 5]];`;

export const countNestedNumbersProblem = traversalProblem({
  id: 'count-nested-numbers',
  title: 'Count Numbers in a Nested Array',
  description: [
    'Implement `countNumbers(values)`, which returns how many numbers appear anywhere inside a nested array.',
    'For example `[1, [2, 3], [[4], 5]]` contains five numbers, so the answer is `5`.',
    'The array holds only numbers and other arrays, nested to any depth. An empty array contains no numbers.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** the simplest recursive decision there is — a value is either something you handle directly (the base case) or something you walk into. Ask yourself what the current value is, and what its children are.",
  ],
  starter: `/**
 * Count how many numbers appear anywhere in a nested array.
 *
 * For this exercise, use a recursive solution.
 */
function countNumbers(values) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${NESTED_SAMPLE}

console.log('count:', countNumbers(values));
console.log('expected:', 5);
`,
  solution: `function countNumbers(values) {
  let count = 0;

  for (const item of values) {
    if (Array.isArray(item)) {
      // A nested array: ask the same question about its contents.
      count += countNumbers(item);
    } else {
      // The base case: a plain number counts as one.
      count += 1;
    }
  }

  return count;
}
`,
  hints: [
    {
      id: 'two-kinds',
      content:
        'Every item you meet is one of two things: a number, or another array. Handle those two cases separately.',
    },
    {
      id: 'recurse-on-arrays',
      content:
        'When the item is an array, the answer for it is the same question asked again — call your own function on it and add whatever it returns.',
    },
  ],
  cases: [
    {
      id: 'flat',
      name: 'Counts a flat array',
      source: `assert.equal(countNumbers([1, 2, 3]), 3);`,
    },
    {
      id: 'empty',
      name: 'Returns 0 for an empty array',
      source: `assert.equal(countNumbers([]), 0);
assert.equal(countNumbers([[], [[]]]), 0);`,
    },
    {
      id: 'nested',
      name: 'Counts numbers at every depth',
      source: `assert.equal(countNumbers([1, [2, 3], [[4], 5]]), 5);`,
    },
    {
      id: 'deep',
      name: 'Handles deep nesting',
      source: `assert.equal(countNumbers([1, [2, [3, [4, [5, [6]]]]]]), 6);`,
    },
  ],
});

export const sumNestedArrayProblem = traversalProblem({
  id: 'sum-nested-array',
  title: 'Sum a Nested Array',
  description: [
    'Implement `sumNested(values)`, which adds up every number anywhere inside a nested array.',
    'For example `sumNested([1, [2, 3], [[4], 5]])` returns `15`.',
    'The array holds only numbers and other arrays. An empty array sums to `0`.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** the same traversal you just wrote, but now each recursive call returns a value you have to combine. Notice how little changes — the shape of the walk is identical, only the combining step is different.",
  ],
  starter: `/**
 * Add up every number anywhere in a nested array.
 *
 * For this exercise, use a recursive solution.
 */
function sumNested(values) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${NESTED_SAMPLE}

console.log('sum:', sumNested(values));
console.log('expected:', 15);
`,
  solution: `function sumNested(values) {
  let total = 0;

  for (const item of values) {
    if (Array.isArray(item)) {
      // The recursive call returns the sum of that whole branch.
      total += sumNested(item);
    } else {
      total += item;
    }
  }

  return total;
}
`,
  hints: [
    {
      id: 'same-shape',
      content:
        'This is the same walk you wrote for counting. Only the thing you accumulate changes.',
    },
    {
      id: 'child-answer',
      content:
        'A recursive call on a nested array gives you the total for that entire branch. Add that total to your running result exactly as you would add a single number.',
    },
  ],
  cases: [
    { id: 'flat', name: 'Sums a flat array', source: `assert.equal(sumNested([1, 2, 3]), 6);` },
    {
      id: 'empty',
      name: 'Returns 0 for empty structures',
      source: `assert.equal(sumNested([]), 0);
assert.equal(sumNested([[], [[]]]), 0);`,
    },
    {
      id: 'nested',
      name: 'Sums numbers at every depth',
      source: `assert.equal(sumNested([1, [2, 3], [[4], 5]]), 15);`,
    },
    {
      id: 'negatives',
      name: 'Handles negative numbers and deep nesting',
      source: `assert.equal(sumNested([1, [-2, [3, [-4]]]]), -2);`,
    },
  ],
});

export const findMaxNestedProblem = traversalProblem({
  id: 'find-max-nested',
  title: 'Find the Largest Number in a Nested Array',
  description: [
    'Implement `findMax(values)`, which returns the largest number anywhere inside a nested array.',
    'For example `findMax([2, [-4, 17], [[8], 3]])` returns `17`.',
    'If the structure contains no numbers at all — `[]` or `[[], []]` — return `-Infinity`, which is the identity value for a maximum.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** combining child answers when the combination is not addition. The walk is unchanged again; you are just deciding which of two answers to keep.",
  ],
  starter: `/**
 * Find the largest number anywhere in a nested array.
 * Return -Infinity when there are no numbers at all.
 *
 * For this exercise, use a recursive solution.
 */
function findMax(values) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
const values = [2, [-4, 17], [[8], 3]];

console.log('max:', findMax(values));
console.log('expected:', 17);
console.log('empty:', findMax([]));
console.log('expected:', -Infinity);
`,
  solution: `function findMax(values) {
  // The identity for a maximum: anything real beats it.
  let largest = -Infinity;

  for (const item of values) {
    // Either the branch's best, or the number itself.
    const candidate = Array.isArray(item) ? findMax(item) : item;

    if (candidate > largest) {
      largest = candidate;
    }
  }

  return largest;
}
`,
  hints: [
    {
      id: 'start-value',
      content:
        'Start from a value that any real number beats, so the first comparison always works. `-Infinity` does that job.',
    },
    {
      id: 'candidate',
      content:
        'For each item you have a candidate: the number itself, or the largest number found inside a nested array. Compare that candidate against your best-so-far.',
    },
  ],
  cases: [
    { id: 'flat', name: 'Finds the max in a flat array', source: `assert.equal(findMax([2, 9, 4]), 9);` },
    {
      id: 'nested',
      name: 'Finds the max at any depth',
      source: `assert.equal(findMax([2, [-4, 17], [[8], 3]]), 17);
assert.equal(findMax([[[42]]]), 42);`,
    },
    {
      id: 'negatives',
      name: 'Works when every number is negative',
      source: `assert.equal(findMax([-7, [-3, [-11]]]), -3);`,
    },
    {
      id: 'empty',
      name: 'Returns -Infinity when there are no numbers',
      source: `assert.equal(findMax([]), -Infinity);
assert.equal(findMax([[], [[]]]), -Infinity);`,
    },
  ],
});
