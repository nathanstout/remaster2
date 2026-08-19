import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProblem } from '../../problems';
import { usePracticeInsights } from '../../practice/practiceInsightsContext';
import { usePracticeSession } from '../../practiceSession';
import type { PracticeSessionItem } from '../../practiceSession';
import { getFolder, useTaxonomy } from '../../taxonomy';

const MODE_LABEL = { ordered: 'In Order', shuffle: 'Shuffle' } as const;

/** Health for one queued problem, from the shared derivation used everywhere. */
function QueueHealth({ problemId }: { problemId: string }) {
  const { problemHealth } = usePracticeInsights();
  const health = problemHealth(problemId);
  if (health.status !== 'practiced') return <span className="queue-health new">New</span>;
  return <span className={`queue-health band-${health.band}`}>{health.score}%</span>;
}

function QueueRow({
  item,
  children,
}: {
  item: PracticeSessionItem & { current?: boolean };
  children: React.ReactNode;
}) {
  return (
    <li className={`queue-row ${item.status}${item.current ? ' current' : ''}`}>
      {children}
      <QueueHealth problemId={item.problemId} />
    </li>
  );
}

/**
 * The full queue, as a drawer beside the workspace.
 *
 * A column in the application row rather than an overlay: it takes width from
 * the workspace instead of covering the console and preview controls, and it
 * scrolls inside itself so a fifty-item queue cannot grow the page or push the
 * session bar off screen.
 *
 * Purely presentational. Every group here is derived from the queue's own item
 * order and statuses, so the drawer cannot disagree with the bar or hold a
 * second copy of session state.
 */
export function SessionQueueDrawer({ onClose }: { onClose: () => void }) {
  const { session, currentProblemId, progress, jumpTo } = usePracticeSession();
  const { taxonomy } = useTaxonomy();
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes, matching the solution viewer. Bound to the drawer rather
  // than the document so it cannot swallow Escape meant for the editor.
  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!session) return null;

  const folder = getFolder(taxonomy, session.sourceFolderId);
  const pending = session.queue.filter((item) => item.status === 'pending');
  // The first pending item is the current one, by the same rule the engine
  // uses; everything after it is what is genuinely coming next, in the order
  // Later and jumping have left it in.
  const current = pending.find((item) => item.problemId === currentProblemId);
  const upNext = pending.filter((item) => item.problemId !== currentProblemId);
  const completed = session.queue.filter((item) => item.status === 'completed');
  const skipped = session.queue.filter((item) => item.status === 'skipped');

  return (
    <aside
      className="queue-drawer"
      ref={panel}
      role="dialog"
      aria-label="Practice queue"
      tabIndex={-1}
    >
      <header className="queue-drawer-header">
        <div>
          <h2>Practice queue</h2>
          <p className="queue-drawer-source">
            <span className={`session-mode mode-${session.mode}`}>{MODE_LABEL[session.mode]}</span>
            <span aria-hidden="true"> · </span>
            {folder?.name ?? 'Deleted folder'}
          </p>
          <p className="queue-drawer-progress">
            {progress.completed} completed
            {progress.skipped > 0 && ` · ${progress.skipped} skipped`} · {progress.remaining}{' '}
            remaining
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close practice queue">
          ✕
        </button>
      </header>

      <div className="queue-drawer-scroll">
        {current && (
          <section className="queue-section">
            <h3>Current</h3>
            <ul>
              <QueueRow item={{ ...current, current: true }}>
                <span className="queue-mark" aria-hidden="true">
                  ›
                </span>
                <span className="queue-title">{getProblem(current.problemId)?.title}</span>
                <span className="queue-tag">Current</span>
              </QueueRow>
            </ul>
          </section>
        )}

        {upNext.length > 0 && (
          <section className="queue-section">
            <h3>Up next</h3>
            <ul>
              {upNext.map((item) => (
                <QueueRow key={item.problemId} item={item}>
                  <span className="queue-mark" aria-hidden="true" />
                  {/* Selecting a pending item makes it current through the same
                      mutation the engine already uses — it completes nothing
                      and discards no attempt. */}
                  <button
                    type="button"
                    className="queue-title link"
                    onClick={() => jumpTo(item.problemId)}
                  >
                    {getProblem(item.problemId)?.title}
                  </button>
                </QueueRow>
              ))}
            </ul>
          </section>
        )}

        {completed.length > 0 && (
          <section className="queue-section">
            <h3>Completed</h3>
            <ul>
              {completed.map((item) => (
                <QueueRow key={item.problemId} item={item}>
                  <span className="queue-mark" aria-hidden="true">
                    ✓
                  </span>
                  {/* Navigates for reference only. It goes nowhere near the
                      queue mutations, so a completed problem cannot re-enter
                      the pending work by being looked at. */}
                  <button
                    type="button"
                    className="queue-title link"
                    onClick={() => navigate(`/problem/${item.problemId}`)}
                  >
                    {getProblem(item.problemId)?.title}
                  </button>
                </QueueRow>
              ))}
            </ul>
          </section>
        )}

        {skipped.length > 0 && (
          <section className="queue-section">
            <h3>Skipped</h3>
            <ul>
              {skipped.map((item) => (
                <QueueRow key={item.problemId} item={item}>
                  <span className="queue-mark" aria-hidden="true">
                    –
                  </span>
                  <span className="queue-title">{getProblem(item.problemId)?.title}</span>
                  <span className="queue-tag">Skipped</span>
                </QueueRow>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
