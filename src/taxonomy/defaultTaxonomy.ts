import type { Taxonomy } from './types';

/**
 * The source-controlled taxonomy.
 *
 * Read-only in this phase. Phase 7B will let the user edit a copy of this and
 * persist it; folder ids stay stable so that edit history and problem routes
 * survive any renaming or moving.
 */
export const defaultTaxonomy: Taxonomy = {
  folders: [
    { id: 'javascript', name: 'JavaScript', parentId: null },
    { id: 'js-functions', name: 'Functions', parentId: 'javascript' },
    { id: 'js-arrays', name: 'Arrays', parentId: 'javascript' },

    { id: 'react', name: 'React', parentId: null },
    { id: 'react-state', name: 'State', parentId: 'react' },

    { id: 'browser', name: 'Browser / DOM', parentId: null },
    { id: 'browser-events', name: 'Events', parentId: 'browser' },

    // A curriculum rather than a filing cabinet: the sections are ordered, and
    // so are the problems inside them. Nothing is locked, but the sequence is
    // the recommended path through recursive traversal.
    { id: 'tree-traversal', name: 'Tree Traversal Study Plan', parentId: null },
    { id: 'tt-recursion-basics', name: '1. Recursion Basics', parentId: 'tree-traversal' },
    { id: 'tt-traversing-collecting', name: '2. Traversing & Collecting', parentId: 'tree-traversal' },
    { id: 'tt-paths-depth-context', name: '3. Paths, Depth & Context', parentId: 'tree-traversal' },
    { id: 'tt-real-world-data', name: '4. Real-World Nested Data', parentId: 'tree-traversal' },
    { id: 'tt-tree-transformations', name: '5. Tree Transformations', parentId: 'tree-traversal' },
  ],
  placements: [
    { problemId: 'debounce', folderId: 'js-functions' },
    { problemId: 'my-map', folderId: 'js-arrays' },
    { problemId: 'counter', folderId: 'react-state' },
    { problemId: 'character-counter', folderId: 'browser-events' },

    // Listed in curriculum order. `flatten-object` predates the study plan and
    // is placed by its existing id, so its history and health carry over.
    { problemId: 'count-nested-numbers', folderId: 'tt-recursion-basics' },
    { problemId: 'sum-nested-array', folderId: 'tt-recursion-basics' },
    { problemId: 'find-max-nested', folderId: 'tt-recursion-basics' },

    { problemId: 'count-tree-nodes', folderId: 'tt-traversing-collecting' },
    { problemId: 'collect-tree-values', folderId: 'tt-traversing-collecting' },
    { problemId: 'tree-contains-value', folderId: 'tt-traversing-collecting' },
    { problemId: 'find-node-by-id', folderId: 'tt-traversing-collecting' },

    { problemId: 'max-tree-depth', folderId: 'tt-paths-depth-context' },
    { problemId: 'values-at-depth', folderId: 'tt-paths-depth-context' },
    { problemId: 'find-path-to-node', folderId: 'tt-paths-depth-context' },
    { problemId: 'root-to-leaf-paths', folderId: 'tt-paths-depth-context' },

    { problemId: 'flatten-nested-array', folderId: 'tt-real-world-data' },
    { problemId: 'flatten-depth', folderId: 'tt-real-world-data' },
    { problemId: 'flatten-object', folderId: 'tt-real-world-data' },
    { problemId: 'flatten-employees', folderId: 'tt-real-world-data' },
    { problemId: 'management-chain', folderId: 'tt-real-world-data' },
    { problemId: 'list-file-paths', folderId: 'tt-real-world-data' },

    { problemId: 'map-tree', folderId: 'tt-tree-transformations' },
    { problemId: 'remove-nodes', folderId: 'tt-tree-transformations' },
    { problemId: 'filter-tree-preserving-paths', folderId: 'tt-tree-transformations' },
  ],
};
