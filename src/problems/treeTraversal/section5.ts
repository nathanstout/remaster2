import { traversalProblem } from './shared';

/**
 * Section 5 — Tree Transformations.
 *
 * Building a new tree rather than reading one. The shape of the recursion is the
 * same, but now every call has to return a node instead of a value, and the
 * original must come back untouched.
 */

const TRANSFORM_SAMPLE = `const tree = {
  value: 1,
  children: [
    { value: 2, children: [] },
    { value: 3, children: [{ value: 4, children: [] }] },
  ],
};`;

export const mapTreeProblem = traversalProblem({
  id: 'map-tree',
  title: 'Map Over a Tree',
  description: [
    'Implement `mapTree(node, transform)`, which returns a **new** tree of the same shape where every `value` has been replaced by `transform(value)`.',
    'Nodes look like `{ value, children }`. The original tree must be completely unchanged afterwards — no node object, and no `children` array, may be shared with the result.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** returning a rebuilt node instead of a collected value. This is the point where recursion stops reading a tree and starts producing one.",
  ],
  starter: `/**
 * Return a new tree with every value passed through \`transform\`.
 * The original tree must not be modified.
 *
 * For this exercise, use a recursive solution.
 */
function mapTree(node, transform) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${TRANSFORM_SAMPLE}

const doubled = mapTree(tree, (value) => value * 2);

console.log('mapped:', JSON.stringify(doubled));
console.log('original:', JSON.stringify(tree));
`,
  solution: `function mapTree(node, transform) {
  const children = [];

  // Each child is mapped into a brand new node of its own.
  for (const child of node.children) {
    children.push(mapTree(child, transform));
  }

  // A fresh object every time, so nothing is shared with the original.
  return { value: transform(node.value), children };
}
`,
  hints: [
    {
      id: 'return-a-node',
      content:
        'Every call should hand back one new node. Ask what that node needs: a transformed value, and children that have themselves been mapped.',
    },
    {
      id: 'fresh-objects',
      content:
        'Reusing `node.children` in the result would tie the new tree to the old one. Build a new array, and put newly built nodes into it.',
    },
  ],
  cases: [
    {
      id: 'leaf',
      name: 'Transforms a single node',
      source: `const result = mapTree({ value: 3, children: [] }, (v) => v * 10);
assert.deepEqual(result, { value: 30, children: [] });`,
    },
    {
      id: 'nested',
      name: 'Transforms every value at every depth',
      source: `const tree = { value: 1, children: [
  { value: 2, children: [] },
  { value: 3, children: [{ value: 4, children: [] }] },
] };
assert.deepEqual(mapTree(tree, (v) => v * 2), { value: 2, children: [
  { value: 4, children: [] },
  { value: 6, children: [{ value: 8, children: [] }] },
] });`,
    },
    {
      id: 'shape-preserved',
      name: 'Keeps the shape and order of children',
      source: `const tree = { value: 'a', children: [
  { value: 'b', children: [{ value: 'c', children: [] }] },
  { value: 'd', children: [] },
] };
const result = mapTree(tree, (v) => v.toUpperCase());
assert.deepEqual(result, { value: 'A', children: [
  { value: 'B', children: [{ value: 'C', children: [] }] },
  { value: 'D', children: [] },
] });`,
    },
    {
      id: 'no-mutation',
      name: 'Leaves the original tree unchanged',
      source: `const tree = { value: 1, children: [{ value: 2, children: [] }] };
const before = JSON.stringify(tree);
const result = mapTree(tree, (v) => v * 100);
assert.deepEqual(result, { value: 100, children: [{ value: 200, children: [] }] });
assert.equal(JSON.stringify(tree), before, 'the original tree was modified');`,
    },
    {
      id: 'no-sharing',
      name: 'Shares no objects or arrays with the original',
      source: `const child = { value: 2, children: [] };
const tree = { value: 1, children: [child] };
const result = mapTree(tree, (v) => v);
assert.ok(result !== tree, 'the root node was reused');
assert.ok(result.children !== tree.children, 'the children array was reused');
assert.ok(result.children[0] !== child, 'a child node was reused');`,
    },
  ],
});

export const removeNodesProblem = traversalProblem({
  id: 'remove-nodes',
  title: 'Remove Nodes From a Tree',
  description: [
    'Implement `removeNodes(node, shouldRemove)`, which returns a **new** tree with every node the predicate rejects removed, along with everything beneath it.',
    'Nodes look like `{ value, children }`. `shouldRemove` receives a node’s value.',
    'If the root itself should be removed, return `null`. The original tree must be unchanged.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** a rebuild where a call may return nothing at all. The caller now has to decide what to do with an absent child.",
  ],
  starter: `/**
 * Return a new tree without the nodes \`shouldRemove(value)\` accepts.
 * Removing a node removes its whole subtree. Return null if the root goes.
 * The original tree must not be modified.
 *
 * For this exercise, use a recursive solution.
 */
function removeNodes(node, shouldRemove) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${TRANSFORM_SAMPLE}

console.log('kept:', JSON.stringify(removeNodes(tree, (value) => value === 3)));
console.log('original:', JSON.stringify(tree));
`,
  solution: `function removeNodes(node, shouldRemove) {
  // Base case: this node goes, and with it everything below.
  if (shouldRemove(node.value)) {
    return null;
  }

  const children = [];

  for (const child of node.children) {
    const kept = removeNodes(child, shouldRemove);

    // A removed child contributes nothing to the new children array.
    if (kept !== null) {
      children.push(kept);
    }
  }

  return { value: node.value, children };
}
`,
  hints: [
    {
      id: 'check-first',
      content:
        'Check the node itself before looking at its children. If it is going, there is no reason to rebuild anything beneath it.',
    },
    {
      id: 'skip-nulls',
      content:
        'A recursive call can now come back as null. Only push a child into the new array when it survived.',
    },
    {
      id: 'still-rebuild',
      content:
        'Surviving nodes still need to be new objects — the pruned children array makes them different from the originals.',
    },
  ],
  cases: [
    {
      id: 'removes-root',
      name: 'Returns null when the root is removed',
      source: `assert.equal(removeNodes({ value: 1, children: [{ value: 2, children: [] }] }, (v) => v === 1), null);`,
    },
    {
      id: 'removes-subtree',
      name: 'Removes a node together with its subtree',
      source: `const tree = { value: 1, children: [
  { value: 2, children: [] },
  { value: 3, children: [{ value: 4, children: [] }] },
] };
assert.deepEqual(removeNodes(tree, (v) => v === 3), { value: 1, children: [
  { value: 2, children: [] },
] });`,
    },
    {
      id: 'keeps-all',
      name: 'Keeps everything when nothing matches',
      source: `const tree = { value: 1, children: [{ value: 2, children: [{ value: 3, children: [] }] }] };
assert.deepEqual(removeNodes(tree, () => false), tree);`,
    },
    {
      id: 'several-branches',
      name: 'Prunes independently across branches',
      source: `const tree = { value: 1, children: [
  { value: 2, children: [{ value: 5, children: [] }] },
  { value: 3, children: [] },
  { value: 4, children: [{ value: 5, children: [] }, { value: 6, children: [] }] },
] };
assert.deepEqual(removeNodes(tree, (v) => v === 5), { value: 1, children: [
  { value: 2, children: [] },
  { value: 3, children: [] },
  { value: 4, children: [{ value: 6, children: [] }] },
] });`,
    },
    {
      id: 'no-mutation',
      name: 'Leaves the original tree unchanged',
      source: `const tree = { value: 1, children: [
  { value: 2, children: [] },
  { value: 3, children: [{ value: 4, children: [] }] },
] };
const before = JSON.stringify(tree);
const result = removeNodes(tree, (v) => v === 3);
assert.deepEqual(result, { value: 1, children: [{ value: 2, children: [] }] });
assert.equal(JSON.stringify(tree), before, 'the original tree was modified');`,
    },
    {
      id: 'no-sharing',
      name: 'Shares no objects or arrays with the original',
      source: `const child = { value: 2, children: [] };
const tree = { value: 1, children: [child] };
const result = removeNodes(tree, () => false);
assert.ok(result !== tree, 'the root node was reused');
assert.ok(result.children !== tree.children, 'the children array was reused');
assert.ok(result.children[0] !== child, 'a child node was reused');`,
    },
  ],
});

export const filterTreePreservingPathsProblem = traversalProblem({
  id: 'filter-tree-preserving-paths',
  title: 'Filter a Tree, Preserving Paths',
  description: [
    'Implement `filterTree(node, predicate)`, which returns a **new** tree containing every node that satisfies `predicate(value)` — plus any ancestor needed to reach one.',
    'A node is kept when it matches the predicate, **or** when at least one of its descendants is kept. Everything else is dropped. Return `null` when nothing in the tree is kept.',
    'A kept ancestor that does not itself match still appears, with only its kept children beneath it. The original tree must be unchanged.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** deciding a node's fate from what came back from below, rather than from the node alone. This is the search-filter behaviour real trees need, and it is the capstone for everything in this plan.",
  ],
  starter: `/**
 * Return a new tree with only the nodes that match \`predicate(value)\`
 * and the ancestors needed to reach them. Return null if nothing matches.
 * The original tree must not be modified.
 *
 * For this exercise, use a recursive solution.
 */
function filterTree(node, predicate) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
const tree = {
  value: 'root',
  children: [
    { value: 'keep-me', children: [] },
    { value: 'boring', children: [{ value: 'keep-me-too', children: [] }] },
    { value: 'dead-end', children: [{ value: 'also-boring', children: [] }] },
  ],
};

console.log('filtered:', JSON.stringify(filterTree(tree, (value) => value.startsWith('keep'))));
console.log('original:', JSON.stringify(tree));
`,
  solution: `function filterTree(node, predicate) {
  const children = [];

  // Ask every child first — this node's fate can depend on the answers.
  for (const child of node.children) {
    const kept = filterTree(child, predicate);

    if (kept !== null) {
      children.push(kept);
    }
  }

  // Keep this node if it matches itself, or if it leads to something kept.
  if (predicate(node.value) || children.length > 0) {
    return { value: node.value, children };
  }

  return null;
}
`,
  hints: [
    {
      id: 'children-first',
      content:
        'Unlike the removal exercise, you cannot decide about a node before visiting its children — whether to keep it depends on what they report back.',
    },
    {
      id: 'two-reasons',
      content:
        'There are exactly two reasons to keep a node: it matches, or something beneath it survived.',
    },
    {
      id: 'kept-children',
      content:
        'Collect the surviving children into an array as you go. Its length is the answer to "did anything below me survive?".',
    },
    {
      id: 'nothing-kept',
      content:
        'When neither reason applies, return null and let the caller decide what that means for it.',
    },
  ],
  cases: [
    {
      id: 'matching-leaf',
      name: 'Keeps a matching root',
      source: `assert.deepEqual(filterTree({ value: 'a', children: [] }, (v) => v === 'a'), { value: 'a', children: [] });`,
    },
    {
      id: 'nothing-matches',
      name: 'Returns null when nothing matches',
      source: `const tree = { value: 'a', children: [{ value: 'b', children: [{ value: 'c', children: [] }] }] };
assert.equal(filterTree(tree, (v) => v === 'z'), null);`,
    },
    {
      id: 'keeps-ancestors',
      name: 'Keeps non-matching ancestors of a match',
      source: `const tree = { value: 'root', children: [
  { value: 'boring', children: [{ value: 'target', children: [] }] },
] };
assert.deepEqual(filterTree(tree, (v) => v === 'target'), { value: 'root', children: [
  { value: 'boring', children: [{ value: 'target', children: [] }] },
] });`,
    },
    {
      id: 'drops-dead-ends',
      name: 'Drops branches that lead nowhere',
      source: `const tree = { value: 'root', children: [
  { value: 'keep-me', children: [] },
  { value: 'boring', children: [{ value: 'keep-me-too', children: [] }] },
  { value: 'dead-end', children: [{ value: 'also-boring', children: [] }] },
] };
assert.deepEqual(filterTree(tree, (v) => v.startsWith('keep')), { value: 'root', children: [
  { value: 'keep-me', children: [] },
  { value: 'boring', children: [{ value: 'keep-me-too', children: [] }] },
] });`,
    },
    {
      id: 'prunes-under-match',
      name: 'A matching node keeps only its own kept descendants',
      source: `const tree = { value: 'match', children: [
  { value: 'no', children: [] },
  { value: 'match', children: [] },
] };
assert.deepEqual(filterTree(tree, (v) => v === 'match'), { value: 'match', children: [
  { value: 'match', children: [] },
] });`,
    },
    {
      id: 'no-mutation',
      name: 'Leaves the original tree unchanged',
      source: `const tree = { value: 'root', children: [
  { value: 'keep', children: [] },
  { value: 'drop', children: [{ value: 'drop-too', children: [] }] },
] };
const before = JSON.stringify(tree);
const result = filterTree(tree, (v) => v === 'keep');
assert.deepEqual(result, { value: 'root', children: [{ value: 'keep', children: [] }] });
assert.equal(JSON.stringify(tree), before, 'the original tree was modified');`,
    },
    {
      id: 'no-sharing',
      name: 'Shares no objects or arrays with the original',
      source: `const child = { value: 'keep', children: [] };
const tree = { value: 'root', children: [child] };
const result = filterTree(tree, (v) => v === 'keep');
assert.ok(result !== tree, 'the root node was reused');
assert.ok(result.children !== tree.children, 'the children array was reused');
assert.ok(result.children[0] !== child, 'a child node was reused');`,
    },
  ],
});
