import { Fragment, type ReactNode } from 'react';
import type { Problem } from '../../types/problem';

interface ProblemPanelProps {
  problem: Problem;
  /** Attempt-level controls, shown alongside the title. */
  actions?: ReactNode;
}

/** Renders `inline code` spans; everything else is plain text. */
function renderParagraph(text: string) {
  return text.split('`').map((chunk, index) =>
    index % 2 === 1 ? <code key={index}>{chunk}</code> : <Fragment key={index}>{chunk}</Fragment>,
  );
}

/** Renders the problem statement. Plain paragraphs — no markdown engine yet. */
export function ProblemPanel({ problem, actions }: ProblemPanelProps) {
  return (
    <header className="problem">
      <div className="problem-heading">
        <h1>{problem.title}</h1>
        {actions}
      </div>
      {problem.description.split('\n\n').map((paragraph, index) => (
        <p key={index}>{renderParagraph(paragraph)}</p>
      ))}
    </header>
  );
}
