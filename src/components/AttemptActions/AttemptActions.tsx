import { useState } from 'react';

interface AttemptActionsProps {
  /** False while the files are still untouched starter code. */
  hasAttempt: boolean;
  onFinish: () => void;
  onReset: () => void;
}

/**
 * The two ways an attempt ends.
 *
 * They are deliberately distinct actions rather than one button with a mode:
 * "reset" means start this problem over, "finish" means this practice session
 * is done. Today both simply drop the saved draft, but only finishing will
 * later record that the problem was practised.
 */
export function AttemptActions({ hasAttempt, onFinish, onReset }: AttemptActionsProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (confirmingReset) {
    return (
      <div className="attempt-actions confirming">
        <span className="confirm-prompt">Discard your code and restore the starter?</span>
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
      {/* Derived from the source, not from storage: it marks that an attempt is
          in progress, and so never claims a save that may have failed. */}
      {hasAttempt && <span className="draft-badge">Draft</span>}
      <button type="button" onClick={() => setConfirmingReset(true)} disabled={!hasAttempt}>
        Reset Attempt
      </button>
      <button type="button" onClick={onFinish} disabled={!hasAttempt}>
        Finish Attempt
      </button>
    </div>
  );
}
