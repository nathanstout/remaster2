import { Fragment, useEffect, useRef } from 'react';
import type { ConsoleEntry, RunStatus } from '../../hooks/useRuntime';
import { ConsoleValue } from './ConsoleValue';

interface ConsoleProps {
  entries: ConsoleEntry[];
  status: RunStatus;
}

const STATUS_LABEL: Record<RunStatus, string> = {
  idle: 'idle',
  running: 'running…',
  finished: 'finished',
  timeout: 'terminated',
  error: 'error',
};

/**
 * Presentational console. It renders whatever the runtime produced, in order,
 * and has no idea where the output came from.
 */
export function Console({ entries, status }: ConsoleProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries]);

  return (
    <section className="console">
      <header className="pane-header">
        <span>Console</span>
        <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
      </header>

      <div className="console-body">
        {entries.length === 0 && (
          <p className="console-empty">
            {status === 'running' ? 'Running…' : 'No output.'}
          </p>
        )}

        {entries.map((entry) =>
          entry.kind === 'console' ? (
            <div key={entry.id} className={`console-row level-${entry.level}`}>
              {entry.args.map((arg, index) => (
                <Fragment key={index}>
                  {index > 0 && ' '}
                  <ConsoleValue value={arg} topLevel />
                </Fragment>
              ))}
            </div>
          ) : (
            <div key={entry.id} className="console-row level-error">
              <div>{entry.message}</div>
              {entry.stack && <pre className="console-stack">{entry.stack}</pre>}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
