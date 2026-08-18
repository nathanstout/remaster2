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
    { id: 'js-objects', name: 'Objects', parentId: 'javascript' },

    { id: 'react', name: 'React', parentId: null },
    { id: 'react-state', name: 'State', parentId: 'react' },

    { id: 'browser', name: 'Browser / DOM', parentId: null },
    { id: 'browser-events', name: 'Events', parentId: 'browser' },
  ],
  placements: [
    { problemId: 'debounce', folderId: 'js-functions' },
    { problemId: 'my-map', folderId: 'js-arrays' },
    { problemId: 'flatten-object', folderId: 'js-objects' },
    { problemId: 'counter', folderId: 'react-state' },
    { problemId: 'character-counter', folderId: 'browser-events' },
  ],
};
