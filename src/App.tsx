import { useCallback, useState } from 'react';
import { ProblemList } from './components/ProblemList/ProblemList';
import { ProblemWorkspace } from './components/ProblemWorkspace/ProblemWorkspace';
import { useProblem } from './hooks/useProblem';
import { DEFAULT_PROBLEM_ID, listProblems } from './problems';

/**
 * Owns which problem is selected and nothing else. Everything below resolves
 * from that one id.
 */
export default function App() {
  const [selectedProblemId, setSelectedProblemId] = useState(DEFAULT_PROBLEM_ID);
  const problem = useProblem(selectedProblemId);
  // Bumped when an attempt ends, to remount the workspace below.
  const [attempt, setAttempt] = useState(0);

  const handleAttemptEnded = useCallback(() => setAttempt((value) => value + 1), []);

  return (
    <div className="app">
      <ProblemList
        problems={listProblems()}
        selectedId={selectedProblemId}
        onSelect={setSelectedProblemId}
      />

      {problem ? (
        // Keying on the id gives each problem a clean workspace: fresh source,
        // fresh console, fresh runtime. Ending an attempt bumps the same key,
        // so finishing or resetting reuses that proven clean-slate path rather
        // than trying to unwind state in place.
        <ProblemWorkspace
          key={`${problem.id}#${attempt}`}
          problem={problem}
          onAttemptEnded={handleAttemptEnded}
        />
      ) : (
        <div className="app-error">Problem "{selectedProblemId}" not found.</div>
      )}
    </div>
  );
}
