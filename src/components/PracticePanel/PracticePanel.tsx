import type { ProblemPracticeSummary } from '../../practice/historyQueries';
import type { PracticeRecord } from '../../types/practice';
import { formatDate, formatRelativeDay } from '../../utils/relativeTime';
import { BAND_LABEL, HealthBadge } from './HealthBadge';

/** One past session. Metadata only — historical source is deliberately not stored. */
function HistoryRow({ record }: { record: PracticeRecord }) {
  const hintCount = record.revealedHintIds.length;

  return (
    <li className="history-row">
      <div className="history-headline">
        <span className="history-date">{formatDate(record.completedAt)}</span>
        <span className={`history-outcome ${record.outcome}`}>
          {/* The stored outcome, never inferred: a solve after reading the
              solution is still a solve, just a low-mastery one. */}
          {record.outcome === 'solved' ? 'Solved' : 'Not solved'}
        </span>
        <span className="history-mastery">Mastery {record.masteryScore} / 5</span>
      </div>

      <div className="history-details">
        <span>
          {/* Only the count: the problem's hint list may have changed since,
              so a "2 / 3" derived from today's definition could be wrong. */}
          {hintCount === 0 ? 'No hints' : hintCount === 1 ? '1 hint used' : `${hintCount} hints used`}
        </span>
        {record.solutionRevealed && <span className="history-solution">Textbook solution viewed</span>}
        <span>
          Tests: {record.testRuns} {record.testRuns === 1 ? 'run' : 'runs'}
          {record.failedTestRuns > 0 && `, ${record.failedTestRuns} with failures`}
        </span>
        {record.finalTestsTotal > 0 && (
          <span>
            Final: {record.finalTestsPassed} / {record.finalTestsTotal} passing
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Health and past sessions for the current problem.
 *
 * Everything here is derived from the stored records plus the current time —
 * nothing about practice outcomes is cached alongside the problem.
 */
export function PracticePanel({ summary, now }: { summary: ProblemPracticeSummary; now: Date }) {
  const { health, attemptCount, records, previousMastery } = summary;

  return (
    <div className="practice-panel">
      <section className="health-summary">
        <h2>Knowledge health</h2>

        {health.status === 'unpracticed' ? (
          <>
            <HealthBadge health={health} />
            <p className="practice-empty">Complete a practice attempt to begin tracking.</p>
          </>
        ) : (
          <>
            <div className="health-readout">
              <span className="health-bar large" aria-hidden="true">
                <span className="health-bar-fill" style={{ width: `${health.score}%` }} />
              </span>
              <strong className="health-score">{health.score}%</strong>
              <span className={`health-band-label band-${health.band}`}>
                {BAND_LABEL[health.band]}
              </span>
            </div>

            <dl className="health-facts">
              <div>
                <dt>Last practiced</dt>
                <dd>{formatRelativeDay(health.lastPracticedAt, now)}</dd>
              </div>
              <div>
                <dt>Latest mastery</dt>
                <dd>
                  {health.latestMastery} / 5
                  {previousMastery !== undefined && previousMastery !== health.latestMastery && (
                    <span className="mastery-trend">
                      {health.latestMastery > previousMastery ? ' ↑' : ' ↓'} from {previousMastery}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Attempts</dt>
                <dd>{attemptCount}</dd>
              </div>
            </dl>
          </>
        )}
      </section>

      {records.length > 0 && (
        <section className="practice-history">
          <h2>Practice history</h2>
          <ul>
            {records.map((record) => (
              <HistoryRow key={record.id} record={record} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
