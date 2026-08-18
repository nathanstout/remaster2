import { useEffect, useState } from 'react';
import { ConsoleBody } from '../Console/Console';
import { STATUS_LABEL } from './runStatusLabel';
import { TestResults } from '../TestResults/TestResults';
import type { ConsoleEntry, EvaluationState, RunStatus } from '../../hooks/useRuntime';
import { PracticePanel } from '../PracticePanel/PracticePanel';
import type { ProblemPracticeSummary } from '../../practice/historyQueries';

interface OutputPaneProps {
  entries: ConsoleEntry[];
  status: RunStatus;
  evaluation: EvaluationState;
  /** Absent when the problem has no suite, or its runtime cannot evaluate. */
  onRunTests?: () => void;
  summary: ProblemPracticeSummary;
  now: Date;
}

type Tab = 'console' | 'tests' | 'practice';

/**
 * The console and test results, sharing one pane.
 *
 * Tabs rather than a new region: the two are alternative readings of the same
 * run, and the workspace already has as many panes as it can usefully show.
 * Starting a run switches over, so results are never hidden behind the console.
 */
export function OutputPane({
  entries,
  status,
  evaluation,
  onRunTests,
  summary,
  now,
}: OutputPaneProps) {
  const [tab, setTab] = useState<Tab>('console');
  const evaluationStatus = evaluation.status;

  useEffect(() => {
    if (evaluationStatus !== 'idle') setTab('tests');
  }, [evaluationStatus]);

  const running = evaluationStatus === 'running';

  return (
    <section className="console">
      <header className="pane-header">
        <div className="output-tabs" role="tablist" aria-label="Output">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'console'}
            className={tab === 'console' ? 'selected' : undefined}
            onClick={() => setTab('console')}
          >
            Console
          </button>
          {onRunTests && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'tests'}
              className={tab === 'tests' ? 'selected' : undefined}
              onClick={() => setTab('tests')}
            >
              Tests
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'practice'}
            className={tab === 'practice' ? 'selected' : undefined}
            onClick={() => setTab('practice')}
          >
            Practice
          </button>
        </div>

        <div className="pane-header-actions">
          {tab === 'console' && (
            <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
          )}
          {onRunTests && (
            <button type="button" className="run-tests" disabled={running} onClick={onRunTests}>
              {running ? 'Running tests…' : 'Run Tests'}
            </button>
          )}
        </div>
      </header>

      {tab === 'console' && <ConsoleBody entries={entries} status={status} />}
      {tab === 'tests' && <TestResults evaluation={evaluation} />}
      {tab === 'practice' && <PracticePanel summary={summary} now={now} />}
    </section>
  );
}
