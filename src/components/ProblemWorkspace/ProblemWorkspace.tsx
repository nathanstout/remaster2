import { useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '../CodeEditor/CodeEditor';
import { Console } from '../Console/Console';
import { ProblemPanel } from '../ProblemPanel/ProblemPanel';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRuntime } from '../../hooks/useRuntime';
import type { Problem } from '../../types/problem';

/** How long the user has to stop typing before we re-execute. */
const EDIT_DEBOUNCE_MS = 400;

/**
 * Wires the layers together for one problem:
 *   problem -> editor -> (debounce) -> runtime -> console
 *
 * Mounted with `key={problem.id}`, so selecting another problem replaces this
 * subtree outright: editable source is reseeded from the problem definition,
 * console state is dropped, and `useRuntime`'s cleanup disposes the previous
 * runtime — terminating its Worker and any timers it still had pending.
 */
export function ProblemWorkspace({ problem }: { problem: Problem }) {
  const file = problem.files[0];
  const [code, setCode] = useState(file.starterCode);
  const debouncedCode = useDebouncedValue(code, EDIT_DEBOUNCE_MS);
  const { entries, status, run, generation } = useRuntime(problem);

  const source = useMemo(
    () => ({ files: { [file.id]: debouncedCode }, entry: file.id }),
    [file.id, debouncedCode],
  );

  // Runs on mount and after every settled edit. The runtime disposes the
  // previous execution and starts a clean one; the console clears itself.
  useEffect(() => {
    run(source);
  }, [run, source, generation]);

  return (
    <div className="problem-workspace">
      <ProblemPanel problem={problem} />

      <main className="workspace">
        <section className="editor-pane">
          <header className="pane-header">
            <span>{file.name}</span>
            <span className="hint">runs automatically as you type</span>
          </header>
          <div className="editor-host">
            <CodeEditor
              // One Monaco model per problem file, so undo/redo history and
              // diagnostics can never cross a problem boundary.
              path={`file:///${problem.id}/${file.id}`}
              value={code}
              language={file.language}
              onChange={setCode}
            />
          </div>
        </section>

        <Console entries={entries} status={status} />
      </main>
    </div>
  );
}
