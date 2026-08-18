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

/** One step of graded help. Ordered; revealed one at a time. */
export interface ProblemHint {
  /** Stable within the problem — practice records store these ids. */
  id: string;
  content: string;
}

/**
 * A clean reference implementation, keyed by the same file ids as `files[]`.
 *
 * Keyed rather than a single string so multi-file problems can show a complete
 * worked answer, not just their entry file.
 */
export interface ProblemSolution {
  files: Record<string, string>;
}

export interface Problem {
  id: string;
  title: string;
  /**
   * Bumped whenever starter code or file ids change materially. Saved drafts
   * written against an older version are discarded, so editing a problem during
   * development cannot leave mysterious stale code behind.
   */
  version: number;
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
  /** Progressive help, in order. Absent or empty means no hints are offered. */
  hints?: ProblemHint[];
  /** The textbook answer, shown read-only and never written into the editor. */
  solution?: ProblemSolution;
}
