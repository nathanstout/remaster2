import { useMemo, type ReactNode } from 'react';
import { useNow } from '../hooks/useNow';
import { listProblems } from '../problems';
import { useTaxonomy } from '../taxonomy';
import {
  getFolderReviewCandidates,
  getUnpracticedProblemsInFolder,
  summarizeFolderHealth,
} from './folderHealth';
import { calculateProblemHealth } from './health';
import { summarizeProblemPractice } from './historyQueries';
import { usePracticeHistory } from './practiceHistoryContext';
import { PracticeInsightsContext, type PracticeInsightsValue } from './practiceInsightsContext';

/**
 * Computes every derived practice metric once per (history, taxonomy, time).
 *
 * Health for each problem is indexed up front rather than recomputed per tree
 * row, and folder summaries are memoized per folder id, so an expanded tree
 * does not re-filter the whole history for every row it draws. Nothing here is
 * persisted — these values are rebuilt whenever any input changes.
 */
export function PracticeInsightsProvider({ children }: { children: ReactNode }) {
  const { records } = usePracticeHistory();
  const { taxonomy } = useTaxonomy();
  const now = useNow();

  const value = useMemo<PracticeInsightsValue>(() => {
    // One pass over history per problem, shared by everything below.
    const recordsByProblem = new Map<string, typeof records>();
    for (const record of records) {
      const bucket = recordsByProblem.get(record.problemId);
      if (bucket) bucket.push(record);
      else recordsByProblem.set(record.problemId, [record]);
    }

    const healthById = new Map(
      listProblems().map((problem) => [
        problem.id,
        calculateProblemHealth(recordsByProblem.get(problem.id) ?? [], now),
      ]),
    );

    const problemHealth = (problemId: string) =>
      healthById.get(problemId) ?? calculateProblemHealth([], now);

    const folderCache = new Map<string, ReturnType<typeof summarizeFolderHealth>>();
    const folderSummary = (folderId: string) => {
      const cached = folderCache.get(folderId);
      if (cached) return cached;
      const summary = summarizeFolderHealth(taxonomy, folderId, problemHealth);
      folderCache.set(folderId, summary);
      return summary;
    };

    return {
      now,
      problemHealth,
      problemSummary: (problemId) =>
        summarizeProblemPractice(recordsByProblem.get(problemId) ?? [], problemId, now),
      folderSummary,
      reviewCandidates: (folderId) => getFolderReviewCandidates(taxonomy, folderId, problemHealth),
      unpracticedProblems: (folderId) =>
        getUnpracticedProblemsInFolder(taxonomy, folderId, problemHealth),
    };
  }, [records, taxonomy, now]);

  return (
    <PracticeInsightsContext.Provider value={value}>{children}</PracticeInsightsContext.Provider>
  );
}
