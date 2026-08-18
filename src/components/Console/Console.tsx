import { Fragment, useEffect, useRef } from 'react';
import type { ConsoleEntry, RunStatus } from '../../hooks/useRuntime';
import { ConsoleValue } from './ConsoleValue';

/**
 * The scrolling output list. Renders whatever the runtime produced, in order,
 * and has no idea where the output came from.
 */
export function ConsoleBody({ entries, status }: { entries: ConsoleEntry[]; status: RunStatus }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries]);

  return (
    <div className="console-body">
      {entries.length === 0 && (
        <p className="console-empty">{status === 'running' ? 'Running…' : 'No output.'}</p>
      )}

      {entries.map((entry) =>
        entry.kind === 'notice' ? (
          <div key={entry.id} className="console-row level-notice">
            {entry.message}
          </div>
        ) : entry.kind === 'console' ? (
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
  );
}
