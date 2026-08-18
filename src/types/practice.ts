/**
 * The record of one finished practice session.
 *
 * Deliberately references only `problemId`: a problem can be renamed, moved
 * between folders, or reorganized entirely without any history needing a
 * rewrite. Nothing here is derived state — no aggregate health, no current
 * mastery — only what happened during that one session.
 */
export type PracticeOutcome = 'solved' | 'gave-up';

export type MasteryScore = 1 | 2 | 3 | 4 | 5;

export interface PracticeRecord {
  id: string;
  problemId: string;

  startedAt: string;
  completedAt: string;

  outcome: PracticeOutcome;
  masteryScore: MasteryScore;

  /** Exactly which hints were consulted, not just how many. */
  revealedHintIds: string[];
  solutionRevealed: boolean;

  testRuns: number;
  failedTestRuns: number;

  finalTestsPassed: number;
  finalTestsTotal: number;
}

/**
 * The in-progress session for one problem.
 *
 * An evolution of the Phase 6 draft: it still carries the editable source, but
 * now also the assistance and activity that scoring depends on, so leaving and
 * returning cannot quietly reset what a session has cost.
 */
export interface ActiveAttempt {
  /** Schema of this record, so the reader can migrate or reject older shapes. */
  version: number;
  /** The problem definition it was written against. */
  problemVersion: number;

  files: Record<string, string>;

  startedAt: string;
  updatedAt: string;

  revealedHintIds: string[];
  solutionRevealed: boolean;

  testRuns: number;
  failedTestRuns: number;
}

/** The parts of an attempt that are not source text. */
export type AttemptProgress = Omit<
  ActiveAttempt,
  'version' | 'problemVersion' | 'files' | 'updatedAt'
>;
