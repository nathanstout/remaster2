import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttemptActions } from '../AttemptActions/AttemptActions';
import { CodeEditor } from '../CodeEditor/CodeEditor';
import { OutputPane } from '../OutputPane/OutputPane';
import { FileTabs } from '../FileTabs/FileTabs';
import { ProblemPanel } from '../ProblemPanel/ProblemPanel';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRuntime } from '../../hooks/useRuntime';
import { deleteDraft, loadDraft, saveDraft } from '../../persistence/drafts';
import { matchesStarter, starterFiles } from '../../problems';
import { supportsPreview } from '../../runtime/createRuntime';
import type { Problem } from '../../types/problem';

/** How long the user has to stop typing before we re-execute. */
const EDIT_DEBOUNCE_MS = 400;

/**
 * Wires the layers together for one problem:
 *   problem -> editor(s) -> (debounce) -> runtime -> console (+ preview)
 *
 * Mounted with `key={problem.id}`, so selecting another problem replaces this
 * subtree outright: editable sources are reseeded from the problem definition,
 * console state is dropped, Monaco models are disposed, and `useRuntime`'s
 * cleanup disposes the runtime — terminating its Worker or iframe.
 */
export function ProblemWorkspace({
  problem,
  onAttemptEnded,
}: {
  problem: Problem;
  /** Asks the parent to remount this workspace with a clean slate. */
  onAttemptEnded: () => void;
}) {
  // One entry per file: a resumable draft if one was saved, otherwise the
  // starter. Resolving it in the initializer — before the first render — is
  // what stops a restored attempt from flashing starter code on the way in.
  const [contents, setContents] = useState<Record<string, string>>(
    () => loadDraft(problem) ?? starterFiles(problem),
  );
  const [activeFileId, setActiveFileId] = useState(problem.files[0].id);

  const debouncedContents = useDebouncedValue(contents, EDIT_DEBOUNCE_MS);
  const {
    entries,
    status,
    run,
    generation,
    previewRef,
    canEvaluate,
    evaluation,
    runTests,
    clearEvaluation,
  } = useRuntime(problem);
  const hasPreview = supportsPreview(problem);

  const activeFile = problem.files.find((file) => file.id === activeFileId) ?? problem.files[0];
  const modelPath = useCallback(
    (fileId: string) => `file:///${problem.id}/${fileId}`,
    [problem.id],
  );
  const ownedPaths = useMemo(
    () => problem.files.map((file) => modelPath(file.id)),
    [problem.files, modelPath],
  );

  // Every file always contributes, whichever one is being edited.
  const source = useMemo(
    () => ({ files: debouncedContents, entry: problem.files[0].id }),
    [debouncedContents, problem.files],
  );

  const updateActiveFile = useCallback(
    (next: string) => {
      setContents((previous) => {
        if (previous[activeFile.id] === next) return previous;
        // Results describe source that no longer exists, so they go — along
        // with any evaluation still running against it.
        clearEvaluation();
        return { ...previous, [activeFile.id]: next };
      });
    },
    [activeFile.id, clearEvaluation],
  );

  // Derived, not stored: an attempt exists exactly when the source differs from
  // the starter, which is also precisely when a draft should be on disk.
  const hasAttempt = !matchesStarter(problem, contents);

  // Saving rides the same settle as execution. Editing back to the starter
  // removes the draft, so merely opening a problem never leaves one behind.
  useEffect(() => {
    if (matchesStarter(problem, debouncedContents)) deleteDraft(problem.id);
    else saveDraft(problem, debouncedContents);
  }, [problem, debouncedContents]);

  /**
   * Throw away the current work and start this problem again. Deliberately
   * separate from finishing: it records nothing, because nothing was practised.
   */
  const handleReset = useCallback(() => {
    deleteDraft(problem.id);
    onAttemptEnded();
  }, [problem.id, onAttemptEnded]);

  /**
   * End the practice session. Passing the tests is not required — this says
   * "I am done for now", not "I was correct". Phase 8 will additionally record
   * a practice entry here; resetting will still record nothing.
   */
  const handleFinish = useCallback(() => {
    deleteDraft(problem.id);
    onAttemptEnded();
  }, [problem.id, onAttemptEnded]);

  const suite = problem.tests;
  const handleRunTests = useCallback(() => {
    if (!suite) return;
    // Deliberately `contents`, not the debounced copy: pressing Run Tests
    // immediately after typing must check what is on screen right now.
    runTests({ files: contents, entry: problem.files[0].id }, suite);
  }, [runTests, suite, contents, problem.files]);

  // Runs on mount and after every settled edit — but not on tab switches, which
  // change no source. The runtime disposes the previous execution and starts a
  // clean one; the console clears itself.
  useEffect(() => {
    run(source);
  }, [run, source, generation]);

  return (
    <div className="problem-workspace">
      <ProblemPanel
        problem={problem}
        actions={
          <AttemptActions hasAttempt={hasAttempt} onFinish={handleFinish} onReset={handleReset} />
        }
      />

      <main className={hasPreview ? 'workspace workspace-preview' : 'workspace'}>
        <section className="editor-pane">
          {problem.files.length > 1 ? (
            <FileTabs
              files={problem.files}
              activeFileId={activeFile.id}
              onSelect={setActiveFileId}
            />
          ) : (
            <header className="pane-header">
              <span>{activeFile.name}</span>
              <span className="hint">runs automatically as you type</span>
            </header>
          )}
          <div className="editor-host">
            <CodeEditor
              // One Monaco model per problem file, so undo/redo history and
              // diagnostics can never cross a file or problem boundary.
              path={modelPath(activeFile.id)}
              ownedPaths={ownedPaths}
              value={contents[activeFile.id] ?? ''}
              language={activeFile.language}
              onChange={updateActiveFile}
            />
          </div>
        </section>

        {hasPreview && (
          <section className="preview-pane">
            <header className="pane-header">
              <span>Preview</span>
              <span className="hint">sandboxed, rebuilt on every run</span>
            </header>
            {/* The runtime mounts its own isolated surface in here; the UI layer
                owns the container, never what goes inside it. */}
            <div className="preview-host" ref={previewRef} />
          </section>
        )}

        <OutputPane
          entries={entries}
          status={status}
          evaluation={evaluation}
          onRunTests={suite && canEvaluate ? handleRunTests : undefined}
        />
      </main>
    </div>
  );
}
