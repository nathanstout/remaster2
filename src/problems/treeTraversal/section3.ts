import { SAMPLE_TREE, TEST_TREE, traversalProblem } from './shared';

/**
 * Section 3 — Paths, Depth & Context.
 *
 * The first exercises where a call needs to know something about where it is,
 * not just what it is looking at. Depth travels downward; paths are built on
 * the way back up.
 */

const TREE_NOTE =
  'Every node looks like `{ value, children }`, where `children` is an array of more nodes.';

export const maxTreeDepthProblem = traversalProblem({
  id: 'max-tree-depth',
  title: 'Maximum Tree Depth',
  description: [
    'Implement `maxDepth(root)`, which returns how many levels the tree has. A tree consisting of only a root has depth `1`.',
    TREE_NOTE,
    'For a root `A` with children `B` and `C`, where `C` has one child `D`, the answer is `3`.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** the canonical `1 + max(child answers)` shape. Nothing is accumulated in a shared variable here — the answer is assembled entirely from what the recursive calls return.",
  ],
  starter: `/**
 * Return the number of levels in the tree. A lone root has depth 1.
 *
 * For this exercise, use a recursive solution.
 */
function maxDepth(root) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${SAMPLE_TREE}

console.log('depth:', maxDepth(tree));
console.log('expected:', 3);
`,
  solution: `function maxDepth(root) {
  let deepestChild = 0;

  for (const child of root.children) {
    // Each call reports the depth of that branch on its own.
    const childDepth = maxDepth(child);

    if (childDepth > deepestChild) {
      deepestChild = childDepth;
    }
  }

  // This node adds one level on top of its deepest branch.
  return 1 + deepestChild;
}
`,
  hints: [
    {
      id: 'leaf-depth',
      content: 'Start with the simplest tree: a node with no children. What should it return?',
    },
    {
      id: 'one-plus',
      content:
        'A node is one level, plus however deep its deepest branch goes. Ask each child for its own depth and keep the largest.',
    },
    {
      id: 'no-accumulator',
      content:
        'You do not need a running total or a depth parameter here — everything you need comes back from the recursive calls.',
    },
  ],
  cases: [
    {
      id: 'single',
      name: 'A lone root has depth 1',
      source: `assert.equal(maxDepth({ value: 'A', children: [] }), 1);`,
    },
    {
      id: 'sample',
      name: 'Measures a small tree',
      source: `${TEST_TREE}
assert.equal(maxDepth(tree), 3);`,
    },
    {
      id: 'deepest-branch',
      name: 'Reports the deepest branch, not the first',
      source: `const tree = {
  value: 'root',
  children: [
    { value: 'shallow', children: [] },
    { value: 'deep', children: [{ value: 'x', children: [{ value: 'y', children: [] }] }] },
  ],
};
assert.equal(maxDepth(tree), 4);`,
    },
    {
      id: 'chain',
      name: 'Measures a long chain',
      source: `let node = { value: 'leaf', children: [] };
for (let i = 0; i < 6; i += 1) node = { value: 'n' + i, children: [node] };
assert.equal(maxDepth(node), 7);`,
    },
  ],
});

export const valuesAtDepthProblem = traversalProblem({
  id: 'values-at-depth',
  title: 'Collect Values at a Specific Depth',
  description: [
    'Implement `valuesAtDepth(root, targetDepth)`, which returns the values of every node at exactly that depth.',
    'The root sits at depth `0`, its children at depth `1`, and so on. Return the values left-to-right, in child order.',
    'For a root `A` with children `B` and `C`, `valuesAtDepth(tree, 1)` returns `["B", "C"]`. A depth deeper than the tree returns `[]`.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** passing context *downward*. The node cannot know its own depth — the caller has to tell it, and each call tells its children `currentDepth + 1`.",
  ],
  starter: `/**
 * Collect the values of every node at exactly targetDepth.
 * The root is depth 0.
 *
 * For this exercise, use a recursive solution.
 */
function valuesAtDepth(root, targetDepth) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${SAMPLE_TREE}

console.log('depth 1:', valuesAtDepth(tree, 1));
console.log('expected:', ['B', 'C']);
console.log('depth 2:', valuesAtDepth(tree, 2));
console.log('expected:', ['D']);
`,
  solution: `function valuesAtDepth(root, targetDepth, currentDepth = 0) {
  // Arrived: this node is on the requested level, so nothing below matters.
  if (currentDepth === targetDepth) {
    return [root.value];
  }

  const values = [];

  for (const child of root.children) {
    // Each step down is one level deeper.
    for (const value of valuesAtDepth(child, targetDepth, currentDepth + 1)) {
      values.push(value);
    }
  }

  return values;
}
`,
  hints: [
    {
      id: 'who-knows-depth',
      content:
        'A node has no way of knowing how deep it sits. That information has to arrive as an argument from whoever called it.',
    },
    {
      id: 'extra-parameter',
      content:
        'Add a parameter for the current depth with a default of 0, so the first call still reads `valuesAtDepth(root, n)`.',
    },
    {
      id: 'stop-early',
      content:
        'Once the current depth equals the target, this node is a result and there is no reason to look at its children at all.',
    },
  ],
  cases: [
    {
      id: 'root-depth',
      name: 'Depth 0 is the root',
      source: `${TEST_TREE}
assert.deepEqual(valuesAtDepth(tree, 0), ['A']);`,
    },
    {
      id: 'children',
      name: 'Collects a whole level in order',
      source: `${TEST_TREE}
assert.deepEqual(valuesAtDepth(tree, 1), ['B', 'C']);
assert.deepEqual(valuesAtDepth(tree, 2), ['D']);`,
    },
    {
      id: 'too-deep',
      name: 'Returns an empty array past the deepest level',
      source: `${TEST_TREE}
assert.deepEqual(valuesAtDepth(tree, 5), []);`,
    },
    {
      id: 'across-branches',
      name: 'Gathers a level spread across branches',
      source: `const tree = {
  value: 'root',
  children: [
    { value: 'a', children: [{ value: 'a1', children: [] }] },
    { value: 'b', children: [{ value: 'b1', children: [] }, { value: 'b2', children: [] }] },
  ],
};
assert.deepEqual(valuesAtDepth(tree, 2), ['a1', 'b1', 'b2']);`,
    },
  ],
});

export const findPathToNodeProblem = traversalProblem({
  id: 'find-path-to-node',
  title: 'Find the Path to a Node',
  description: [
    'Implement `findPath(root, targetId)`, which returns the ids of every node from the root down to the matching node, inclusive.',
    'Nodes look like `{ id, children }`. For a root `A` with children `B` and `C`, where `C` has one child `D`, `findPath(tree, "D")` returns `["A", "C", "D"]`.',
    'Return `null` when no node matches.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** one of the most reusable patterns in the whole plan — ask a child whether it found the target, and if it did, put yourself on the front of the path it returns. Notice you could also carry the path downward instead; both work, and it is worth knowing why.",
  ],
  starter: `/**
 * Return the ids from the root down to the matching node, or null.
 *
 * For this exercise, use a recursive solution.
 */
function findPath(root, targetId) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
const tree = {
  id: 'A',
  children: [
    { id: 'B', children: [] },
    { id: 'C', children: [{ id: 'D', children: [] }] },
  ],
};

console.log('path to D:', findPath(tree, 'D'));
console.log('expected:', ['A', 'C', 'D']);
console.log('missing:', findPath(tree, 'Z'));
`,
  solution: `function findPath(root, targetId) {
  // Base case: the path to the target from here is just this node.
  if (root.id === targetId) {
    return [root.id];
  }

  for (const child of root.children) {
    const pathBelow = findPath(child, targetId);

    // The child found it, so this node is on the path too — prepend it.
    if (pathBelow !== null) {
      return [root.id, ...pathBelow];
    }
  }

  return null;
}
`,
  hints: [
    {
      id: 'null-means-absent',
      content:
        'Start from the search you already know: a call returns something when the target is in its branch, and null when it is not.',
    },
    {
      id: 'prepend',
      content:
        'If a child returns a path, that path is missing one thing — the current node. Add it to the front before returning.',
    },
    {
      id: 'base-case',
      content:
        'When the current node is the target, the path from here is a one-element array containing its own id.',
    },
    {
      id: 'two-styles',
      content:
        'You can also pass the path so far downward and return it whole at the match. Try both and notice that the version building on the way up needs no extra parameter.',
    },
  ],
  cases: [
    {
      id: 'root',
      name: 'Path to the root is just the root',
      source: `assert.deepEqual(findPath({ id: 'A', children: [] }, 'A'), ['A']);`,
    },
    {
      id: 'deep',
      name: 'Builds the full path to a deep node',
      source: `const tree = { id: 'A', children: [{ id: 'B', children: [] }, { id: 'C', children: [{ id: 'D', children: [] }] }] };
assert.deepEqual(findPath(tree, 'D'), ['A', 'C', 'D']);
assert.deepEqual(findPath(tree, 'B'), ['A', 'B']);`,
    },
    {
      id: 'missing',
      name: 'Returns null when the target is absent',
      source: `const tree = { id: 'A', children: [{ id: 'B', children: [] }] };
assert.equal(findPath(tree, 'Z'), null);`,
    },
    {
      id: 'no-contamination',
      name: 'Does not include nodes from an unrelated branch',
      source: `const tree = {
  id: 'root',
  children: [
    { id: 'B', children: [{ id: 'B1', children: [] }] },
    { id: 'D', children: [{ id: 'D1', children: [] }] },
  ],
};
assert.deepEqual(findPath(tree, 'D1'), ['root', 'D', 'D1']);`,
    },
  ],
});

export const rootToLeafPathsProblem = traversalProblem({
  id: 'root-to-leaf-paths',
  title: 'List Every Root-to-Leaf Path',
  description: [
    'Implement `getRootToLeafPaths(root)`, which returns one array of values for every path that runs from the root down to a leaf.',
    TREE_NOTE + ' A leaf is a node with no children.',
    'For a root `A` with children `B` and `C`, where `C` has children `D` and `E`, the result is `[["A", "B"], ["A", "C", "D"], ["A", "C", "E"]]`. Paths come out in depth-first order.',
    'A tree consisting of only a root produces one path containing just that root.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** keeping state that belongs to *one branch*. The classic mistake here is sharing a single mutable path array between siblings, so that values from one branch leak into another — the tests will catch that.",
  ],
  starter: `/**
 * Return every root-to-leaf path as an array of values.
 *
 * For this exercise, use a recursive solution.
 */
function getRootToLeafPaths(root) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
const tree = {
  value: 'A',
  children: [
    { value: 'B', children: [] },
    {
      value: 'C',
      children: [{ value: 'D', children: [] }, { value: 'E', children: [] }],
    },
  ],
};

console.log('paths:', getRootToLeafPaths(tree));
console.log('expected:', [['A', 'B'], ['A', 'C', 'D'], ['A', 'C', 'E']]);
`,
  solution: `function getRootToLeafPaths(root) {
  // A leaf ends exactly one path: the one containing itself.
  if (root.children.length === 0) {
    return [[root.value]];
  }

  const paths = [];

  for (const child of root.children) {
    for (const path of getRootToLeafPaths(child)) {
      // A fresh array per path, so branches never share state.
      paths.push([root.value, ...path]);
    }
  }

  return paths;
}
`,
  hints: [
    {
      id: 'leaf-base',
      content:
        'What should a leaf return? It is the end of exactly one path — so it returns a list containing one path.',
    },
    {
      id: 'prefix',
      content:
        'Every path a child returns needs the current node added to the front, just like the path-finding exercise.',
    },
    {
      id: 'fresh-arrays',
      content:
        'Be careful not to reuse one array across siblings. Building a new array for each path (rather than pushing and popping a shared one) makes the mistake impossible.',
    },
  ],
  cases: [
    {
      id: 'single',
      name: 'A lone root is one path',
      source: `assert.deepEqual(getRootToLeafPaths({ value: 'A', children: [] }), [['A']]);`,
    },
    {
      id: 'branches',
      name: 'Returns every root-to-leaf path',
      source: `const tree = {
  value: 'A',
  children: [
    { value: 'B', children: [] },
    { value: 'C', children: [{ value: 'D', children: [] }, { value: 'E', children: [] }] },
  ],
};
assert.deepEqual(getRootToLeafPaths(tree), [['A', 'B'], ['A', 'C', 'D'], ['A', 'C', 'E']]);`,
    },
    {
      id: 'no-sibling-leak',
      name: 'Sibling branches do not contaminate each other',
      source: `const tree = {
  value: 'A',
  children: [
    { value: 'B', children: [{ value: 'C', children: [] }] },
    { value: 'D', children: [] },
  ],
};
const paths = getRootToLeafPaths(tree);
assert.deepEqual(paths, [['A', 'B', 'C'], ['A', 'D']]);
assert.ok(!paths[1].includes('B'), 'the D path must not contain values from the B branch');
assert.ok(!paths[1].includes('C'), 'the D path must not contain values from the B branch');`,
    },
    {
      id: 'independent-arrays',
      name: 'Each returned path is its own array',
      source: `const tree = { value: 'A', children: [{ value: 'B', children: [] }, { value: 'C', children: [] }] };
const paths = getRootToLeafPaths(tree);
assert.ok(paths[0] !== paths[1], 'paths must not be the same array instance');
paths[0].push('mutated');
assert.deepEqual(paths[1], ['A', 'C']);`,
    },
  ],
});
