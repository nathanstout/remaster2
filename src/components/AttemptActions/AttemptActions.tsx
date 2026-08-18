import { useState } from 'react';

interface AttemptActionsProps {
  /** False while nothing meaningful has happened in this session yet. */
  hasAttempt: boolean;
  /** True while a submission is being evaluated and finalized. */
  busy: boolean;
  /** Absent when the problem has no test suite to submit against. */
  onSubmit?: () => void;
  onFinishWithoutSolving: () => void;
  onReset: () => void;
  /** Shown when a practice record could not be written. */
  error?: string | null;
}

/**
 * The three ways a session can end.
 *
 * They stay distinct because they mean different things: submitting claims the
 * problem was solved, finishing without solving records that it was not, and
 * resetting records nothing at all — it simply starts the problem over.
 */
export function AttemptActions({
  hasAttempt,
  busy,
  onSubmit,
  onFinishWithoutSolving,
  onReset,
  error,
}: AttemptActionsProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (confirmingReset) {
    return (
      <div className="attempt-actions confirming">
        <span className="confirm-prompt">
          Discard your code and restore the starter? Nothing will be recorded.
        </span>
        <button type="button" onClick={() => setConfirmingReset(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => {
            setConfirmingReset(false);
            onReset();
          }}
        >
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="attempt-actions">
      {error && <span className="attempt-error">{error}</span>}
      {/* Derived from the session, not from storage: it marks that an attempt is
          in progress, and so never claims a save that may have failed. */}
      {hasAttempt && <span className="draft-badge">Draft</span>}

      <button type="button" onClick={() => setConfirmingReset(true)} disabled={!hasAttempt || busy}>
        Reset Attempt
      </button>
      <button type="button" onClick={onFinishWithoutSolving} disabled={!hasAttempt || busy}>
        Finish Without Solving
      </button>
      {onSubmit && (
        <button type="button" className="submit" onClick={onSubmit} disabled={busy}>
          {busy ? 'Submitting…' : 'Submit'}
        </button>
      )}
    </div>
  );
}
