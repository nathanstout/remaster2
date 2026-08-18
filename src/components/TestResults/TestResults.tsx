import type { EvaluationState } from '../../hooks/useRuntime';
import { ConsoleValue } from '../Console/ConsoleValue';
import type { TestResult } from '../../types/evaluation';

const STATUS_MARK: Record<TestResult['status'], string> = {
  passed: '✓',
  failed: '✕',
  'timed-out': '⏱',
};

function Result({ result }: { result: TestResult }) {
  return (
    <li className={`test-result test-${result.status}`}>
      <div className="test-headline">
        <span className="test-mark">{STATUS_MARK[result.status]}</span>
        <span className="test-name">{result.name}</span>
      </div>

      {result.message && <p className="test-message">{result.message}</p>}

      {result.expected !== undefined && (
        <dl className="test-comparison">
          <dt>Expected</dt>
          <dd>
            <ConsoleValue value={result.expected} />
          </dd>
          <dt>Received</dt>
          <dd>
            {result.actual !== undefined ? <ConsoleValue value={result.actual} /> : <em>nothing</em>}
          </dd>
        </dl>
      )}
    </li>
  );
}

/** Reads out an evaluation as it happens: one line per case, then a summary. */
export function TestResults({ evaluation }: { evaluation: EvaluationState }) {
  const { status, results, total } = evaluation;

  if (status === 'idle') {
    return (
      <div className="test-panel">
        <p className="console-empty">Run the tests to check your solution.</p>
      </div>
    );
  }

  const passed = results.filter((result) => result.status === 'passed').length;

  return (
    <div className="test-panel">
      <ul className="test-list">
        {results.map((result) => (
          <Result key={result.id} result={result} />
        ))}
      </ul>

      {status === 'running' ? (
        <p className="test-summary running">
          Running tests… {results.length} of {total}
        </p>
      ) : (
        <p className={`test-summary ${passed === total ? 'all-passed' : 'some-failed'}`}>
          {passed === total ? '✓ ' : ''}
          {passed} / {total} tests passed
        </p>
      )}
    </div>
  );
}
