import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { CompletionSummary } from './components/CompletionSummary/CompletionSummary';
import { FolderDetail } from './components/FolderDetail/FolderDetail';
import { NavigationSidebar } from './components/NavigationSidebar/NavigationSidebar';
import { ProblemWorkspace } from './components/ProblemWorkspace/ProblemWorkspace';
import { SessionBar } from './components/SessionBar/SessionBar';
import { SessionQueueDrawer } from './components/SessionBar/SessionQueueDrawer';
import { useProblem } from './hooks/useProblem';
import { DEFAULT_PROBLEM_ID, getProblem } from './problems';
import { PracticeHistoryProvider } from './practice/PracticeHistoryProvider';
import { PracticeInsightsProvider } from './practice/PracticeInsightsProvider';
import { deleteAttempt } from './persistence/attempts';
import { AttemptActivityProvider } from './practice/AttemptActivityProvider';
import { PracticeSessionProvider } from './practiceSession';
import { getFolder, TaxonomyProvider, useTaxonomy } from './taxonomy';
import type { PracticeRecord } from './types/practice';

const DEFAULT_ROUTE = `/problem/${DEFAULT_PROBLEM_ID}`;

/**
 * One problem, resolved from the URL.
 *
 * The route is the only source of truth for what is selected — there is no
 * parallel selection state that could drift out of sync with it.
 */
function ProblemRoute({
  attempt,
  onAttemptEnded,
}: {
  attempt: number;
  onAttemptEnded: (record?: PracticeRecord) => void;
}) {
  const { problemId } = useParams<{ problemId: string }>();
  const problem = useProblem(problemId ?? '');

  // An unknown id is a dead end, not an error page: send it somewhere valid.
  if (!problem) return <Navigate to={DEFAULT_ROUTE} replace />;

  // Keying on the id gives each problem a clean workspace: fresh source, fresh
  // console, fresh runtime. Ending an attempt bumps the same key, so finishing
  // or resetting reuses that proven clean-slate path rather than trying to
  // unwind state in place. Layout state is deliberately not part of this key.
  return (
    <ProblemWorkspace
      key={`${problem.id}#${attempt}`}
      problem={problem}
      onAttemptEnded={onAttemptEnded}
    />
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

  // No reference column here: a folder page has no problem to refer to, and an
  // empty middle column would only take width from the content that matters.
  return <FolderDetail folder={folder} />;
}

/**
 * The application shell.
 *
 * Holds the two pieces of state that must outlive a route change or a workspace
 * remount: whether navigation is collapsed, and the summary of the session that
 * just ended.
 */
export default function App() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  // Presentation only, and owned here because the drawer and the bar that
  // toggles it live in different parts of the shell. It changes no workspace
  // key, so opening the queue re-renders but never remounts the workspace.
  const [queueOpen, setQueueOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [lastRecord, setLastRecord] = useState<PracticeRecord | null>(null);

  const toggleNav = useCallback(() => setNavCollapsed((value) => !value), []);
  const toggleQueue = useCallback(() => setQueueOpen((value) => !value), []);
  const handleAttemptEnded = useCallback((record?: PracticeRecord) => {
    setLastRecord(record ?? null);
    setAttempt((value) => value + 1);
  }, []);

  /**
   * Throws away the unfinished work on one problem.
   *
   * Skipping a problem from a session means exactly what Reset Attempt already
   * means, so it reuses that path rather than introducing a second way to clear
   * source: delete the stored attempt, then remount the workspace so it reseeds
   * from the problem definition. Practice records are untouched — this only
   * ever removes work that was never recorded.
   */
  const discardAttempt = useCallback((problemId: string) => {
    deleteAttempt(problemId);
    setLastRecord(null);
    setAttempt((value) => value + 1);
  }, []);

  const summaryProblem = lastRecord ? getProblem(lastRecord.problemId) : undefined;

  return (
    <TaxonomyProvider>
      <PracticeHistoryProvider>
        <PracticeInsightsProvider>
          <AttemptActivityProvider>
            <PracticeSessionProvider onDiscardAttempt={discardAttempt}>
              <div className="app-shell">
                {lastRecord && (
                  <CompletionSummary
                    record={lastRecord}
                    totalHints={summaryProblem?.hints?.length ?? 0}
                    onDismiss={() => setLastRecord(null)}
                  />
                )}

                <div className="app">
                  <NavigationSidebar collapsed={navCollapsed} onToggle={toggleNav} />

                  <Routes>
                    <Route
                      path="/problem/:problemId"
                      element={<ProblemRoute attempt={attempt} onAttemptEnded={handleAttemptEnded} />}
                    />
                    <Route path="/folder/:folderId" element={<FolderRoute />} />
                    {/* `/` and anything unrecognised land on a known-good problem. */}
                    <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
                  </Routes>

                  {/* A column in the application row rather than an overlay, so the
                      queue takes width from the workspace instead of sitting on top
                      of the console and preview controls. */}
                  {queueOpen && <SessionQueueDrawer onClose={() => setQueueOpen(false)} />}
                </div>

                {/* A sibling of the application row, not an overlay: it reserves its
                    own height in the shell column, so it cannot cover the editor or
                    the output controls. Mounted once, outside the routes, so session
                    changes never remount the workspace. */}
                <SessionBar queueOpen={queueOpen} onToggleQueue={toggleQueue} />
              </div>
            </PracticeSessionProvider>
          </AttemptActivityProvider>
        </PracticeInsightsProvider>
      </PracticeHistoryProvider>
    </TaxonomyProvider>
  );
}
