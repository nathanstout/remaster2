import type { TestSuite } from '../types/evaluation';
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

const tests: TestSuite = {
  cases: [
    {
      id: 'collapses-rapid-calls',
      name: 'Collapses a burst of calls into one',
      source: `let count = 0;
const save = debounce(() => { count += 1; }, 30);

save();
save();
save();

await sleep(80);
assert.equal(count, 1);`,
    },
    {
      id: 'uses-latest-arguments',
      name: 'Calls through with the most recent arguments',
      source: `let received;
const save = debounce((value) => { received = value; }, 30);

save('first');
save('second');

await sleep(80);
assert.equal(received, 'second');`,
    },
    {
      id: 'waits-for-the-delay',
      name: 'Waits for the delay before running',
      source: `let called = false;
const save = debounce(() => { called = true; }, 60);

save();
await sleep(20);
assert.equal(called, false, 'fn ran before the delay had elapsed');

await sleep(80);
assert.equal(called, true, 'fn never ran after the delay');`,
    },
    {
      id: 'runs-again-after-quiet-period',
      name: 'Runs again for a later, separate burst',
      source: `let count = 0;
const save = debounce(() => { count += 1; }, 30);

save();
await sleep(80);
save();
await sleep(80);

assert.equal(count, 2);`,
    },
  ],
};

export const debounceProblem: Problem = {
  id: 'debounce',
  version: 1,
  title: 'Implement debounce',
  type: 'javascript',
  description: [
    'Write a `debounce(fn, delay)` helper: it returns a wrapped function that postpones calling `fn` until `delay` milliseconds have passed without another call.',
    'Every new call should cancel the previously scheduled one, so a rapid burst of calls results in exactly one invocation — with the arguments from the most recent call.',
    'The wrapper should forward both its arguments and its `this` value to `fn`.',
    'The runner below fires a burst of calls and reports how many times `fn` actually ran. The starter implementation is not debounced at all, so it runs five times — fix it so the counts match the expected values.',
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
