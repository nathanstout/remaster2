import type { PracticeRecord } from '../types/practice';
import { calculateProblemHealth, latestRecord, type ProblemHealth } from './health';

/**
 * Pure queries over a history array.
 *
 * They take records rather than reading storage, so the reactive provider, and
 * later folder aggregation, can run the same logic over whatever set they hold
 * without every caller re-parsing localStorage.
 */

export function recordsForProblem(
  records: PracticeRecord[],
  problemId: string,
): PracticeRecord[] {
  return records.filter((record) => record.problemId === problemId);
}

/** Newest completion first. Returns a sorted copy; the input is untouched. */
export function sortedByRecency(records: PracticeRecord[]): PracticeRecord[] {
  return records
    .slice()
    .sort((a, b) => {
      const byTime = Date.parse(b.completedAt) - Date.parse(a.completedAt);
      return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
    });
}

export interface ProblemPracticeSummary {
  health: ProblemHealth;
  attemptCount: number;
  /** Newest first, for display. */
  records: PracticeRecord[];
  /** The mastery before the latest one, when there is an earlier session. */
  previousMastery?: number;
}

export function summarizeProblemPractice(
  records: PracticeRecord[],
  problemId: string,
  now: Date,
): ProblemPracticeSummary {
  const mine = recordsForProblem(records, problemId);
  const ordered = sortedByRecency(mine);
  const latest = latestRecord(mine);
  const previous = ordered.find((record) => record.id !== latest?.id);

  return {
    health: calculateProblemHealth(mine, now),
    attemptCount: mine.length,
    records: ordered,
    previousMastery: latest && previous ? previous.masteryScore : undefined,
  };
}
