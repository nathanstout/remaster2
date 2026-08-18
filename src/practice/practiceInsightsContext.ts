import { createContext, useContext } from 'react';
import type { FolderHealthSummary, ReviewCandidate } from './folderHealth';
import type { ProblemHealth } from './health';
import type { ProblemPracticeSummary } from './historyQueries';

/**
 * Everything derived from taxonomy + history + the current time.
 *
 * Exposed through one boundary so a tree row, a folder page and the practice
 * tab all read the same computed values rather than each re-deriving them.
 */
export interface PracticeInsightsValue {
  /** The shared health clock, so every consumer agrees on "now". */
  now: Date;
  problemHealth: (problemId: string) => ProblemHealth;
  problemSummary: (problemId: string) => ProblemPracticeSummary;
  folderSummary: (folderId: string) => FolderHealthSummary;
  reviewCandidates: (folderId: string) => ReviewCandidate[];
  unpracticedProblems: (folderId: string) => string[];
}

export const PracticeInsightsContext = createContext<PracticeInsightsValue | null>(null);

export function usePracticeInsights(): PracticeInsightsValue {
  const value = useContext(PracticeInsightsContext);
  if (!value) {
    throw new Error('usePracticeInsights must be used inside a PracticeInsightsProvider.');
  }
  return value;
}
