import type { Problem } from '../../types/problem';

interface ProblemListProps {
  problems: Problem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** The problem selector. Deliberately minimal — it only picks an id. */
export function ProblemList({ problems, selectedId, onSelect }: ProblemListProps) {
  return (
    <nav className="problem-list" aria-label="Problems">
      <header className="pane-header">
        <span>Problems</span>
      </header>
      <ul>
        {problems.map((problem) => (
          <li key={problem.id}>
            <button
              type="button"
              className={problem.id === selectedId ? 'selected' : undefined}
              aria-current={problem.id === selectedId ? 'true' : undefined}
              onClick={() => onSelect(problem.id)}
            >
              {problem.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
