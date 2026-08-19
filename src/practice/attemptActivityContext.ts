import { createContext, useContext } from 'react';

/**
 * Whether a problem currently has practice work worth protecting.
 *
 * Storage is debounced, so "is there an attempt?" cannot be answered from
 * localStorage alone: code typed a moment ago is real work that has not been
 * written yet. The mounted workspace already derives exactly this — source
 * differing from the starter, a revealed hint, a revealed solution, or a test
 * run — so it publishes that value here rather than anything re-deriving it,
 * and certainly rather than another component reading the editor.
 *
 * Read imperatively at the moment a decision is made, never subscribed to: this
 * changes on every keystroke and must not re-render anything.
 */
export interface AttemptActivityValue {
  /** Called by the workspace whenever its own attempt state changes. */
  report: (problemId: string, hasAttempt: boolean) => void;
  /** Called when a workspace unmounts, so a stale report cannot outlive it. */
  clearReport: (problemId: string) => void;
  /**
   * True when the problem has meaningful work: live activity from a mounted
   * workspace, or a stored attempt when no workspace is reporting.
   */
  hasMeaningfulAttempt: (problemId: string) => boolean;
}

export const AttemptActivityContext = createContext<AttemptActivityValue | null>(null);

export function useAttemptActivity(): AttemptActivityValue {
  const value = useContext(AttemptActivityContext);
  if (!value) {
    throw new Error('useAttemptActivity must be used inside an AttemptActivityProvider.');
  }
  return value;
}
