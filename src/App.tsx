import { useCallback, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ProblemTree } from './components/ProblemTree/ProblemTree';
import { ProblemWorkspace } from './components/ProblemWorkspace/ProblemWorkspace';
import { useProblem } from './hooks/useProblem';
import { DEFAULT_PROBLEM_ID } from './problems';
import { TaxonomyProvider } from './taxonomy';

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
  const handleAttemptEnded = useCallback(() => setAttempt((value) => value + 1), []);

  // An unknown id is a dead end, not an error page: send it somewhere valid.
  if (!problem) return <Navigate to={DEFAULT_ROUTE} replace />;

  return (
    <div className="app">
      <ProblemTree activeProblemId={problem.id} />
      {/* Keying on the id gives each problem a clean workspace: fresh source,
          fresh console, fresh runtime. Ending an attempt bumps the same key,
          so finishing or resetting reuses that proven clean-slate path rather
          than trying to unwind state in place. */}
      <ProblemWorkspace
        key={`${problem.id}#${attempt}`}
        problem={problem}
        onAttemptEnded={handleAttemptEnded}
      />
    </div>
  );
}

export default function App() {
  return (
    <TaxonomyProvider>
      <Routes>
        <Route path="/problem/:problemId" element={<ProblemRoute />} />
        {/* `/` and anything unrecognised land on a known-good problem. */}
        <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
      </Routes>
    </TaxonomyProvider>
  );
}
