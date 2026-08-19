import { SAMPLE_TREE, TEST_TREE, traversalProblem } from './shared';

/**
 * Section 2 — Traversing & Collecting.
 *
 * The same recursion as Section 1, now over explicit tree objects. The data
 * shape is held constant across all four exercises so the only thing that
 * changes is what the traversal is for.
 */

const TREE_NOTE =
  'Every node looks like `{ value, children }`, where `children` is an array of more nodes. A leaf is a node whose `children` array is empty.';

export const countTreeNodesProblem = traversalProblem({
  id: 'count-tree-nodes',
  title: 'Count Nodes in a Tree',
  description: [
    'Implement `countNodes(root)`, which returns how many nodes the tree contains, including the root itself.',
    TREE_NOTE,
    'For a root `A` with children `B` and `C`, where `C` has one child `D`, the answer is `4`.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** the same walk as the nested-array exercises, on a tree. The children are now `node.children` instead of the array itself — that is the only real difference.",
  ],
  starter: `/**
 * Count every node in the tree, including the root.
 *
 * For this exercise, use a recursive solution.
 */
function countNodes(root) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${SAMPLE_TREE}

console.log('count:', countNodes(tree));
console.log('expected:', 4);
`,
  solution: `function countNodes(root) {
  // The node itself always counts as one.
  let count = 1;

  for (const child of root.children) {
    count += countNodes(child);
  }

  return count;
}
`,
  hints: [
    {
      id: 'node-counts',
      content: 'Whatever else happens, the node you were handed counts as one. Start from there.',
    },
    {
      id: 'children-array',
      content:
        "This node's children are `node.children`. Ask the same question about each of them and add up what comes back.",
    },
  ],
  cases: [
    {
      id: 'single',
      name: 'Counts a single node',
      source: `assert.equal(countNodes({ value: 'A', children: [] }), 1);`,
    },
    {
      id: 'sample',
      name: 'Counts a small tree',
      source: `${TEST_TREE}
assert.equal(countNodes(tree), 4);`,
    },
    {
      id: 'deep',
      name: 'Counts a deep chain',
      source: `const deep = { value: 1, children: [{ value: 2, children: [{ value: 3, children: [{ value: 4, children: [] }] }] }] };
assert.equal(countNodes(deep), 4);`,
    },
    {
      id: 'wide',
      name: 'Counts several sibling branches',
      source: `const wide = {
  value: 'root',
  children: [
    { value: 'a', children: [{ value: 'a1', children: [] }, { value: 'a2', children: [] }] },
    { value: 'b', children: [] },
    { value: 'c', children: [{ value: 'c1', children: [] }] },
  ],
};
assert.equal(countNodes(wide), 7);`,
    },
  ],
});

export const collectTreeValuesProblem = traversalProblem({
  id: 'collect-tree-values',
  title: 'Collect Every Tree Value',
  description: [
    'Implement `collectValues(root)`, which returns an array of every value in the tree.',
    TREE_NOTE,
    'Visit the tree **depth-first, preorder**: record a node before visiting its children, and visit children in array order. For a root `A` with children `B` and `C`, where `C` has one child `D`, the result is `["A", "B", "C", "D"]`.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** producing a collection during a traversal, and the fact that traversal order is a decision you make rather than something the data gives you.",
  ],
  starter: `/**
 * Collect every value in the tree, depth-first and preorder.
 *
 * For this exercise, use a recursive solution.
 */
function collectValues(root) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${SAMPLE_TREE}

console.log('values:', collectValues(tree));
console.log('expected:', ['A', 'B', 'C', 'D']);
`,
  solution: `function collectValues(root) {
  // Preorder: this node first, then everything beneath it.
  const values = [root.value];

  for (const child of root.children) {
    // Each call returns that branch's values, already in order.
    for (const value of collectValues(child)) {
      values.push(value);
    }
  }

  return values;
}
`,
  hints: [
    {
      id: 'order',
      content:
        'Preorder means the current node is recorded before any of its children. That single rule fixes the whole output order.',
    },
    {
      id: 'combine',
      content:
        "A recursive call gives you the whole list for one branch. Append those values to the list you are building, in child order.",
    },
  ],
  cases: [
    {
      id: 'single',
      name: 'Collects a single node',
      source: `assert.deepEqual(collectValues({ value: 'A', children: [] }), ['A']);`,
    },
    {
      id: 'preorder',
      name: 'Returns values in depth-first preorder',
      source: `${TEST_TREE}
assert.deepEqual(collectValues(tree), ['A', 'B', 'C', 'D']);`,
    },
    {
      id: 'branch-order',
      name: 'Finishes a branch before starting the next',
      source: `const wide = {
  value: 'root',
  children: [
    { value: 'a', children: [{ value: 'a1', children: [] }] },
    { value: 'b', children: [{ value: 'b1', children: [] }] },
  ],
};
assert.deepEqual(collectValues(wide), ['root', 'a', 'a1', 'b', 'b1']);`,
    },
  ],
});

export const treeContainsValueProblem = traversalProblem({
  id: 'tree-contains-value',
  title: 'Does the Tree Contain a Value?',
  description: [
    'Implement `containsValue(root, target)`, which returns `true` when any node in the tree has that value, and `false` otherwise.',
    TREE_NOTE,
    'Compare values with `===`.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** search, and the first recursion that can stop early. Ask: does this node match? If not, can any child find it?",
  ],
  starter: `/**
 * Return true when any node in the tree holds the target value.
 *
 * For this exercise, use a recursive solution.
 */
function containsValue(root, target) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${SAMPLE_TREE}

console.log('has D:', containsValue(tree, 'D'));
console.log('expected:', true);
console.log('has Z:', containsValue(tree, 'Z'));
console.log('expected:', false);
`,
  solution: `function containsValue(root, target) {
  // Base case: this node is the answer.
  if (root.value === target) {
    return true;
  }

  for (const child of root.children) {
    // As soon as any branch finds it, stop looking.
    if (containsValue(child, target)) {
      return true;
    }
  }

  return false;
}
`,
  hints: [
    {
      id: 'ask-node',
      content: 'Two questions in order: does this node match, and if not, does any child branch match?',
    },
    {
      id: 'boolean-up',
      content:
        'Each recursive call answers true or false for its whole branch. If one says true, you can return true immediately without checking the rest.',
    },
    {
      id: 'default-false',
      content:
        'If the node does not match and no branch reports a match, the answer for this node is false — that is what you return to your caller.',
    },
  ],
  cases: [
    {
      id: 'root',
      name: 'Finds a value at the root',
      source: `${TEST_TREE}
assert.equal(containsValue(tree, 'A'), true);`,
    },
    {
      id: 'deep',
      name: 'Finds a value in a deep branch',
      source: `${TEST_TREE}
assert.equal(containsValue(tree, 'D'), true);`,
    },
    {
      id: 'missing',
      name: 'Returns false when the value is absent',
      source: `${TEST_TREE}
assert.equal(containsValue(tree, 'Z'), false);
assert.equal(containsValue({ value: 'A', children: [] }, 'B'), false);`,
    },
    {
      id: 'last-branch',
      name: 'Searches every sibling branch',
      source: `const wide = {
  value: 'root',
  children: [
    { value: 'a', children: [] },
    { value: 'b', children: [] },
    { value: 'c', children: [{ value: 'target', children: [] }] },
  ],
};
assert.equal(containsValue(wide, 'target'), true);`,
    },
  ],
});

export const findNodeByIdProblem = traversalProblem({
  id: 'find-node-by-id',
  title: 'Find a Node by ID',
  description: [
    'Implement `findNode(root, id)`, which returns the actual node object whose `id` matches, or `null` when no node matches.',
    'Nodes look like `{ id, name, children }`, where `children` is an array of more nodes.',
    'Return the node itself — the same object from the tree, not a copy.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** a recursive function that returns *a node or nothing*. A successful find has to travel back up through every ancestor call unchanged, which is the pattern behind most tree-lookup interview questions.",
  ],
  starter: `/**
 * Return the node with the given id, or null when it is not present.
 *
 * For this exercise, use a recursive solution.
 */
function findNode(root, id) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
const root = {
  id: 'folder-a',
  name: 'Folder A',
  children: [
    { id: 'file-1', name: 'File 1', children: [] },
    {
      id: 'folder-b',
      name: 'Folder B',
      children: [{ id: 'file-2', name: 'File 2', children: [] }],
    },
  ],
};

console.log('found:', findNode(root, 'file-2'));
console.log('missing:', findNode(root, 'nope'));
`,
  solution: `function findNode(root, id) {
  // Base case: this is the node being looked for.
  if (root.id === id) {
    return root;
  }

  for (const child of root.children) {
    const found = findNode(child, id);

    // A branch found it: hand the same node straight back up.
    if (found !== null) {
      return found;
    }
  }

  return null;
}
`,
  hints: [
    {
      id: 'return-node',
      content:
        'This is the same search as the previous exercise, except the answer is the node itself rather than true, and "not found" is `null` rather than false.',
    },
    {
      id: 'propagate',
      content:
        'When a recursive call returns a node, do not rebuild or wrap it. Return that exact object so it travels all the way back to the original caller.',
    },
    {
      id: 'check-result',
      content:
        'Check each child result before moving on: if it is not null you are done, and if every child returns null then this branch has nothing and you return null too.',
    },
  ],
  cases: [
    {
      id: 'root',
      name: 'Finds the root node',
      source: `const root = { id: 'a', name: 'A', children: [] };
assert.equal(findNode(root, 'a'), root);`,
    },
    {
      id: 'returns-actual-node',
      name: 'Returns the node object from the tree',
      source: `const deep = { id: 'deep', name: 'Deep', children: [] };
const root = { id: 'a', name: 'A', children: [{ id: 'b', name: 'B', children: [deep] }] };
assert.ok(findNode(root, 'deep') === deep, 'should return the same object, not a copy');
assert.equal(findNode(root, 'deep').name, 'Deep');`,
    },
    {
      id: 'missing',
      name: 'Returns null when the id is absent',
      source: `const root = { id: 'a', name: 'A', children: [{ id: 'b', name: 'B', children: [] }] };
assert.equal(findNode(root, 'zzz'), null);`,
    },
    {
      id: 'later-branch',
      name: 'Searches branches after the first',
      source: `const target = { id: 'c1', name: 'C1', children: [] };
const root = {
  id: 'root', name: 'Root',
  children: [
    { id: 'a', name: 'A', children: [] },
    { id: 'b', name: 'B', children: [] },
    { id: 'c', name: 'C', children: [target] },
  ],
};
assert.ok(findNode(root, 'c1') === target);`,
    },
  ],
});
