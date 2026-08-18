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

export const myMapProblem: Problem = {
  id: 'my-map',
  title: 'Implement myMap',
  type: 'javascript',
  description: [
    'Implement `Array.prototype.myMap(callback, thisArg)` so that it behaves like the built-in `Array.prototype.map`.',
    'It should return a new array containing the result of calling `callback` on every element, leaving the original array untouched.',
    'The callback is invoked with three arguments: the current value, its index, and the array being traversed. If `thisArg` is provided, it becomes `this` inside the callback.',
    'The runner below prints each result next to the value the real `map` would produce.',
  ].join('\n\n'),
  files: [
    {
      id: 'solution.js',
      name: 'solution.js',
      language: 'javascript',
      starterCode,
    },
  ],
};
