import type { TestSuite } from '../types/evaluation';
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

const tests: TestSuite = {
  cases: [
    {
      id: 'flattens-nested-properties',
      name: 'Flattens nested properties into dotted keys',
      source: `const result = flattenObject({
  user: { name: 'Nathan', address: { city: 'Raleigh' } },
});

assert.deepEqual(result, {
  'user.name': 'Nathan',
  'user.address.city': 'Raleigh',
});`,
    },
    {
      id: 'handles-multiple-branches',
      name: 'Handles sibling branches at several depths',
      source: `const result = flattenObject({
  a: { b: 1, c: { d: 2, e: 3 } },
  f: { g: { h: 4 } },
});

assert.deepEqual(result, {
  'a.b': 1,
  'a.c.d': 2,
  'a.c.e': 3,
  'f.g.h': 4,
});`,
    },
    {
      id: 'keeps-flat-objects-unchanged',
      name: 'Leaves an already-flat object unchanged',
      source: `assert.deepEqual(flattenObject({ active: true, count: 2 }), { active: true, count: 2 });`,
    },
    {
      id: 'treats-arrays-and-null-as-values',
      name: 'Treats arrays and null as leaf values',
      source: `const result = flattenObject({ tags: ['a', 'b'], meta: null, user: { id: 1 } });

assert.deepEqual(result, { tags: ['a', 'b'], meta: null, 'user.id': 1 });`,
    },
  ],
};

export const flattenObjectProblem: Problem = {
  id: 'flatten-object',
  version: 1,
  title: 'Flatten a nested object',
  type: 'javascript',
  description: [
    'Implement `flattenObject(object)`, which turns a nested object into a flat one whose keys are dot-separated paths to each leaf value.',
    'For example `{ user: { name: "Nathan", address: { city: "Raleigh" } } }` becomes `{ "user.name": "Nathan", "user.address.city": "Raleigh" }`.',
    'Only plain nested objects should be descended into. Treat arrays, `null`, and primitives as leaf values and keep them as-is.',
    'Decide for yourself what an empty nested object should do — the runner prints that case so you can see the effect of your choice.',
  ].join('\n\n'),
  tests,
  files: [
    {
      id: 'solution.js',
      name: 'solution.js',
      language: 'javascript',
      starterCode,
    },
  ],
};
