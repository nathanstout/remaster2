import type { TestSuite } from './evaluation';

/**
 * Problem model.
 *
 * Problems are plain data. Nothing in the editor or runtime layer imports a
 * specific problem — they only ever see this shape, so swapping the local
 * lookup for `await api.getProblem(id)` later is a data-source change only.
 */

export type ProblemType = 'javascript' | 'react' | 'web';

/** A single editable document. Multi-file problems (web) just add more files. */
export interface ProblemFile {
  /** Stable id, unique within the problem. */
  id: string;
  /** Shown as the editor tab / label. */
  name: string;
  /** Monaco language id. */
  language: 'javascript' | 'typescript' | 'html' | 'css';
  starterCode: string;
}

export interface Problem {
  id: string;
  title: string;
  /** Markdown-ish plain text; rendered as simple paragraphs for now. */
  description: string;
  type: ProblemType;
  /**
   * Editable files. The JavaScript runtime uses the first file; future web
   * problems will hand the whole set to an iframe runtime.
   */
  files: ProblemFile[];
  /**
   * Optional checks for the solution. Absent means the problem is a pure
   * playground: the workspace simply offers no way to run tests.
   */
  tests?: TestSuite;
}
