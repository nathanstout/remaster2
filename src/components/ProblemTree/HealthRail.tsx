import type { FolderHealthSummary } from '../../practice/folderHealth';
import type { ProblemHealth } from '../../practice/health';

const BAND_WORD: Record<string, string> = {
  strong: 'Strong',
  good: 'Good',
  'review-soon': 'Review soon',
  'at-risk': 'At risk',
};

/**
 * The right-aligned metric on a tree row.
 *
 * Fixed width and tabular numerals so values line up across nesting depths, and
 * always textual — colour is a hint, never the only carrier of meaning. Fuller
 * wording goes to assistive technology through the label.
 */
function Rail({ text, label, band }: { text: string; label: string; band?: string }) {
  return (
    <span className={`health-rail${band ? ` band-${band}` : ''}`} title={label} aria-label={label}>
      {text}
    </span>
  );
}

export function ProblemRail({ health, title }: { health: ProblemHealth; title: string }) {
  if (health.status === 'unpracticed') {
    return <Rail text="New" label={`${title}: not practiced`} band="unpracticed" />;
  }
  return (
    <Rail
      text={`${health.score}%`}
      band={health.band}
      label={`${title}: ${health.score} percent health, ${BAND_WORD[health.band]}`}
    />
  );
}

export function FolderRail({ summary, name }: { summary: FolderHealthSummary; name: string }) {
  if (summary.status === 'empty') {
    return <Rail text="Empty" label={`${name}: no problems`} band="unpracticed" />;
  }

  if (summary.status === 'unpracticed') {
    return (
      <Rail
        text={`New · 0/${summary.totalProblems}`}
        band="unpracticed"
        label={`${name}: not practiced, 0 of ${summary.totalProblems} problems practiced`}
      />
    );
  }

  return (
    <Rail
      text={`${summary.score}% · ${summary.practicedProblems}/${summary.totalProblems}`}
      band={summary.band}
      label={`${name}: ${summary.score} percent health, ${summary.practicedProblems} of ${summary.totalProblems} problems practiced`}
    />
  );
}

export { BAND_WORD };
