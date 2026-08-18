import { Fragment } from 'react';
import type { Problem } from '../../types/problem';

interface ProblemPanelProps {
  problem: Problem;
}

/** Renders `inline code` spans; everything else is plain text. */
function renderParagraph(text: string) {
  return text.split('`').map((chunk, index) =>
    index % 2 === 1 ? <code key={index}>{chunk}</code> : <Fragment key={index}>{chunk}</Fragment>,
  );
}

/** Renders the problem statement. Plain paragraphs — no markdown engine yet. */
export function ProblemPanel({ problem }: ProblemPanelProps) {
  return (
    <header className="problem">
      <h1>{problem.title}</h1>
      {problem.description.split('\n\n').map((paragraph, index) => (
        <p key={index}>{renderParagraph(paragraph)}</p>
      ))}
    </header>
  );
}
