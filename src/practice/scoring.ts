import type { MasteryScore, PracticeOutcome } from '../types/practice';

export interface MasteryInput {
  outcome: PracticeOutcome;
  totalHints: number;
  revealedHintCount: number;
  solutionRevealed: boolean;
}

/**
 * How well the problem was recalled, on a 1–5 scale.
 *
 * Pure and deliberately transparent: mastery reflects the *outcome* and how
 * much help was needed, and nothing else. Failed test runs are tracked but
 * excluded on purpose — running tests is ordinary development, and penalising
 * it would push people to test less, which is the opposite of useful.
 */
export function calculateMastery({
  outcome,
  totalHints,
  revealedHintCount,
  solutionRevealed,
}: MasteryInput): MasteryScore {
  // Ending without solving says nothing was recalled, whatever else happened.
  if (outcome === 'gave-up') return 1;

  // Reading the full answer means this was recognition, not recall — even if a
  // correct solution was written afterwards.
  if (solutionRevealed) return 1;

  if (totalHints === 0 || revealedHintCount <= 0) return 5;

  // Integer comparisons rather than fractions, so the 1/3 and 2/3 boundaries
  // are exact for every hint count instead of depending on float rounding.
  if (revealedHintCount * 3 <= totalHints) return 4;
  if (revealedHintCount * 3 <= totalHints * 2) return 3;
  return 2;
}
