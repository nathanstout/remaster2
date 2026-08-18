import { Link } from 'react-router-dom';
import { getProblem } from '../../problems';
import { usePracticeInsights } from '../../practice/practiceInsightsContext';
import { getAncestorFolders, useTaxonomy, type ProblemFolder } from '../../taxonomy';
import { formatRelativeDay } from '../../utils/relativeTime';
import { BAND_WORD } from '../ProblemTree/HealthRail';

/**
 * What a folder contains, how well it is retained, and what to look at next.
 *
 * Every number is derived on render from the current taxonomy, practice history
 * and clock — nothing about folders is stored.
 */
export function FolderDetail({ folder }: { folder: ProblemFolder }) {
  const { taxonomy } = useTaxonomy();
  const { folderSummary, reviewCandidates, unpracticedProblems, now } = usePracticeInsights();

  const summary = folderSummary(folder.id);
  const candidates = reviewCandidates(folder.id);
  const unpracticed = unpracticedProblems(folder.id);
  const ancestors = getAncestorFolders(taxonomy, folder.id);

  return (
    <div className="folder-detail">
      <header className="problem">
        <nav className="breadcrumb" aria-label="Folder path">
          {ancestors.map((ancestor) => (
            <span key={ancestor.id}>
              <Link to={`/folder/${ancestor.id}`}>{ancestor.name}</Link>
              <span aria-hidden="true"> / </span>
            </span>
          ))}
        </nav>
        <h1>{folder.name}</h1>
      </header>

      <div className="folder-body">
        <section className="folder-metrics">
          {summary.status === 'empty' && <p className="practice-empty">This folder has no problems.</p>}

          {summary.status === 'unpracticed' && (
            <>
              <h2>Health</h2>
              <p className="practice-empty">Not practiced yet</p>
              <h2>Coverage</h2>
              <p>0 of {summary.totalProblems} practiced</p>
            </>
          )}

          {summary.status === 'practiced' && (
            <>
              <h2>Health</h2>
              <div className="health-readout">
                <span className="health-bar large" aria-hidden="true">
                  <span className="health-bar-fill" style={{ width: `${summary.score}%` }} />
                </span>
                <strong className="health-score">{summary.score}%</strong>
                <span className={`health-band-label band-${summary.band}`}>
                  {BAND_WORD[summary.band]}
                </span>
              </div>

              <h2>Coverage</h2>
              <p>
                {summary.practicedProblems} of {summary.totalProblems} practiced ·{' '}
                {Math.round(summary.coverage * 100)}%
              </p>
            </>
          )}
        </section>

        {candidates.length > 0 && (
          <section className="review-priority">
            {/* "Priority", not "needs review": the weakest items are still worth
                listing when everything in the folder is healthy. */}
            <h2>Review priority</h2>
            <ul>
              {candidates.map((candidate) => {
                const problem = getProblem(candidate.problemId);
                if (!problem) return null;
                return (
                  <li key={candidate.problemId}>
                    <Link to={`/problem/${candidate.problemId}`}>{problem.title}</Link>
                    <div className="review-meta">
                      <span className={`health-band-label band-${candidate.band}`}>
                        {candidate.score}% · {BAND_WORD[candidate.band]}
                      </span>
                      <span>Last practiced {formatRelativeDay(candidate.lastPracticedAt, now).toLowerCase()}</span>
                      <span>Latest mastery {candidate.latestMastery} / 5</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {unpracticed.length > 0 && (
          <section className="not-practiced">
            {/* Kept out of the ranking above: never practised is not decayed. */}
            <h2>Not practiced</h2>
            <ul>
              {unpracticed.map((problemId) => {
                const problem = getProblem(problemId);
                if (!problem) return null;
                return (
                  <li key={problemId}>
                    <Link to={`/problem/${problemId}`}>{problem.title}</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
