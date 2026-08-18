import type { Problem } from '../types/problem';

const starterCode = `/**
 * Implement debounce(fn, delay).
 *
 * Edit the code below — it re-runs automatically a moment after you stop
 * typing, in a fresh sandbox each time.
 */
function debounce(fn, delay) {
  // Write your implementation here.
  // Hint: remember the pending timer id between calls.
  return function (...args) {
    fn.apply(this, args);
  };
}

/* ------------------------------------------------------------------ */
/* Runner — feel free to change any of this while you experiment.      */
/* ------------------------------------------------------------------ */

let callCount = 0;
const save = debounce((value) => {
  callCount += 1;
  console.log('saved:', value, '(call #' + callCount + ')');
}, 100);

// A burst of typing: only the last value should ever be saved.
save('h');
save('he');
save('hel');
save('hell');
save('hello');

setTimeout(() => {
  console.log('--- burst finished ---');
  console.log('times fn actually ran:', callCount);
  console.log('expected:', 1);

  // A second, separate burst after the delay has elapsed.
  save('world');
}, 300);

setTimeout(() => {
  console.log('--- after second burst ---');
  console.log('times fn actually ran:', callCount);
  console.log('expected:', 2);
}, 600);
`;

export const debounceProblem: Problem = {
  id: 'debounce',
  title: 'Implement debounce',
  type: 'javascript',
  description: [
    'Write a `debounce(fn, delay)` helper: it returns a wrapped function that postpones calling `fn` until `delay` milliseconds have passed without another call.',
    'Every new call should cancel the previously scheduled one, so a rapid burst of calls results in exactly one invocation — with the arguments from the most recent call.',
    'The wrapper should forward both its arguments and its `this` value to `fn`.',
    'The runner below fires a burst of calls and reports how many times `fn` actually ran. The starter implementation is not debounced at all, so it runs five times — fix it so the counts match the expected values.',
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
