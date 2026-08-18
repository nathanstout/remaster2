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
  files: [
    {
      id: 'App.tsx',
      name: 'App.tsx',
      language: 'typescript',
      starterCode,
    },
  ],
};
