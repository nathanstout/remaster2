import type { PracticeRecord } from '../../types/practice';

/**
 * What the finished session was worth.
 *
 * Shown after the workspace has already reset, so the feedback survives the
 * reset instead of vanishing with it.
 */
export function CompletionSummary({
  record,
  totalHints,
  onDismiss,
}: {
  record: PracticeRecord;
  totalHints: number;
  onDismiss: () => void;
}) {
  const solved = record.outcome === 'solved';

  return (
    <aside className={`completion-summary ${solved ? 'solved' : 'gave-up'}`}>
      <div>
        <strong>{solved ? 'Solved' : 'Practice recorded'}</strong>
        <span className="mastery">Mastery: {record.masteryScore} / 5</span>
      </div>
      <div className="completion-details">
        {!solved && <span>Outcome: not solved</span>}
        <span>
          Hints used: {record.revealedHintIds.length} / {totalHints}
        </span>
        <span>Solution revealed: {record.solutionRevealed ? 'Yes' : 'No'}</span>
        <span>Test runs: {record.testRuns}</span>
      </div>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </aside>
  );
}
