import { traversalProblem } from './shared';

/**
 * Section 4 — Real-World Nested Data.
 *
 * The same patterns applied to the shapes that actually show up in interviews:
 * nested arrays, dotted object paths, org charts and file trees. By this point
 * the traversal should feel like the easy part.
 */

const EMPLOYEE_SAMPLE = `const alice = {
  id: 'alice',
  name: 'Alice',
  directReports: [
    { id: 'bob', name: 'Bob', directReports: [] },
    {
      id: 'carol',
      name: 'Carol',
      directReports: [{ id: 'dave', name: 'Dave', directReports: [] }],
    },
  ],
};`;

const FILE_TREE_SAMPLE = `const src = {
  type: 'folder',
  name: 'src',
  children: [
    { type: 'file', name: 'App.js' },
    {
      type: 'folder',
      name: 'components',
      children: [{ type: 'file', name: 'Button.js' }],
    },
  ],
};`;

export const flattenNestedArrayProblem = traversalProblem({
  id: 'flatten-nested-array',
  title: 'Flatten a Nested Array',
  description: [
    'Implement `flatten(values)`, which returns a new array containing every number from a nested array, fully flattened, in order.',
    'For example `flatten([1, [2, [3, 4]], 5])` returns `[1, 2, 3, 4, 5]`.',
    'Do not use `Array.prototype.flat` — **writing the recursion yourself is the whole point** of the exercise.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** the classic flatten, now that the recursion behind it is familiar. It is the collecting traversal from Section 2 with arrays instead of nodes.",
  ],
  starter: `/**
 * Flatten a nested array completely.
 * Do not use Array.prototype.flat.
 *
 * For this exercise, use a recursive solution.
 */
function flatten(values) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
console.log('flat:', flatten([1, [2, [3, 4]], 5]));
console.log('expected:', [1, 2, 3, 4, 5]);
`,
  solution: `function flatten(values) {
  const result = [];

  for (const item of values) {
    if (Array.isArray(item)) {
      // The recursive call returns that branch already flat.
      for (const value of flatten(item)) {
        result.push(value);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}
`,
  hints: [
    {
      id: 'same-two-cases',
      content:
        'Same two cases as the very first exercise: an item is either a value you keep, or an array you walk into.',
    },
    {
      id: 'append-branch',
      content:
        'A recursive call hands back an already-flat array for that branch. Append its items to your result in order.',
    },
  ],
  cases: [
    {
      id: 'already-flat',
      name: 'Leaves a flat array unchanged',
      source: `assert.deepEqual(flatten([1, 2, 3]), [1, 2, 3]);`,
    },
    {
      id: 'nested',
      name: 'Flattens nesting at any depth',
      source: `assert.deepEqual(flatten([1, [2, [3, 4]], 5]), [1, 2, 3, 4, 5]);
assert.deepEqual(flatten([[[[1]]], 2]), [1, 2]);`,
    },
    {
      id: 'empty',
      name: 'Handles empty arrays',
      source: `assert.deepEqual(flatten([]), []);
assert.deepEqual(flatten([[], [[]]]), []);
assert.deepEqual(flatten([1, [], 2]), [1, 2]);`,
    },
    {
      id: 'new-array',
      name: 'Returns a new array and leaves the input alone',
      source: `const input = [1, [2, 3]];
const result = flatten(input);
assert.deepEqual(result, [1, 2, 3]);
assert.ok(result !== input, 'should return a new array');
assert.deepEqual(input, [1, [2, 3]], 'the input array was modified');`,
    },
  ],
});

export const flattenDepthProblem = traversalProblem({
  id: 'flatten-depth',
  title: 'Flatten an Array to a Specific Depth',
  description: [
    'Implement `flattenDepth(values, depth)`, which flattens a nested array by at most `depth` levels.',
    'For example `flattenDepth([1, [2, [3, [4]]]], 2)` returns `[1, 2, 3, [4]]`.',
    '`depth = 0` returns a copy of the array unchanged. `depth = 1` unwraps one level. A depth larger than the nesting flattens completely.',
    'Do not use `Array.prototype.flat` here either — **write the recursion yourself**.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** passing a shrinking budget downward, the mirror image of the depth you passed down in `valuesAtDepth`. Each level you descend spends one unit of it.",
  ],
  starter: `/**
 * Flatten a nested array by at most \`depth\` levels.
 * depth = 0 changes nothing. Do not use Array.prototype.flat.
 *
 * For this exercise, use a recursive solution.
 */
function flattenDepth(values, depth) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
const input = [1, [2, [3, [4]]]];

console.log('depth 0:', flattenDepth(input, 0));
console.log('depth 1:', flattenDepth(input, 1));
console.log('depth 2:', flattenDepth(input, 2));
console.log('expected depth 2:', [1, 2, 3, [4]]);
`,
  solution: `function flattenDepth(values, depth) {
  const result = [];

  for (const item of values) {
    // Only unwrap while there is budget left.
    if (Array.isArray(item) && depth > 0) {
      // Descending one level costs one unit of depth.
      for (const value of flattenDepth(item, depth - 1)) {
        result.push(value);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}
`,
  hints: [
    {
      id: 'budget',
      content:
        'Think of `depth` as a budget for how many levels you are still allowed to unwrap.',
    },
    {
      id: 'spend-it',
      content:
        'When you recurse into a nested array you have descended one level, so the call below should get a smaller budget.',
    },
    {
      id: 'out-of-budget',
      content:
        'With no budget left, a nested array is not something to walk into — it is just a value you keep as-is.',
    },
  ],
  cases: [
    {
      id: 'depth-zero',
      name: 'Depth 0 returns an equal but new array',
      source: `const input = [1, [2, [3]]];
const result = flattenDepth(input, 0);
assert.deepEqual(result, [1, [2, [3]]]);
assert.ok(result !== input, 'should return a new array');`,
    },
    {
      id: 'depth-one',
      name: 'Depth 1 unwraps a single level',
      source: `assert.deepEqual(flattenDepth([1, [2, [3, [4]]]], 1), [1, 2, [3, [4]]]);`,
    },
    {
      id: 'depth-two',
      name: 'Depth 2 unwraps two levels',
      source: `assert.deepEqual(flattenDepth([1, [2, [3, [4]]]], 2), [1, 2, 3, [4]]);`,
    },
    {
      id: 'depth-beyond',
      name: 'A depth beyond the nesting flattens completely',
      source: `assert.deepEqual(flattenDepth([1, [2, [3, [4]]]], 10), [1, 2, 3, 4]);`,
    },
    {
      id: 'siblings',
      name: 'Applies the budget independently to each branch',
      source: `assert.deepEqual(flattenDepth([[1, [2]], [3, [4]]], 1), [1, [2], 3, [4]]);`,
    },
  ],
});

export const flattenEmployeesProblem = traversalProblem({
  id: 'flatten-employees',
  title: 'Flatten an Employee Hierarchy',
  description: [
    'Implement `flattenEmployees(rootEmployee)`, which returns every employee in the org chart as a flat array, in depth-first order starting with the root.',
    'Employees look like `{ id, name, directReports }`, where `directReports` is an array of more employees.',
    'Return the employee objects themselves, and leave the original hierarchy intact — do not delete or empty anyone’s `directReports`.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** recognising a familiar traversal wearing business clothes. This is `collectValues` again; only the field names changed.",
  ],
  starter: `/**
 * Return every employee in depth-first order, root first.
 * Do not modify the original hierarchy.
 *
 * For this exercise, use a recursive solution.
 */
function flattenEmployees(rootEmployee) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${EMPLOYEE_SAMPLE}

const everyone = flattenEmployees(alice);

console.log('employees:', everyone);
console.log('expected names, in order:', ['Alice', 'Bob', 'Carol', 'Dave']);
`,
  solution: `function flattenEmployees(rootEmployee) {
  // The employee themselves comes first, then everyone beneath them.
  const employees = [rootEmployee];

  for (const report of rootEmployee.directReports) {
    for (const employee of flattenEmployees(report)) {
      employees.push(employee);
    }
  }

  return employees;
}
`,
  hints: [
    {
      id: 'same-as-collect',
      content:
        'You have written this already. The children are `employee.directReports` instead of `node.children`.',
    },
    {
      id: 'keep-objects',
      content:
        'Push the employee objects into your result as they are. Building new objects, or clearing `directReports` to "flatten" them, would damage the original tree.',
    },
  ],
  cases: [
    {
      id: 'single',
      name: 'An employee with no reports',
      source: `const solo = { id: 'solo', name: 'Solo', directReports: [] };
assert.deepEqual(flattenEmployees(solo).map((e) => e.id), ['solo']);`,
    },
    {
      id: 'multi-level',
      name: 'Collects every employee across several levels',
      source: `const org = {
  id: 'ceo', name: 'CEO',
  directReports: [
    { id: 'mgr-a', name: 'Manager A', directReports: [
      { id: 'a1', name: 'Employee A1', directReports: [] },
      { id: 'a2', name: 'Employee A2', directReports: [] },
    ] },
    { id: 'mgr-b', name: 'Manager B', directReports: [
      { id: 'lead-b1', name: 'Lead B1', directReports: [
        { id: 'b1', name: 'Employee B1', directReports: [] },
      ] },
    ] },
  ],
};
assert.deepEqual(
  flattenEmployees(org).map((e) => e.id),
  ['ceo', 'mgr-a', 'a1', 'a2', 'mgr-b', 'lead-b1', 'b1'],
);`,
    },
    {
      id: 'each-once',
      name: 'Includes every employee exactly once',
      source: `const org = {
  id: 'ceo', name: 'CEO',
  directReports: [
    { id: 'a', name: 'A', directReports: [{ id: 'a1', name: 'A1', directReports: [] }] },
    { id: 'b', name: 'B', directReports: [] },
  ],
};
const ids = flattenEmployees(org).map((e) => e.id);
assert.equal(ids.length, new Set(ids).size, 'no employee should appear twice');
assert.equal(ids.length, 4);`,
    },
    {
      id: 'hierarchy-intact',
      name: 'Leaves the original hierarchy untouched',
      source: `const carol = { id: 'carol', name: 'Carol', directReports: [{ id: 'dave', name: 'Dave', directReports: [] }] };
const alice = { id: 'alice', name: 'Alice', directReports: [carol] };
const result = flattenEmployees(alice);
assert.deepEqual(result.map((e) => e.id), ['alice', 'carol', 'dave']);
assert.equal(alice.directReports.length, 1);
assert.equal(carol.directReports.length, 1);
assert.equal(carol.directReports[0].id, 'dave');`,
    },
  ],
});

export const managementChainProblem = traversalProblem({
  id: 'management-chain',
  title: "Find an Employee's Management Chain",
  description: [
    'Implement `findManagementChain(rootEmployee, employeeId)`, which returns the ids from the top of the org chart down to that employee, inclusive.',
    'Employees look like `{ id, name, directReports }`. For Alice managing Bob and Carol, where Carol manages Dave, `findManagementChain(alice, "dave")` returns `["alice", "carol", "dave"]`.',
    'Return `null` when nobody has that id.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** the path pattern from Section 3 on realistic data. If it feels like a repeat of `findPath`, that is exactly the point — a lot of interview questions are this one question in disguise.",
  ],
  starter: `/**
 * Return the ids from the root down to the given employee, or null.
 *
 * For this exercise, use a recursive solution.
 */
function findManagementChain(rootEmployee, employeeId) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${EMPLOYEE_SAMPLE}

console.log('chain:', findManagementChain(alice, 'dave'));
console.log('expected:', ['alice', 'carol', 'dave']);
console.log('missing:', findManagementChain(alice, 'nobody'));
`,
  solution: `function findManagementChain(rootEmployee, employeeId) {
  // Base case: the chain from here is just this person.
  if (rootEmployee.id === employeeId) {
    return [rootEmployee.id];
  }

  for (const report of rootEmployee.directReports) {
    const chainBelow = findManagementChain(report, employeeId);

    // Someone below found them, so this manager is on the chain too.
    if (chainBelow !== null) {
      return [rootEmployee.id, ...chainBelow];
    }
  }

  return null;
}
`,
  hints: [
    {
      id: 'same-as-findpath',
      content:
        'This is the path-finding exercise with different field names. `directReports` are the children, and `id` is what you match on.',
    },
    {
      id: 'prepend-manager',
      content:
        'When a report returns a chain, that chain is missing the current manager. Put them on the front.',
    },
    {
      id: 'missing',
      content:
        'If nobody in this subtree matches, return null so the caller knows to keep looking in its other reports.',
    },
  ],
  cases: [
    {
      id: 'root',
      name: 'The chain to the root is just the root',
      source: `const alice = { id: 'alice', name: 'Alice', directReports: [] };
assert.deepEqual(findManagementChain(alice, 'alice'), ['alice']);`,
    },
    {
      id: 'deep',
      name: 'Builds a chain through several managers',
      source: `const org = {
  id: 'ceo', name: 'CEO',
  directReports: [
    { id: 'mgr-a', name: 'A', directReports: [{ id: 'a1', name: 'A1', directReports: [] }] },
    { id: 'mgr-b', name: 'B', directReports: [
      { id: 'lead-b1', name: 'B1', directReports: [{ id: 'b1', name: 'Deep', directReports: [] }] },
    ] },
  ],
};
assert.deepEqual(findManagementChain(org, 'b1'), ['ceo', 'mgr-b', 'lead-b1', 'b1']);
assert.deepEqual(findManagementChain(org, 'a1'), ['ceo', 'mgr-a', 'a1']);`,
    },
    {
      id: 'missing',
      name: 'Returns null for an unknown employee',
      source: `const org = { id: 'ceo', name: 'CEO', directReports: [{ id: 'a', name: 'A', directReports: [] }] };
assert.equal(findManagementChain(org, 'ghost'), null);`,
    },
    {
      id: 'no-contamination',
      name: 'Does not include managers from an unrelated branch',
      source: `const org = {
  id: 'ceo', name: 'CEO',
  directReports: [
    { id: 'mgr-a', name: 'A', directReports: [{ id: 'a1', name: 'A1', directReports: [] }] },
    { id: 'mgr-b', name: 'B', directReports: [{ id: 'b1', name: 'B1', directReports: [] }] },
  ],
};
assert.deepEqual(findManagementChain(org, 'b1'), ['ceo', 'mgr-b', 'b1']);`,
    },
  ],
});

export const listFilePathsProblem = traversalProblem({
  id: 'list-file-paths',
  title: 'List Every File Path',
  description: [
    'Implement `listFilePaths(root)`, which returns the full path of every file in a file tree, in depth-first order.',
    'Nodes are either `{ type: "folder", name, children }` or `{ type: "file", name }`. Join names with `/`.',
    'For a folder `src` containing `App.js` and a folder `components` containing `Button.js`, the result is `["src/App.js", "src/components/Button.js"]`. Folders themselves are never listed, and an empty folder contributes nothing.',
    'For this exercise, use a recursive solution.',
    "**What you're practicing:** leaf detection and path accumulation together — deciding what counts as an endpoint, and carrying the ancestry needed to describe it.",
  ],
  starter: `/**
 * Return the full path of every file, depth-first.
 * Folders are not listed; empty folders contribute nothing.
 *
 * For this exercise, use a recursive solution.
 */
function listFilePaths(root) {
  // Write your implementation here.
}

/* Runner — change anything here while you experiment. */
${FILE_TREE_SAMPLE}

console.log('paths:', listFilePaths(src));
console.log('expected:', ['src/App.js', 'src/components/Button.js']);
`,
  solution: `function listFilePaths(root, prefix = '') {
  // Build this node's own path from what the caller passed down.
  const path = prefix === '' ? root.name : prefix + '/' + root.name;

  // Base case: a file is an endpoint, and its path is the answer.
  if (root.type === 'file') {
    return [path];
  }

  const paths = [];

  for (const child of root.children) {
    // Children need to know the folder they live in.
    for (const childPath of listFilePaths(child, path)) {
      paths.push(childPath);
    }
  }

  return paths;
}
`,
  hints: [
    {
      id: 'what-is-a-leaf',
      content:
        'Decide first what counts as an endpoint. A file produces exactly one result; a folder produces whatever its children produce.',
    },
    {
      id: 'carry-prefix',
      content:
        'A node cannot know its own full path — the folders above it have to pass that context down, exactly like the depth parameter earlier.',
    },
    {
      id: 'no-leading-slash',
      content:
        'Watch the very first call: the root has no parent, so joining blindly would give you a leading slash.',
    },
    {
      id: 'empty-folders',
      content:
        'You do not need a special case for an empty folder. If a folder has no children, the loop produces nothing and the empty result is already correct.',
    },
  ],
  cases: [
    {
      id: 'root-file',
      name: 'Lists a file directly inside the root',
      source: `const tree = { type: 'folder', name: 'src', children: [{ type: 'file', name: 'index.js' }] };
assert.deepEqual(listFilePaths(tree), ['src/index.js']);`,
    },
    {
      id: 'nested',
      name: 'Lists nested and deeply nested files',
      source: `const tree = {
  type: 'folder', name: 'src',
  children: [
    { type: 'file', name: 'App.js' },
    { type: 'folder', name: 'components', children: [
      { type: 'file', name: 'Button.js' },
      { type: 'folder', name: 'icons', children: [{ type: 'file', name: 'Close.js' }] },
    ] },
  ],
};
assert.deepEqual(listFilePaths(tree), ['src/App.js', 'src/components/Button.js', 'src/components/icons/Close.js']);`,
    },
    {
      id: 'empty-folders',
      name: 'Ignores empty folders',
      source: `const tree = {
  type: 'folder', name: 'src',
  children: [
    { type: 'folder', name: 'empty', children: [] },
    { type: 'file', name: 'main.js' },
  ],
};
assert.deepEqual(listFilePaths(tree), ['src/main.js']);
assert.deepEqual(listFilePaths({ type: 'folder', name: 'nothing', children: [] }), []);`,
    },
    {
      id: 'sibling-branches',
      name: 'Keeps sibling branches separate',
      source: `const tree = {
  type: 'folder', name: 'root',
  children: [
    { type: 'folder', name: 'a', children: [{ type: 'folder', name: 'deep', children: [{ type: 'file', name: 'one.js' }] }] },
    { type: 'folder', name: 'b', children: [{ type: 'file', name: 'two.js' }] },
  ],
};
const paths = listFilePaths(tree);
assert.deepEqual(paths, ['root/a/deep/one.js', 'root/b/two.js']);
assert.ok(!paths[1].includes('deep'), 'the b branch must not inherit path parts from the a branch');`,
    },
  ],
});
