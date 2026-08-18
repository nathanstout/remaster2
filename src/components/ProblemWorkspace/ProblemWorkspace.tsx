import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssistancePanel } from '../AssistancePanel/AssistancePanel';
import { AttemptActions } from '../AttemptActions/AttemptActions';
import { CodeEditor } from '../CodeEditor/CodeEditor';
import { OutputPane } from '../OutputPane/OutputPane';
import { FileTabs } from '../FileTabs/FileTabs';
import { ProblemContextPanel } from '../ProblemContextPanel/ProblemContextPanel';
import { SolutionViewer } from '../SolutionViewer/SolutionViewer';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRuntime, type EvaluationSummary } from '../../hooks/useRuntime';
import { deleteAttempt, emptyProgress, loadAttempt, saveAttempt } from '../../persistence/attempts';

import { summarizeProblemPractice } from '../../practice/historyQueries';
import { usePracticeHistory } from '../../practice/practiceHistoryContext';
import { calculateMastery } from '../../practice/scoring';
import { useNow } from '../../hooks/useNow';
import { HealthBadge } from '../PracticePanel/HealthBadge';
import { matchesStarter, starterFiles } from '../../problems';
import { supportsPreview } from '../../runtime/createRuntime';
import type { AttemptProgress, PracticeOutcome, PracticeRecord } from '../../types/practice';
import type { Problem } from '../../types/problem';

/** How long the user has to stop typing before we re-execute. */
const EDIT_DEBOUNCE_MS = 400;

/** Distinguishes a practice test run from the one that ends the session. */
type EvaluationMode = 'practice' | 'submit';

function newRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `record-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Wires the layers together for one problem:
 *   problem -> editor(s) -> (debounce) -> runtime -> console (+ preview)
 * and owns the practice session running on top of them.
 *
 * Renders as a fragment of two shell columns — the reference panel and the
 * coding area — so the app is genuinely three columns while everything about
 * the attempt (source, hints, solution reveal, counters) stays owned here in
 * one place rather than being split across them.
 *
 * Mounted with a key that changes per problem and per attempt, so ending a
 * session replaces this subtree outright: sources reseed from the problem
 * definition, console state is dropped, Monaco models are disposed, and
 * `useRuntime`'s cleanup disposes the runtime.
 */
export function ProblemWorkspace({
  problem,
  onAttemptEnded,
}: {
  problem: Problem;
  /**
   * Asks the parent for a clean workspace. A record is passed when a practice
   * session was actually recorded; resetting passes nothing, because nothing
   * was practised.
   */
  onAttemptEnded: (record?: PracticeRecord) => void;
}) {
  // Source and progress are resolved together, before the first render, so a
  // resumed attempt never flashes starter code or forgets what it has cost.
  const restored = useMemo(() => loadAttempt(problem), [problem]);
  const [contents, setContents] = useState<Record<string, string>>(
    () => restored?.files ?? starterFiles(problem),
  );
  const [progress, setProgress] = useState<AttemptProgress>(() =>
    restored
      ? {
          startedAt: restored.startedAt,
          revealedHintIds: restored.revealedHintIds,
          solutionRevealed: restored.solutionRevealed,
          testRuns: restored.testRuns,
          failedTestRuns: restored.failedTestRuns,
        }
      : emptyProgress(),
  );

  const [activeFileId, setActiveFileId] = useState(problem.files[0].id);
  const [showSolution, setShowSolution] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const { records, append } = usePracticeHistory();
  const now = useNow();
  // Derived on every render from stored records and the clock — never cached
  // next to the problem, so a new session updates it with no reload.
  const summary = useMemo(
    () => summarizeProblemPractice(records, problem.id, now),
    [records, problem.id, now],
  );

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
  const modelPath = useCallback((fileId: string) => `file:///${problem.id}/${fileId}`, [problem.id]);
  const ownedPaths = useMemo(
    () => problem.files.map((file) => modelPath(file.id)),
    [problem.files, modelPath],
  );

  // Every file always contributes, whichever one is being edited.
  const source = useMemo(
    () => ({ files: debouncedContents, entry: problem.files[0].id }),
    [debouncedContents, problem.files],
  );

  /**
   * Any meaningful practice activity, not just edited source.
   *
   * Revealing a hint or running tests costs something, so returning the code to
   * the starter must not erase the fact that it happened.
   */
  const sourceChanged = !matchesStarter(problem, contents);
  const hasAttempt =
    sourceChanged ||
    progress.revealedHintIds.length > 0 ||
    progress.solutionRevealed ||
    progress.testRuns > 0;

  // Saving rides the same settle as execution, and covers progress too, so a
  // revealed hint survives a reload even if the source never changed.
  useEffect(() => {
    if (!hasAttempt) {
      deleteAttempt(problem.id);
      return;
    }
    saveAttempt(problem, debouncedContents, progress);
  }, [problem, debouncedContents, progress, hasAttempt]);

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

  const revealHint = useCallback((hintId: string) => {
    setProgress((previous) =>
      previous.revealedHintIds.includes(hintId)
        ? previous
        : { ...previous, revealedHintIds: [...previous.revealedHintIds, hintId] },
    );
  }, []);

  const revealSolution = useCallback(() => {
    setProgress((previous) => ({ ...previous, solutionRevealed: true }));
    setShowSolution(true);
  }, []);

  /**
   * Writes the session to history, then ends it.
   *
   * Ordered deliberately: if the record cannot be stored, the attempt is left
   * completely intact and the failure is surfaced, rather than the work being
   * destroyed on the strength of a save that never happened.
   */
  const finalize = useCallback(
    (
      outcome: PracticeOutcome,
      finalTests: { passed: number; total: number },
      /**
       * The session as of this moment. Passed explicitly because a submission
       * finalizes in the same tick that counts its own test run, and reading
       * `progress` from state here would record the value from before it.
       */
      snapshot: AttemptProgress = progress,
    ): boolean => {
      const record: PracticeRecord = {
        id: newRecordId(),
        problemId: problem.id,
        startedAt: snapshot.startedAt,
        completedAt: new Date().toISOString(),
        outcome,
        masteryScore: calculateMastery({
          outcome,
          totalHints: problem.hints?.length ?? 0,
          revealedHintCount: snapshot.revealedHintIds.length,
          solutionRevealed: snapshot.solutionRevealed,
        }),
        revealedHintIds: [...snapshot.revealedHintIds],
        solutionRevealed: snapshot.solutionRevealed,
        testRuns: snapshot.testRuns,
        failedTestRuns: snapshot.failedTestRuns,
        finalTestsPassed: finalTests.passed,
        finalTestsTotal: finalTests.total,
      };

      if (!append(record)) {
        setRecordError('Could not save this practice session. Your attempt is untouched.');
        return false;
      }

      deleteAttempt(problem.id);
      onAttemptEnded(record);
      return true;
    },
    [problem, progress, onAttemptEnded, append],
  );

  const suite = problem.tests;
  /** Guards against a second Submit landing while the first is still settling. */
  const submitInFlight = useRef(false);

  const evaluate = useCallback(
    (mode: EvaluationMode) => {
      if (!suite) return;
      if (mode === 'submit') {
        if (submitInFlight.current) return;
        submitInFlight.current = true;
        setSubmitting(true);
        setRecordError(null);
      }

      const onComplete = (summary: EvaluationSummary): void => {
        // Both kinds of run are test executions during this attempt, so both
        // count. Only a run that had failures counts as a failed run.
        const counted: AttemptProgress = {
          ...progress,
          testRuns: progress.testRuns + 1,
          failedTestRuns: progress.failedTestRuns + (summary.failed > 0 ? 1 : 0),
        };
        setProgress(counted);

        if (mode !== 'submit') return;

        // A failed submission is just a test run: the attempt stays open.
        if (summary.failed === 0 && summary.total > 0) {
          finalize('solved', { passed: summary.passed, total: summary.total }, counted);
        }
        submitInFlight.current = false;
        setSubmitting(false);
      };

      // Deliberately `contents`, not the debounced copy: submitting right after
      // typing must evaluate what is on screen right now.
      runTests({ files: contents, entry: problem.files[0].id }, suite, { onComplete });
    },
    [runTests, suite, contents, problem.files, finalize, progress],
  );

  const handleReset = useCallback(() => {
    // Records nothing: this is starting over, not a finished practice session.
    deleteAttempt(problem.id);
    onAttemptEnded();
  }, [problem.id, onAttemptEnded]);

  const handleFinishWithoutSolving = useCallback(() => {
    setRecordError(null);
    finalize('gave-up', { passed: 0, total: suite?.cases.length ?? 0 });
  }, [finalize, suite]);

  // Runs on mount and after every settled edit — but not on tab switches, which
  // change no source. The runtime disposes the previous execution and starts a
  // clean one; the console clears itself.
  useEffect(() => {
    run(source);
  }, [run, source, generation]);

  return (
    <>
      <ProblemContextPanel
        problem={problem}
        health={<HealthBadge health={summary.health} />}
        assistance={
          <AssistancePanel
            problem={problem}
            revealedHintIds={progress.revealedHintIds}
            solutionRevealed={progress.solutionRevealed}
            busy={submitting}
            onRevealHint={revealHint}
            onRevealSolution={revealSolution}
            onOpenSolution={() => setShowSolution(true)}
          />
        }
        actions={
          <AttemptActions
            hasAttempt={hasAttempt}
            busy={submitting}
            error={recordError}
            onSubmit={suite && canEvaluate ? () => evaluate('submit') : undefined}
            onFinishWithoutSolving={handleFinishWithoutSolving}
            onReset={handleReset}
          />
        }
      />

      <div className="workspace-area">
        {/* Still a drawer over the coding area rather than inline in the
            reference column, so a long solution cannot crowd out the hints. */}
        {showSolution && problem.solution && (
          <SolutionViewer problem={problem} onClose={() => setShowSolution(false)} />
        )}

        <main className={hasPreview ? 'workspace workspace-preview' : 'workspace'}>
          <section className="editor-pane">
            {problem.files.length > 1 ? (
              <FileTabs files={problem.files} activeFileId={activeFile.id} onSelect={setActiveFileId} />
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
            onRunTests={suite && canEvaluate ? () => evaluate('practice') : undefined}
            summary={summary}
            now={now}
          />
        </main>
      </div>
    </>
  );
}
