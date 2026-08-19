import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { loadAttempt } from '../persistence/attempts';
import { getProblem } from '../problems';
import { AttemptActivityContext, type AttemptActivityValue } from './attemptActivityContext';

/**
 * Tracks which problems currently have unsaved-or-saved practice work.
 *
 * Deliberately a ref rather than state: reports arrive on every keystroke, and
 * nothing renders from them — they are read at the instant an action needs to
 * decide whether it is about to destroy something. That keeps a safety check
 * off the typing path entirely.
 */
export function AttemptActivityProvider({ children }: { children: ReactNode }) {
  const live = useRef(new Map<string, boolean>());

  const report = useCallback((problemId: string, hasAttempt: boolean) => {
    live.current.set(problemId, hasAttempt);
  }, []);

  const clearReport = useCallback((problemId: string) => {
    live.current.delete(problemId);
  }, []);

  const hasMeaningfulAttempt = useCallback((problemId: string): boolean => {
    // Either source is enough. They agree in practice — a workspace with no
    // attempt deletes the stored one — but a check that decides whether to
    // discard work should never be the place that assumes so.
    if (live.current.get(problemId) === true) return true;
    const problem = getProblem(problemId);
    return problem ? loadAttempt(problem) !== null : false;
  }, []);

  const value = useMemo<AttemptActivityValue>(
    () => ({ report, clearReport, hasMeaningfulAttempt }),
    [report, clearReport, hasMeaningfulAttempt],
  );

  return (
    <AttemptActivityContext.Provider value={value}>{children}</AttemptActivityContext.Provider>
  );
}
