import type { MasteryScore, PracticeRecord } from '../types/practice';

/**
 * The v1 knowledge-health model.
 *
 * Health is always *derived* from practice records plus the current time, never
 * stored. That is deliberate: this formula is a heuristic and will change with
 * use, and deriving it means every past session is re-scored under the new rule
 * instead of leaving stale numbers behind.
 *
 * Every tunable number lives here, so changing the model means editing this
 * module rather than hunting through components.
 */

/** Where health starts immediately after a session, by how well it went. */
export const MASTERY_STARTING_HEALTH: Record<MasteryScore, number> = {
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100,
};

/**
 * How long it takes for that starting health to halve.
 *
 * Assisted or failed recall becomes review-worthy within days; unaided recall
 * is trusted for weeks. Heuristic values, not science.
 */
export const MASTERY_HALF_LIFE_DAYS: Record<MasteryScore, number> = {
  1: 2,
  2: 5,
  3: 10,
  4: 21,
  5: 45,
};

/** Lower bound of each band, checked from strongest down. */
export const HEALTH_BAND_THRESHOLDS = {
  strong: 75,
  good: 50,
  'review-soon': 25,
} as const;

export type HealthBand = 'strong' | 'good' | 'review-soon' | 'at-risk';

/**
 * Never practised is its own state, not zero health.
 *
 * "No information" and "practised and since forgotten" call for opposite
 * actions, and a numeric 0 would make them indistinguishable to every caller.
 */
export type ProblemHealth =
  | { status: 'unpracticed' }
  | {
      status: 'practiced';
      /** 0–100, derived. */
      score: number;
      band: HealthBand;
      latestMastery: MasteryScore;
      lastPracticedAt: string;
      /** Fractional; format for display separately. */
      daysSincePractice: number;
    };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function healthBand(score: number): HealthBand {
  if (score >= HEALTH_BAND_THRESHOLDS.strong) return 'strong';
  if (score >= HEALTH_BAND_THRESHOLDS.good) return 'good';
  if (score >= HEALTH_BAND_THRESHOLDS['review-soon']) return 'review-soon';
  return 'at-risk';
}

function isMastery(value: unknown): value is MasteryScore {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/** A record we can actually score: parseable timestamp, mastery in range. */
function isUsable(record: PracticeRecord): boolean {
  return isMastery(record.masteryScore) && !Number.isNaN(Date.parse(record.completedAt));
}

/**
 * The most recent usable session.
 *
 * Chosen by `completedAt` rather than array position — history is append-only,
 * but health should not quietly depend on that. Sorting works on a copy so the
 * caller's array is never reordered, with `id` as a deterministic tie-breaker.
 */
export function latestRecord(records: PracticeRecord[]): PracticeRecord | undefined {
  return records
    .filter(isUsable)
    .slice()
    .sort((a, b) => {
      const byTime = Date.parse(b.completedAt) - Date.parse(a.completedAt);
      return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
    })[0];
}

/**
 * Current health for one problem.
 *
 * v1 scores from the latest session only. Older attempts stay in history and
 * remain visible, but do not drag down a newer strong recall — a formula that
 * averaged them would punish someone for having once been a beginner.
 */
export function calculateProblemHealth(records: PracticeRecord[], now: Date): ProblemHealth {
  const latest = latestRecord(records);
  if (!latest) return { status: 'unpracticed' };

  const mastery = latest.masteryScore;
  const starting = MASTERY_STARTING_HEALTH[mastery];
  const halfLife = MASTERY_HALF_LIFE_DAYS[mastery];

  // A clock skewed into the future must not make anything look healthier than
  // it was the moment it was recorded.
  const elapsedDays = Math.max(0, (now.getTime() - Date.parse(latest.completedAt)) / MS_PER_DAY);

  const decayed = starting * Math.pow(0.5, elapsedDays / halfLife);
  const score = Math.max(0, Math.min(100, Math.round(decayed)));

  return {
    status: 'practiced',
    score,
    band: healthBand(score),
    latestMastery: mastery,
    lastPracticedAt: latest.completedAt,
    daysSincePractice: elapsedDays,
  };
}
