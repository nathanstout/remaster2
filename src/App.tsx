import { useState } from 'react';
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

  return (
    <div className="app">
      <ProblemList
        problems={listProblems()}
        selectedId={selectedProblemId}
        onSelect={setSelectedProblemId}
      />

      {problem ? (
        // Keying on the id gives each problem a clean workspace: fresh source,
        // fresh console, fresh runtime.
        <ProblemWorkspace key={problem.id} problem={problem} />
      ) : (
        <div className="app-error">Problem "{selectedProblemId}" not found.</div>
      )}
    </div>
  );
}
