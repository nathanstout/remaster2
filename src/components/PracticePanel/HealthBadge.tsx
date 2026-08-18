import type { ProblemHealth } from '../../practice/health';

const BAND_LABEL: Record<string, string> = {
  strong: 'Strong',
  good: 'Good',
  'review-soon': 'Review soon',
  'at-risk': 'At risk',
};

/**
 * The always-visible reading of the current problem's health.
 *
 * Kept to a bar plus a number plus a word: the score carries the meaning, the
 * bar makes it scannable, and the label keeps it from being colour-only.
 */
export function HealthBadge({ health }: { health: ProblemHealth }) {
  if (health.status === 'unpracticed') {
    return <span className="health-badge unpracticed">Not practiced yet</span>;
  }

  return (
    <span className={`health-badge band-${health.band}`}>
      <span className="health-bar" aria-hidden="true">
        <span className="health-bar-fill" style={{ width: `${health.score}%` }} />
      </span>
      <span className="health-score">{health.score}%</span>
      <span className="health-band-label">{BAND_LABEL[health.band]}</span>
    </span>
  );
}

export { BAND_LABEL };
