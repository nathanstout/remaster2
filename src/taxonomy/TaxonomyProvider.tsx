import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { loadPersistedTaxonomy, savePersistedTaxonomy } from '../persistence/taxonomy';
import { listProblems } from '../problems';
import { defaultTaxonomy } from './defaultTaxonomy';
import * as mutations from './mutations';
import { reconcileTaxonomy } from './reconcile';
import { TaxonomyContext, type TaxonomyContextValue } from './taxonomyContext';
import type { Taxonomy } from './types';

/**
 * Owns the active taxonomy: the user's organization, reconciled against the
 * current catalogue and persisted on every successful change.
 *
 * `defaultTaxonomy` stays untouched — it is the source-controlled fallback that
 * tells reconciliation where a newly added problem belongs.
 */
export function TaxonomyProvider({ children }: { children: ReactNode }) {
  const knownProblemIds = useMemo(() => listProblems().map((problem) => problem.id), []);

  // Resolved once, before first render: load, then reconcile with the catalogue.
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(() =>
    reconcileTaxonomy(loadPersistedTaxonomy(), defaultTaxonomy, knownProblemIds),
  );

  /**
   * Runs one domain operation. The candidate is already validated by the
   * mutation, so this only has to decide whether to adopt and persist it —
   * a rejection leaves state untouched and hands the reason back to the UI.
   */
  const apply = useCallback(
    (operation: (current: Taxonomy) => mutations.MutationResult): mutations.MutationResult => {
      let outcome: mutations.MutationResult = { ok: false, error: 'No change.' };
      setTaxonomy((current) => {
        outcome = operation(current);
        if (!outcome.ok) return current;
        savePersistedTaxonomy(outcome.taxonomy);
        return outcome.taxonomy;
      });
      return outcome;
    },
    [],
  );

  const value = useMemo<TaxonomyContextValue>(
    () => ({
      taxonomy,
      createFolder: (args) =>
        apply((current) => mutations.createFolder(current, args, knownProblemIds)),
      renameFolder: (args) =>
        apply((current) => mutations.renameFolder(current, args, knownProblemIds)),
      moveFolder: (args) => apply((current) => mutations.moveFolder(current, args, knownProblemIds)),
      moveProblem: (args) =>
        apply((current) => mutations.moveProblem(current, args, knownProblemIds)),
      deleteFolder: (args) =>
        apply((current) => mutations.deleteFolder(current, args, knownProblemIds)),
    }),
    [taxonomy, apply, knownProblemIds],
  );

  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>;
}
