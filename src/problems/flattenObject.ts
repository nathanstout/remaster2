import type { Problem } from '../types/problem';

const starterCode = `/**
 * Implement flattenObject(object).
 *
 * Edit the code below — it re-runs automatically a moment after you stop
 * typing, in a fresh sandbox each time.
 */
function flattenObject(object) {
  // Write your implementation here.
  // Hint: recurse, carrying the key path built so far.
  return object;
}

/* ------------------------------------------------------------------ */
/* Runner — feel free to change any of this while you experiment.      */
/* ------------------------------------------------------------------ */

const input = {
  user: {
    name: 'Nathan',
    address: {
      city: 'Raleigh',
      zip: 27601,
    },
  },
  active: true,
};

console.log('flattened:', flattenObject(input));
console.log('expected:', {
  'user.name': 'Nathan',
  'user.address.city': 'Raleigh',
  'user.address.zip': 27601,
  active: true,
});

// Arrays and null are values, not objects to descend into.
console.log('edge cases:', flattenObject({ tags: ['a', 'b'], meta: null, empty: {} }));
`;

export const flattenObjectProblem: Problem = {
  id: 'flatten-object',
  title: 'Flatten a nested object',
  type: 'javascript',
  description: [
    'Implement `flattenObject(object)`, which turns a nested object into a flat one whose keys are dot-separated paths to each leaf value.',
    'For example `{ user: { name: "Nathan", address: { city: "Raleigh" } } }` becomes `{ "user.name": "Nathan", "user.address.city": "Raleigh" }`.',
    'Only plain nested objects should be descended into. Treat arrays, `null`, and primitives as leaf values and keep them as-is.',
    'Decide for yourself what an empty nested object should do — the runner prints that case so you can see the effect of your choice.',
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
