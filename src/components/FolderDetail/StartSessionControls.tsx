import { useState } from 'react';
import { usePracticeSession } from '../../practiceSession';
import type { PracticeSessionMode } from '../../practiceSession';

/**
 * Starting a session from a folder.
 *
 * The two modes queue exactly the same problems and differ only in order, so
 * they are presented side by side with the reason to pick each one. The copy
 * describes what the user gets — problems from different sections separated —
 * rather than how the ordering is computed.
 */
export function StartSessionControls({
  folderId,
  problemCount,
}: {
  folderId: string;
  problemCount: number;
}) {
  const { session, start } = usePracticeSession();
  const [pendingMode, setPendingMode] = useState<PracticeSessionMode | null>(null);
  const empty = problemCount === 0;

  const request = (mode: PracticeSessionMode): void => {
    // Exactly one session exists at a time, so replacing one is a decision the
    // user makes rather than a side effect of clicking a button.
    if (session) setPendingMode(mode);
    else start({ sourceFolderId: folderId, mode });
  };

  if (empty) {
    return (
      <section className="start-session" aria-label="Practice session">
        <h2>Practice session</h2>
        <p className="practice-empty">This folder has no problems to practise.</p>
      </section>
    );
  }

  return (
    <section className="start-session" aria-label="Practice session">
      <h2>Start a practice session</h2>
      <p className="session-hint">
        {problemCount} problem{problemCount === 1 ? '' : 's'}, including everything in subfolders.
      </p>

      {pendingMode ? (
        <div className="session-confirm" role="alertdialog" aria-label="Replace practice session">
          <p>
            <strong>Start a new practice session?</strong> Your current queue will be replaced.
            Completed practice history and unfinished problem work both remain saved.
          </p>
          <div className="session-confirm-actions">
            <button type="button" onClick={() => setPendingMode(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="submit"
              onClick={() => {
                const mode = pendingMode;
                setPendingMode(null);
                start({ sourceFolderId: folderId, mode });
              }}
            >
              Start New Session
            </button>
          </div>
        </div>
      ) : (
        <div className="session-modes">
          <div className="session-mode-card">
            <h3>In order</h3>
            <p>Follow this folder&rsquo;s curriculum order, exactly as the tree shows it.</p>
            <button
              type="button"
              onClick={() => request('ordered')}
              aria-label="Start a practice session in curriculum order"
            >
              Start in Order
            </button>
          </div>

          <div className="session-mode-card">
            <h3>Shuffle</h3>
            <p>
              Mixes problems across sections when possible, so similar exercises are less likely to
              appear back to back.
            </p>
            <button
              type="button"
              onClick={() => request('shuffle')}
              aria-label="Start a shuffled practice session"
            >
              Shuffle Practice
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
