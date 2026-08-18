import { useState } from 'react';
import type { Problem } from '../../types/problem';

/**
 * Read-only view of the textbook solution.
 *
 * Deliberately a separate surface rather than something written into the
 * editor: seeing the answer must never destroy the attempt the user is in the
 * middle of. Multi-file problems get the same tabs as the editor.
 */
export function SolutionViewer({ problem, onClose }: { problem: Problem; onClose: () => void }) {
  const files = problem.solution?.files ?? {};
  const available = problem.files.filter((file) => files[file.id] !== undefined);
  const [activeId, setActiveId] = useState(available[0]?.id ?? '');
  const active = available.find((file) => file.id === activeId) ?? available[0];

  return (
    <div className="solution-viewer" role="dialog" aria-label="Textbook solution">
      <header className="pane-header">
        <span>Textbook solution</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>

      {available.length > 1 && (
        <div className="file-tabs">
          {available.map((file) => (
            <button
              key={file.id}
              type="button"
              className={file.id === active?.id ? 'selected' : undefined}
              onClick={() => setActiveId(file.id)}
            >
              {file.name}
            </button>
          ))}
        </div>
      )}

      <pre className="solution-code">{active ? files[active.id] : 'No solution available.'}</pre>
    </div>
  );
}
