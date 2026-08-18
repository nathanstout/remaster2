import type { TestSuite } from '../types/evaluation';
import type { Problem } from '../types/problem';

const html = `<div class="character-counter">
  <label for="message">Message</label>
  <textarea id="message" rows="4" placeholder="Start typing…"></textarea>

  <p class="status">
    <span id="count">0</span> characters
  </p>
</div>
`;

const css = `.character-counter {
  max-width: 32rem;
  display: grid;
  gap: 0.5rem;
}

label {
  font-weight: 600;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #c9ced8;
  border-radius: 6px;
  font: inherit;
  resize: vertical;
}

.status {
  margin: 0;
  color: #6b7280;
}

/* TODO: make the count stand out once it updates. */
#count {
  font-weight: 700;
}
`;

const js = `const textarea = document.querySelector('#message');
const count = document.querySelector('#count');

// Add the behaviour here: keep the number in sync with what is typed.
// Hint: listen for the textarea's 'input' event.

console.log('character counter loaded');
`;

const tests: TestSuite = {
  cases: [
    {
      id: 'starts-at-zero',
      name: 'Starts at 0 characters',
      source: `const count = document.querySelector('#count');
assert.ok(count, 'No #count element was found in the page');
assert.equal(count.textContent.trim(), '0');`,
    },
    {
      id: 'counts-typed-text',
      name: 'Updates the count as the user types',
      source: `const textarea = document.querySelector('#message');
const count = document.querySelector('#count');
assert.ok(textarea, 'No #message textarea was found in the page');

textarea.value = 'hello';
textarea.dispatchEvent(new Event('input', { bubbles: true }));

await waitFor(() => count.textContent.trim() === '5', {
  message: 'The count did not update to 5 after typing "hello"',
});`,
    },
    {
      id: 'updates-again-on-change',
      name: 'Keeps the count in sync when the text changes again',
      source: `const textarea = document.querySelector('#message');
const count = document.querySelector('#count');

textarea.value = 'hello';
textarea.dispatchEvent(new Event('input', { bubbles: true }));
await waitFor(() => count.textContent.trim() === '5');

textarea.value = 'hi';
textarea.dispatchEvent(new Event('input', { bubbles: true }));

await waitFor(() => count.textContent.trim() === '2', {
  message: 'The count did not fall to 2 after shortening the message',
});`,
    },
  ],
};

const hints = [
  {
    id: 'which-event',
    content:
      'The `input` event fires on every keystroke, paste and deletion. `change` only fires when the field loses focus, which is too late here.',
  },
  {
    id: 'read-and-write',
    content:
      'The current text is `textarea.value`, and its length is what you want to display. Write it into the `#count` element with `textContent`.',
  },
  {
    id: 'put-it-together',
    content:
      'Add one listener: `textarea.addEventListener("input", () => { count.textContent = textarea.value.length; })`.',
  },
];

const solution = {
  files: {
    'index.html': `<div class="character-counter">
  <label for="message">Message</label>
  <textarea id="message" rows="4" placeholder="Start typing\u2026"></textarea>

  <p class="status">
    <span id="count">0</span> characters
  </p>
</div>
`,
    'styles.css': `.character-counter {
  max-width: 32rem;
  display: grid;
  gap: 0.5rem;
}

label {
  font-weight: 600;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #c9ced8;
  border-radius: 6px;
  font: inherit;
  resize: vertical;
}

.status {
  margin: 0;
  color: #6b7280;
}

#count {
  font-weight: 700;
  color: #1d4ed8;
}
`,
    'script.js': `const textarea = document.querySelector('#message');
const count = document.querySelector('#count');

textarea.addEventListener('input', () => {
  count.textContent = textarea.value.length;
});
`,
  },
};

export const characterCounterProblem: Problem = {
  id: 'character-counter',
  version: 1,
  title: 'Build a Character Counter',
  type: 'web',
  description: [
    'Make the counter live: as the user types in the textarea, the number should always show how many characters the message currently contains.',
    'Listen for the `input` event on the textarea and update the `#count` element from `script.js`.',
    '`index.html` holds the body markup only — the preview supplies the surrounding document, so there is no `<html>` or `<head>` to write.',
    'The styling in `styles.css` is a starting point; change whatever you like. Every edit rebuilds the preview from scratch.',
  ].join('\n\n'),
  tests,
  hints,
  solution,
  files: [
    { id: 'index.html', name: 'index.html', language: 'html', starterCode: html },
    { id: 'styles.css', name: 'styles.css', language: 'css', starterCode: css },
    { id: 'script.js', name: 'script.js', language: 'javascript', starterCode: js },
  ],
};
