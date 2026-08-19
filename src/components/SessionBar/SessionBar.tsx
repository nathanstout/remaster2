import { useState } from 'react';
import { useMatch } from 'react-router-dom';
import { getProblem } from '../../problems';
import { useAttemptActivity } from '../../practice/attemptActivityContext';
import { usePracticeInsights } from '../../practice/practiceInsightsContext';
import { usePracticeSession } from '../../practiceSession';
import { getFolder, useTaxonomy } from '../../taxonomy';

const MODE_LABEL = { ordered: 'In Order', shuffle: 'Shuffle' } as const;

/** Compact health, or nothing at all when a problem has never been practised. */
function CurrentHealth({ problemId }: { problemId: string }) {
  const { problemHealth } = usePracticeInsights();
  const health = problemHealth(problemId);
  return (
    <span className={health.status === 'practiced' ? `session-health band-${health.band}` : 'session-health new'}>
      {health.status === 'practiced' ? `${health.score}%` : 'New'}
    </span>
  );
}

/**
 * The persistent session control, pinned to the bottom of the shell.
 *
 * A control surface rather than a notification: it stays in one place, keeps to
 * two short rows, and answers only the questions worth answering continuously —
 * which session, which mode, which problem, how much is left, what can I do.
 * Anything longer than that belongs in the queue drawer.
 *
 * It is a sibling of the application row, so it reserves its own height and can
 * never sit on top of the editor, the preview or the output controls.
 */
export function SessionBar({
  queueOpen,
  onToggleQueue,
}: {
  queueOpen: boolean;
  onToggleQueue: () => void;
}) {
  const {
    session,
    currentProblemId,
    progress,
    isComplete,
    error,
    pendingAdvance,
    skip,
    defer,
    end,
    returnToSession,
    retryAdvance,
    canDefer,
    dismissError,
  } = usePracticeSession();
  const { taxonomy } = useTaxonomy();
  const { hasMeaningfulAttempt } = useAttemptActivity();
  const problemMatch = useMatch('/problem/:problemId');
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  if (!session) return null;

  const folder = getFolder(taxonomy, session.sourceFolderId);
  const currentProblem = currentProblemId ? getProblem(currentProblemId) : undefined;
  // Derived from the route, so it stays right after a reload, a deep link or
  // Back — there is no separate "am I on the session" flag to keep in step.
  const onSessionProblem = problemMatch?.params.problemId === currentProblemId;

  /**
   * Confirms whenever there is work to lose.
   *
   * Asks the attempt-activity boundary rather than storage, so code typed in
   * the last few hundred milliseconds — not yet written anywhere — still counts
   * as work, and so do a revealed hint or solution with untouched source.
   */
  const requestSkip = (): void => {
    if (currentProblemId && hasMeaningfulAttempt(currentProblemId)) setConfirmingSkip(true);
    else skip();
  };

  const queueButton = (
    <button
      type="button"
      onClick={onToggleQueue}
      aria-expanded={queueOpen}
      aria-label={queueOpen ? 'Close practice queue' : 'Open practice queue'}
    >
      {queueOpen ? 'Hide Queue' : 'Queue'}
    </button>
  );

  const identity = (
    <span className="session-identity">
      <span className={`session-mode mode-${session.mode}`}>{MODE_LABEL[session.mode]}</span>
      <span className="session-dot" aria-hidden="true">
        ·
      </span>
      <span className="session-folder">{folder?.name ?? 'Deleted folder'}</span>
    </span>
  );

  const counts = (
    <span className="session-progress">
      {progress.completed} completed
      {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
      {!isComplete && ` · ${progress.remaining} remaining`}
    </span>
  );

  return (
    <footer className="session-bar" aria-label="Practice session">
      {/* Queue trouble is reported here and only here: it has nothing to do
          with test results or console output, and must not appear near them. */}
      {pendingAdvance && (
        <div className="session-notice recovery" role="status">
          <span>
            <strong>Your practice result was saved.</strong> The session queue could not be
            updated, so it still shows this problem as current. There is no need to submit again.
          </span>
          <button type="button" className="submit" onClick={retryAdvance}>
            Retry Queue Update
          </button>
        </div>
      )}

      {error && !pendingAdvance && (
        <div className="session-notice" role="status">
          <span>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss session message">
            Dismiss
          </button>
        </div>
      )}

      <div className="session-row">
        <div className="session-meta">
          {identity}
          {counts}
        </div>

        {isComplete ? (
          <>
            <p className="session-headline complete">
              Session complete — {progress.completed} completed
              {progress.skipped > 0 && `, ${progress.skipped} skipped`}
            </p>
            <div className="session-actions">
              {queueButton}
              <button type="button" className="submit" onClick={end}>
                Close Session
              </button>
            </div>
          </>
        ) : confirmingSkip ? (
          <>
            <p className="session-headline">
              Skip <strong>{currentProblem?.title}</strong>? Your work on it will be discarded and
              it will leave this session. No practice result is recorded.
            </p>
            <div className="session-actions">
              <button type="button" onClick={() => setConfirmingSkip(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setConfirmingSkip(false);
                  skip();
                }}
              >
                Skip Problem
              </button>
            </div>
          </>
        ) : confirmingEnd ? (
          <>
            <p className="session-headline">
              End this practice session? The queue closes. Your current work and everything
              already practised stay saved.
            </p>
            <div className="session-actions">
              <button type="button" onClick={() => setConfirmingEnd(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="submit"
                onClick={() => {
                  setConfirmingEnd(false);
                  end();
                }}
              >
                End Session
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="session-headline">
              {onSessionProblem ? (
                <>
                  <span className="session-label">Current</span>
                  <strong className="session-current-title">{currentProblem?.title}</strong>
                  {currentProblemId && <CurrentHealth problemId={currentProblemId} />}
                </>
              ) : (
                <>
                  <span className="session-label">Session current</span>
                  <strong className="session-current-title">{currentProblem?.title}</strong>
                  <span className="session-aside">you're viewing outside the session</span>
                </>
              )}
            </p>

            <div className="session-actions">
              {/* Later and Skip act on the current queue item, so they are only
                  offered while that item is what is on screen. */}
              {onSessionProblem ? (
                <span className="session-action-group">
                  {/* Named for screen readers: out of context, "Later" and
                      "Skip" do not say what they act on. */}
                  <button
                    type="button"
                    onClick={defer}
                    disabled={!canDefer}
                    aria-label={`Practise ${currentProblem?.title ?? 'this problem'} later`}
                    title={canDefer ? undefined : 'Nothing else is left to show first'}
                  >
                    Later
                  </button>
                  <button
                    type="button"
                    onClick={requestSkip}
                    aria-label={`Skip ${currentProblem?.title ?? 'this problem'}`}
                  >
                    Skip
                  </button>
                </span>
              ) : (
                <span className="session-action-group">
                  <button
                    type="button"
                    className="submit"
                    onClick={returnToSession}
                    aria-label={`Return to ${currentProblem?.title ?? 'the session'}`}
                  >
                    Return to Session
                  </button>
                </span>
              )}
              <span className="session-action-group">
                {queueButton}
                <button
                  type="button"
                  onClick={() => setConfirmingEnd(true)}
                  aria-label="End practice session"
                >
                  End Session
                </button>
              </span>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
