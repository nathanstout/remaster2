import type { TestSuite } from '../types/evaluation';
import type { Problem } from '../types/problem';

const starterCode = `import { useState } from 'react';

/**
 * Build a counter.
 *
 * Edit the code below — it re-renders automatically a moment after you stop
 * typing, in a completely fresh preview each time.
 */
export default function App() {
  return (
    <button>
      Count: 0
    </button>
  );
}
`;

const findButton = `await waitFor(() => document.querySelector('button'), {
  message: 'No button was rendered by your component',
});
const button = document.querySelector('button');`;

const tests: TestSuite = {
  cases: [
    {
      id: 'renders-a-button-at-zero',
      name: 'Renders a button starting at 0',
      source: `${findButton}
assert.includes(button.textContent, '0');`,
    },
    {
      id: 'increments-on-click',
      name: 'Increments when clicked',
      source: `${findButton}
button.click();

await waitFor(() => button.textContent.includes('1'), {
  message: 'The button never showed a count of 1 after one click',
});`,
    },
    {
      id: 'handles-multiple-clicks',
      name: 'Keeps counting across several clicks',
      source: `${findButton}
button.click();
await waitFor(() => button.textContent.includes('1'));
button.click();
await waitFor(() => button.textContent.includes('2'));
button.click();

await waitFor(() => button.textContent.includes('3'), {
  message: 'The button never reached a count of 3 after three clicks',
});`,
    },
  ],
};

export const counterProblem: Problem = {
  id: 'counter',
  title: 'Build a Counter',
  type: 'react',
  description: [
    'Turn the button below into a working counter: clicking it should increase the number it displays by one.',
    'Use the `useState` hook (already imported) to hold the count, and an `onClick` handler to update it.',
    'The component you export as the default export is what gets rendered in the preview — you do not need to call `createRoot` yourself.',
    'Anything you `console.log` from module scope, from render, or from an event handler shows up in the console below.',
  ].join('\n\n'),
  tests,
  files: [
    {
      id: 'App.tsx',
      name: 'App.tsx',
      language: 'typescript',
      starterCode,
    },
  ],
};
