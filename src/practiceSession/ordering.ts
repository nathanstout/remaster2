import { getChildFolders, getDirectProblems, type Taxonomy } from '../taxonomy';

/**
 * Turning a folder subtree into a queue order.
 *
 * Pure functions over a `Taxonomy` value, with randomness injected, so the
 * shuffle can be exercised deterministically and neither mode needs React.
 */

/**
 * The branch a problem belongs to, for the purposes of keeping same-topic
 * problems apart: the id of the child of the source folder it was found
 * beneath, or `null` for problems placed directly in the source folder.
 *
 * `null` rather than a sentinel string so it can never collide with a real
 * folder id.
 */
export type VarietyGroup = string | null;

export interface SubtreeEntry {
  problemId: string;
  group: VarietyGroup;
}

/**
 * Every problem beneath a folder, in the order the navigation tree shows them.
 *
 * The walk uses the same two queries `ProblemTree` renders with, in the same
 * sequence — child folders first, then the folder's own problems — so tree
 * order and ordered-session order are the same thing by construction rather
 * than by two implementations agreeing. Group tagging rides along for free:
 * everything found while descending into a child of the source belongs to that
 * child.
 */
export function collectSubtreeEntries(taxonomy: Taxonomy, sourceFolderId: string): SubtreeEntry[] {
  const entries: SubtreeEntry[] = [];
  const seenProblems = new Set<string>();
  const seenFolders = new Set<string>();

  const walk = (folderId: string, group: VarietyGroup): void => {
    // A cyclic taxonomy is already prevented upstream; this keeps the walk
    // terminating anyway rather than trusting that from over here.
    if (seenFolders.has(folderId)) return;
    seenFolders.add(folderId);

    for (const child of getChildFolders(taxonomy, folderId)) {
      // Below the source folder the group is fixed by the branch we entered.
      walk(child.id, folderId === sourceFolderId ? child.id : group);
    }

    for (const problemId of getDirectProblems(taxonomy, folderId)) {
      if (seenProblems.has(problemId)) continue;
      seenProblems.add(problemId);
      entries.push({ problemId, group });
    }
  };

  walk(sourceFolderId, null);
  return entries;
}

export type RandomSource = () => number;

function shuffled<T>(items: T[], random: RandomSource): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Bucket = [VarietyGroup, string[]];

function pickWeighted(buckets: Bucket[], random: RandomSource): VarietyGroup {
  const total = buckets.reduce((sum, [, items]) => sum + items.length, 0);
  let ticket = random() * total;
  for (const [group, items] of buckets) {
    ticket -= items.length;
    if (ticket < 0) return group;
  }
  return buckets[buckets.length - 1][0];
}

/**
 * Randomizes a subtree while keeping same-branch problems apart.
 *
 * Plain randomization defeats the point of shuffling: the reason to shuffle is
 * that practising "sum a nested array" right after "count a nested array"
 * measures priming rather than retrieval. So problems are drawn one at a time
 * from a branch other than the one just used.
 *
 * Two rules decide which branch is next. Normally it is a weighted random pick,
 * so repeated shuffles of the same folder genuinely differ. But a branch large
 * enough that it can no longer be spaced out — more than half the remaining
 * slots — is taken immediately, because deferring it only guarantees a clump at
 * the end. This is best effort: once one branch is all that remains, its
 * problems necessarily run consecutively.
 */
export function varietyShuffle(entries: SubtreeEntry[], random: RandomSource = Math.random): string[] {
  const buckets = new Map<VarietyGroup, string[]>();
  for (const entry of entries) {
    const bucket = buckets.get(entry.group);
    if (bucket) bucket.push(entry.problemId);
    else buckets.set(entry.group, [entry.problemId]);
  }

  // Bucket order is shuffled too, so the first pick is not biased towards the
  // branch that happened to come first in the tree.
  const remaining = shuffled([...buckets.entries()], random).map(
    ([group, items]) => [group, shuffled(items, random)] as Bucket,
  );

  const order: string[] = [];
  // `undefined` means "nothing drawn yet"; `null` is a real group.
  let lastGroup: VarietyGroup | undefined = undefined;

  while (remaining.length > 0) {
    const eligible = remaining.filter(([group]) => group !== lastGroup);
    // Only when the last-used group is all that is left.
    const choices = eligible.length > 0 ? eligible : remaining;

    const totalLeft = choices.reduce((sum, [, items]) => sum + items.length, 0);
    const forced = choices.find(([, items]) => items.length * 2 - 1 > totalLeft);
    const group = forced ? forced[0] : pickWeighted(choices, random);

    const bucket = remaining.find(([name]) => name === group)!;
    order.push(bucket[1].pop()!);
    lastGroup = group;

    if (bucket[1].length === 0) {
      remaining.splice(remaining.indexOf(bucket), 1);
    }
  }

  return order;
}

/** The queue order for a new session, in the mode the user chose. */
export function buildQueueOrder(
  taxonomy: Taxonomy,
  sourceFolderId: string,
  mode: 'ordered' | 'shuffle',
  random: RandomSource = Math.random,
): string[] {
  const entries = collectSubtreeEntries(taxonomy, sourceFolderId);
  return mode === 'ordered' ? entries.map((entry) => entry.problemId) : varietyShuffle(entries, random);
}
