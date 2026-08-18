/**
 * Most console messages a single run may produce.
 *
 * Enforced in two places for two different reasons: the host caps what it
 * stores and renders (that is what protects the UI, and it is authoritative,
 * covering every runtime), while each execution context stops *posting* once it
 * passes the same mark, so a runaway loop cannot keep saturating the message
 * channel long after the output stopped being useful.
 */
export const MAX_CONSOLE_ENTRIES = 500;

/**
 * Execution contexts post one message beyond the host's budget, which is what
 * lets the host notice the overflow and show its truncation notice.
 */
export const CONSOLE_POST_LIMIT = MAX_CONSOLE_ENTRIES + 1;
