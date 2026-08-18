import type { TestSuite } from '../types/evaluation';
import type { Problem } from '../types/problem';

const starterCode = `/**
 * Implement Array.prototype.myMap.
 *
 * Edit the code below — it re-runs automatically a moment after you stop
 * typing, in a fresh sandbox each time.
 */
Array.prototype.myMap = function (callback, thisArg) {
  // Write your implementation here.
  // Hint: build a new array; do not mutate the one you are iterating.
  return this;
};

/* ------------------------------------------------------------------ */
/* Runner — feel free to change any of this while you experiment.      */
/* ------------------------------------------------------------------ */

const numbers = [1, 2, 3];

console.log('doubled:', numbers.myMap((number) => number * 2));
console.log('expected:', [2, 4, 6]);

// The callback receives (value, index, array).
console.log('with index:', ['a', 'b'].myMap((letter, index) => index + ':' + letter));
console.log('expected:', ['0:a', '1:b']);

// The original array must be left alone.
console.log('original untouched:', numbers);

// Holes are skipped by map, but they stay holes in the result.
const sparse = [1, , 3];
console.log('sparse:', sparse.myMap((n) => n * 10));
`;

const tests: TestSuite = {
  cases: [
    {
      id: 'transforms-values',
      name: 'Transforms every value',
      source: `assert.deepEqual([1, 2, 3].myMap((x) => x * 2), [2, 4, 6]);`,
    },
    {
      id: 'callback-arguments',
      name: 'Passes value, index and array to the callback',
      source: `const calls = [];
const input = ['a', 'b'];
input.myMap((value, index, array) => { calls.push([value, index, array === input]); });

assert.deepEqual(calls, [['a', 0, true], ['b', 1, true]]);`,
    },
    {
      id: 'returns-new-array',
      name: 'Returns a new array and leaves the original alone',
      source: `const input = [1, 2, 3];
const result = input.myMap((x) => x * 10);

assert.deepEqual(input, [1, 2, 3], 'the original array was modified');
assert.ok(result !== input, 'myMap returned the same array instead of a new one');
assert.deepEqual(result, [10, 20, 30]);`,
    },
    {
      id: 'respects-this-arg',
      name: 'Uses thisArg as `this` inside the callback',
      source: `const context = { factor: 3 };
const result = [1, 2].myMap(function (value) { return value * this.factor; }, context);

assert.deepEqual(result, [3, 6]);`,
    },
  ],
};

const hints = [
  {
    id: 'this-is-the-array',
    content:
      'Inside a method on `Array.prototype`, `this` is the array the method was called on. Read its `length` and its indexes from there.',
  },
  {
    id: 'build-a-new-array',
    content:
      'Never write into `this`. Build a separate array and return it, so the original stays exactly as it was.',
  },
  {
    id: 'callback-signature',
    content:
      'Call the callback as `callback.call(thisArg, this[i], i, this)` — value, index and the array itself, with `thisArg` as `this`.',
  },
];

const solution = {
  files: {
    'solution.js': `Array.prototype.myMap = function (callback, thisArg) {
  const result = [];

  for (let index = 0; index < this.length; index += 1) {
    // Skip holes, exactly as the built-in map does, but keep the slot.
    if (index in this) {
      result[index] = callback.call(thisArg, this[index], index, this);
    }
  }

  return result;
};
`,
  },
};

export const myMapProblem: Problem = {
  id: 'my-map',
  version: 1,
  title: 'Implement myMap',
  type: 'javascript',
  description: [
    'Implement `Array.prototype.myMap(callback, thisArg)` so that it behaves like the built-in `Array.prototype.map`.',
    'It should return a new array containing the result of calling `callback` on every element, leaving the original array untouched.',
    'The callback is invoked with three arguments: the current value, its index, and the array being traversed. If `thisArg` is provided, it becomes `this` inside the callback.',
    'The runner below prints each result next to the value the real `map` would produce.',
  ].join('\n\n'),
  tests,
  hints,
  solution,
  files: [
    {
      id: 'solution.js',
      name: 'solution.js',
      language: 'javascript',
      starterCode,
    },
  ],
};
