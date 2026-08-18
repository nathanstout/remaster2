import { useMemo } from 'react';
import { getProblem } from '../problems';
import type { Problem } from '../types/problem';

/**
 * Loads a problem by id.
 *
 * Synchronous today because problems are local data. When they move behind an
 * API this becomes a fetch + loading state and nothing outside this hook has
 * to change.
 */
export function useProblem(id: string): Problem | undefined {
  return useMemo(() => getProblem(id), [id]);
}
