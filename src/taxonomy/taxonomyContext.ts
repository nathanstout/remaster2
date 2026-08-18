import { createContext, useContext } from 'react';
import type { MutationResult } from './mutations';
import type { Taxonomy } from './types';

/**
 * The active taxonomy plus the operations allowed on it.
 *
 * Every mutation returns a result rather than throwing: the UI decides whether
 * to close a form or show why the change was refused.
 */
export interface TaxonomyContextValue {
  taxonomy: Taxonomy;
  createFolder: (args: { name: string; parentId: string | null }) => MutationResult;
  renameFolder: (args: { folderId: string; name: string }) => MutationResult;
  moveFolder: (args: { folderId: string; parentId: string | null }) => MutationResult;
  moveProblem: (args: { problemId: string; folderId: string }) => MutationResult;
  deleteFolder: (args: { folderId: string }) => MutationResult;
}

export const TaxonomyContext = createContext<TaxonomyContextValue | null>(null);

export function useTaxonomy(): TaxonomyContextValue {
  const value = useContext(TaxonomyContext);
  if (!value) throw new Error('useTaxonomy must be used inside a TaxonomyProvider.');
  return value;
}
