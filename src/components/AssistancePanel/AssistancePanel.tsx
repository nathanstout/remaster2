import { useState } from 'react';
import type { Problem } from '../../types/problem';

interface AssistancePanelProps {
  problem: Problem;
  revealedHintIds: string[];
  solutionRevealed: boolean;
  /** Disabled while a submission is being finalized, to keep scoring deterministic. */
  busy: boolean;
  onRevealHint: (hintId: string) => void;
  onRevealSolution: () => void;
  onOpenSolution: () => void;
}

/**
 * Progressive help.
 *
 * Hints reveal one at a time and in order, with no "are you sure" friction —
 * the cost is recorded, not negotiated. The full solution does confirm, because
 * it has a far larger effect on the session's score.
 */
export function AssistancePanel({
  problem,
  revealedHintIds,
  solutionRevealed,
  busy,
  onRevealHint,
  onRevealSolution,
  onOpenSolution,
}: AssistancePanelProps) {
  const [confirmingSolution, setConfirmingSolution] = useState(false);
  const hints = problem.hints ?? [];
  const revealed = new Set(revealedHintIds);
  const nextHint = hints.find((hint) => !revealed.has(hint.id));

  if (hints.length === 0 && !problem.solution) return null;

  return (
    <section className="assistance">
      {hints.length > 0 && (
        <div className="hints">
          <h2>
            Hints{' '}
            <span className="hint-count">
              {revealed.size} / {hints.length} revealed
            </span>
          </h2>

          <ol>
            {hints.map((hint, index) =>
              revealed.has(hint.id) ? (
                <li key={hint.id}>
                  <strong>Hint {index + 1}.</strong> {hint.content}
                </li>
              ) : null,
            )}
          </ol>

          {nextHint && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRevealHint(nextHint.id)}
            >
              Reveal hint {revealed.size + 1}
            </button>
          )}
        </div>
      )}

      {problem.solution && (
        <div className="solution-controls">
          {solutionRevealed ? (
            <button type="button" onClick={onOpenSolution}>
              View textbook solution
            </button>
          ) : confirmingSolution ? (
            <>
              <span className="confirm-prompt">
                Reveal the textbook solution? This attempt will be recorded as having used it.
              </span>
              <button type="button" onClick={() => setConfirmingSolution(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setConfirmingSolution(false);
                  onRevealSolution();
                }}
              >
                Reveal Solution
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmingSolution(true)}>
              Reveal Solution
            </button>
          )}
        </div>
      )}
    </section>
  );
}
