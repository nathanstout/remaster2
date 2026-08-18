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

export const characterCounterProblem: Problem = {
  id: 'character-counter',
  title: 'Build a Character Counter',
  type: 'web',
  description: [
    'Make the counter live: as the user types in the textarea, the number should always show how many characters the message currently contains.',
    'Listen for the `input` event on the textarea and update the `#count` element from `script.js`.',
    '`index.html` holds the body markup only — the preview supplies the surrounding document, so there is no `<html>` or `<head>` to write.',
    'The styling in `styles.css` is a starting point; change whatever you like. Every edit rebuilds the preview from scratch.',
  ].join('\n\n'),
  files: [
    { id: 'index.html', name: 'index.html', language: 'html', starterCode: html },
    { id: 'styles.css', name: 'styles.css', language: 'css', starterCode: css },
    { id: 'script.js', name: 'script.js', language: 'javascript', starterCode: js },
  ],
};
