import { useCallback, useEffect, useRef, useState } from 'react';
import { createRuntime } from '../runtime/createRuntime';
import type { Problem } from '../types/problem';
import type {
  ConsoleLevel,
  Runtime,
  RuntimeEvent,
  RuntimeSource,
  SerializedValue,
} from '../types/runtime';

export type ConsoleEntry =
  | { id: number; kind: 'console'; level: ConsoleLevel; args: SerializedValue[] }
  | { id: number; kind: 'error'; message: string; stack?: string };

export type RunStatus = 'idle' | 'running' | 'finished' | 'timeout' | 'error';

export interface RuntimeController {
  entries: ConsoleEntry[];
  status: RunStatus;
  run: (source: RuntimeSource) => void;
  /**
   * Increments whenever a new runtime instance is created. Callers include it
   * in their run effect so the current source is re-executed against a
   * replacement runtime (problem switch, or React's dev-mode remount).
   */
  generation: number;
}

/**
 * Owns the runtime instance for a problem and turns its event stream into
 * render-ready state. This is the only place the UI touches the runtime layer.
 */
export function useRuntime(problem: Problem | undefined): RuntimeController {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [generation, setGeneration] = useState(0);
  const runtimeRef = useRef<Runtime | null>(null);

  useEffect(() => {
    if (!problem) return;

    let entryId = 0;

    const handleEvent = (event: RuntimeEvent): void => {
      switch (event.type) {
        case 'start':
          // Every run begins from an empty console.
          setEntries([]);
          setStatus('running');
          break;
        case 'console':
          setEntries((prev) => [
            ...prev,
            { id: entryId++, kind: 'console', level: event.level, args: event.args },
          ]);
          break;
        case 'error':
          setEntries((prev) => [
            ...prev,
            { id: entryId++, kind: 'error', message: event.message, stack: event.stack },
          ]);
          break;
        case 'complete':
          setStatus(event.reason === 'finished' ? 'finished' : event.reason);
          break;
      }
    };

    const runtime = createRuntime(problem, handleEvent);
    runtimeRef.current = runtime;
    setGeneration((value) => value + 1);

    return () => {
      runtimeRef.current = null;
      runtime.dispose();
    };
  }, [problem]);

  const run = useCallback((source: RuntimeSource) => {
    runtimeRef.current?.run(source);
  }, []);

  return { entries, status, run, generation };
}
