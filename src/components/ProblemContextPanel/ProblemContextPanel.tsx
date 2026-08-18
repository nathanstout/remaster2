import { Fragment, type ReactNode } from 'react';
import type { Problem } from '../../types/problem';

interface ProblemContextPanelProps {
  problem: Problem;
  /** Compact health reading, shown beside the title. */
  health?: ReactNode;
  /** Hints and textbook-solution controls. */
  assistance?: ReactNode;
  /** Submit / Finish / Reset, kept out of the coding area. */
  actions?: ReactNode;
}

/** Renders `inline code` spans; everything else is plain text. */
function renderParagraph(text: string) {
  return text.split('`').map((chunk, index) =>
    index % 2 === 1 ? <code key={index}>{chunk}</code> : <Fragment key={index}>{chunk}</Fragment>,
  );
}

/**
 * The persistent reference column for the current exercise.
 *
 * Everything you consult while coding — the statement, the hints, the way out —
 * lives here beside the editor rather than above it, so a long description or a
 * fully revealed hint list costs reading width, never editor height. The column
 * scrolls on its own for the same reason.
 */
export function ProblemContextPanel({
  problem,
  health,
  assistance,
  actions,
}: ProblemContextPanelProps) {
  return (
    <aside className="problem-context">
      <div className="problem-context-scroll">
        <header className="context-heading">
          <h1>{problem.title}</h1>
          {health}
        </header>

        <section className="context-section">
          {problem.description.split('\n\n').map((paragraph, index) => (
            <p key={index}>{renderParagraph(paragraph)}</p>
          ))}
        </section>

        {assistance}
      </div>

      {/* Pinned below the scroll area: the actions that end a session should not
          drift out of reach behind a long description. */}
      {actions && <div className="context-actions">{actions}</div>}
    </aside>
  );
}
