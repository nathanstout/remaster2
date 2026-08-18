import { getProblemsInSubtree, type Taxonomy } from '../taxonomy';
import type { MasteryScore } from '../types/practice';
import type { HealthBand, ProblemHealth } from './health';
import { healthBand } from './health';

/**
 * Folder-level aggregation over the per-problem health model.
 *
 * Health and coverage answer different questions and are deliberately kept
 * apart: health is "how well retained is what I have practised", coverage is
 * "how much of this have I practised at all". Averaging unpractised problems in
 * as zeroes would conflate the two and make a barely-started folder look
 * forgotten rather than new.
 */
export type FolderHealthSummary =
  | { status: 'empty'; totalProblems: 0; practicedProblems: 0; unpracticedProblems: 0 }
  | {
      status: 'unpracticed';
      totalProblems: number;
      practicedProblems: 0;
      unpracticedProblems: number;
      coverage: 0;
    }
  | {
      status: 'practiced';
      totalProblems: number;
      practicedProblems: number;
      unpracticedProblems: number;
      /** practiced / total, 0–1. */
      coverage: number;
      /** Mean health of practised descendants only, 0–100. */
      score: number;
      band: HealthBand;
    };

/** Looks up current health for one problem; supplied by the caller's index. */
export type ProblemHealthLookup = (problemId: string) => ProblemHealth;

/**
 * Summarizes every descendant problem of a folder, at any depth.
 *
 * `getProblemsInSubtree` already returns each problem exactly once, so nothing
 * is double-counted when a parent aggregates its children. Empty child folders
 * contribute nothing, because aggregation is over descendant *problems*.
 */
export function summarizeFolderHealth(
  taxonomy: Taxonomy,
  folderId: string,
  healthOf: ProblemHealthLookup,
): FolderHealthSummary {
  const problemIds = getProblemsInSubtree(taxonomy, folderId);
  const total = problemIds.length;

  if (total === 0) {
    return { status: 'empty', totalProblems: 0, practicedProblems: 0, unpracticedProblems: 0 };
  }

  const practicedScores: number[] = [];
  for (const problemId of problemIds) {
    const health = healthOf(problemId);
    if (health.status === 'practiced') practicedScores.push(health.score);
  }

  if (practicedScores.length === 0) {
    return {
      status: 'unpracticed',
      totalProblems: total,
      practicedProblems: 0,
      unpracticedProblems: total,
      coverage: 0,
    };
  }

  // A plain mean: mastery and recency are already inside each problem's score,
  // so weighting them again here would count the same signal twice.
  const mean = practicedScores.reduce((sum, score) => sum + score, 0) / practicedScores.length;
  const score = Math.max(0, Math.min(100, Math.round(mean)));

  return {
    status: 'practiced',
    totalProblems: total,
    practicedProblems: practicedScores.length,
    unpracticedProblems: total - practicedScores.length,
    coverage: practicedScores.length / total,
    score,
    band: healthBand(score),
  };
}

export interface ReviewCandidate {
  problemId: string;
  score: number;
  band: HealthBand;
  latestMastery: MasteryScore;
  lastPracticedAt: string;
  daysSincePractice: number;
}

/**
 * Practised descendants, weakest retention first.
 *
 * Only problems with history appear: something never practised has not decayed,
 * it has not been learned here at all, which is a different action.
 *
 * Health already folds in mastery and elapsed time, so the later comparisons
 * are deterministic tie-breakers rather than additional penalties.
 */
export function getFolderReviewCandidates(
  taxonomy: Taxonomy,
  folderId: string,
  healthOf: ProblemHealthLookup,
): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];

  for (const problemId of getProblemsInSubtree(taxonomy, folderId)) {
    const health = healthOf(problemId);
    if (health.status !== 'practiced') continue;
    candidates.push({
      problemId,
      score: health.score,
      band: health.band,
      latestMastery: health.latestMastery,
      lastPracticedAt: health.lastPracticedAt,
      daysSincePractice: health.daysSincePractice,
    });
  }

  return candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    // Equally healthy: the one practised longer ago is the safer bet to revisit.
    if (a.daysSincePractice !== b.daysSincePractice) {
      return b.daysSincePractice - a.daysSincePractice;
    }
    if (a.latestMastery !== b.latestMastery) return a.latestMastery - b.latestMastery;
    return a.problemId.localeCompare(b.problemId);
  });
}

/**
 * Descendants with no practice history, in taxonomy order.
 *
 * Listed separately from review candidates, and never ranked as zero health.
 */
export function getUnpracticedProblemsInFolder(
  taxonomy: Taxonomy,
  folderId: string,
  healthOf: ProblemHealthLookup,
): string[] {
  return getProblemsInSubtree(taxonomy, folderId).filter(
    (problemId) => healthOf(problemId).status === 'unpracticed',
  );
}
