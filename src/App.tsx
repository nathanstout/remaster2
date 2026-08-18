import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { FolderDetail } from './components/FolderDetail/FolderDetail';
import { CompletionSummary } from './components/CompletionSummary/CompletionSummary';
import { ProblemTree } from './components/ProblemTree/ProblemTree';
import { ProblemWorkspace } from './components/ProblemWorkspace/ProblemWorkspace';
import { useProblem } from './hooks/useProblem';
import { DEFAULT_PROBLEM_ID } from './problems';
import { PracticeHistoryProvider } from './practice/PracticeHistoryProvider';
import { PracticeInsightsProvider } from './practice/PracticeInsightsProvider';
import { getFolder, TaxonomyProvider, useTaxonomy } from './taxonomy';
import type { PracticeRecord } from './types/practice';

const DEFAULT_ROUTE = `/problem/${DEFAULT_PROBLEM_ID}`;

/**
 * One problem, resolved from the URL.
 *
 * The route is the only source of truth for what is selected — there is no
 * parallel selection state that could drift out of sync with it.
 */
function ProblemRoute() {
  const { problemId } = useParams<{ problemId: string }>();
  const problem = useProblem(problemId ?? '');
  // Bumped when an attempt ends, to remount the workspace below.
  const [attempt, setAttempt] = useState(0);
  // Held here rather than in the workspace, so the feedback survives the reset
  // that immediately follows a recorded session.
  const [lastRecord, setLastRecord] = useState<PracticeRecord | null>(null);

  const handleAttemptEnded = useCallback((record?: PracticeRecord) => {
    setLastRecord(record ?? null);
    setAttempt((value) => value + 1);
  }, []);

  // An unknown id is a dead end, not an error page: send it somewhere valid.
  if (!problem) return <Navigate to={DEFAULT_ROUTE} replace />;

  return (
    <div className="app">
      <ProblemTree />
      {/* Keying on the id gives each problem a clean workspace: fresh source,
          fresh console, fresh runtime. Ending an attempt bumps the same key,
          so finishing or resetting reuses that proven clean-slate path rather
          than trying to unwind state in place. */}
      <div className="problem-column">
        {lastRecord && (
          <CompletionSummary
            record={lastRecord}
            totalHints={problem.hints?.length ?? 0}
            onDismiss={() => setLastRecord(null)}
          />
        )}
        <ProblemWorkspace
          key={`${problem.id}#${attempt}`}
          problem={problem}
          onAttemptEnded={handleAttemptEnded}
        />
      </div>
    </div>
  );
}

/**
 * One folder, resolved from the URL.
 *
 * Folder ids are stable, so renaming or moving the folder being viewed keeps
 * this route valid and simply re-renders with the new name and ancestry.
 */
function FolderRoute() {
  const { folderId } = useParams<{ folderId: string }>();
  const { taxonomy } = useTaxonomy();
  const folder = folderId ? getFolder(taxonomy, folderId) : undefined;

  // Remembered while the folder exists, so deleting the folder you are looking
  // at can fall back to where it used to live rather than stranding the view.
  const lastParentId = useRef<string | null>(null);
  useEffect(() => {
    if (folder) lastParentId.current = folder.parentId;
  }, [folder]);

  if (!folder) {
    const parentId = lastParentId.current;
    return <Navigate to={parentId ? `/folder/${parentId}` : DEFAULT_ROUTE} replace />;
  }

  return (
    <div className="app">
      <ProblemTree />
      <div className="problem-column">
        <FolderDetail folder={folder} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TaxonomyProvider>
      <PracticeHistoryProvider>
        <PracticeInsightsProvider>
          <Routes>
            <Route path="/problem/:problemId" element={<ProblemRoute />} />
            <Route path="/folder/:folderId" element={<FolderRoute />} />
            {/* `/` and anything unrecognised land on a known-good problem. */}
            <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
          </Routes>
        </PracticeInsightsProvider>
      </PracticeHistoryProvider>
    </TaxonomyProvider>
  );
}
