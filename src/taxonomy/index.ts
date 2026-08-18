import { listProblems } from '../problems';
import { defaultTaxonomy } from './defaultTaxonomy';
import { assertValidTaxonomy } from './validation';

export * from './types';
export * from './queries';
export { defaultTaxonomy } from './defaultTaxonomy';
export { validateTaxonomy } from './validation';
export { reconcileTaxonomy } from './reconcile';
export * from './mutations';
export { TaxonomyProvider } from './TaxonomyProvider';
export { useTaxonomy, type TaxonomyContextValue } from './taxonomyContext';

// Checked once at startup: a mistake in the hand-written taxonomy should surface
// immediately, not as a silently missing problem in the tree.
assertValidTaxonomy(
  defaultTaxonomy,
  listProblems().map((problem) => problem.id),
);
