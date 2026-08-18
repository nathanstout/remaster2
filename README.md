# JS Practice

A LeetCode-style playground for practical JavaScript, React and HTML/CSS/JS
problems. Prototype scope: **problem catalogue → editor(s) → isolated execution
→ console (+ preview)**.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint
```

## Layers

```
Problem catalogue
   │
   ▼
Selected problem (plain data)
   │
   ▼
Editor (Monaco)          ← knows nothing about execution
   │  source code
   ▼
Runtime  { run(source), dispose() }
   │
   ├── console events ──▶ Console UI
   └── error events
```

The only thing that couples the layers is `src/types/runtime.ts`.

## Structure

```
src/
  components/
    CodeEditor/       Monaco wrapper + local (non-CDN) Monaco setup
    Console/          console rendering, value formatting
    FileTabs/         file switcher for multi-file problems
    ProblemList/      problem selector
    ProblemPanel/     problem statement
    ProblemWorkspace/ one problem: editor + runtime + console
  hooks/
    useDebouncedValue.ts   edit debounce (400ms)
    useProblem.ts          problem lookup seam (sync now, async later)
    useRuntime.ts          owns a Runtime, turns its events into state
  problems/
    debounce.ts       \
    myMap.ts           }  problem definitions
    flattenObject.ts  /
    index.ts          catalogue: listProblems() + getProblem()
  runtime/
    createRuntime.ts              problem type -> runtime implementation
    shared/
      serialize.ts                clone-safe value serialization (all runtimes)
      preview/
        IframePreviewHost.ts      iframe lifecycle shared by preview runtimes
        bridge.ts                 console/error bridge + document scaffold + CSP
        protocol.ts               typed iframe <-> host messages
    javascript/
      JavaScriptWorkerRuntime.ts  host side: worker lifecycle + timeouts
      javascript.worker.ts        sandbox: console, timers, error traps
      protocol.ts                 typed worker <-> host messages
    react/
      ReactPreviewRuntime.ts      composes the shared host
      compiler.ts                 esbuild-wasm singleton (TSX -> CJS)
      previewDocument.ts          CJS registry + ReactDOM bootstrap
      reactRuntimeSources.ts      React/ReactDOM as inlined text
    web/
      WebPreviewRuntime.ts        composes the shared host
      previewDocument.ts          HTML/CSS/JS -> full document
  types/
    problem.ts
    runtime.ts
```

## Switching problems

`App` owns a `selectedProblemId` and resolves it through `useProblem`. The
workspace is mounted with `key={problem.id}`, so selecting another problem
replaces the subtree: source is reseeded from the problem definition, console
state is dropped, and `useRuntime`'s cleanup disposes the runtime — terminating
its Worker and any timers it still had pending. Each problem file gets its own
Monaco model URI, so undo history and diagnostics never cross problems.

## Runtimes

`Runtime` stays minimal (`run`/`dispose`). Runtimes that render also implement
`PreviewRuntime` (`mount`/`unmount`), detected with `isPreviewRuntime`, so the
headless Worker runtime is never asked for preview behaviour it does not have.

| Problem type | Runtime | Isolation |
| --- | --- | --- |
| `javascript` | `JavaScriptWorkerRuntime` | disposable Web Worker |
| `react` | `ReactPreviewRuntime` | disposable `sandbox="allow-scripts"` iframe |
| `web` | `WebPreviewRuntime` | disposable `sandbox="allow-scripts"` iframe |

Both preview runtimes compose `IframePreviewHost`, which owns run ids, mounting,
message validation, the bootstrap watchdog and teardown. They differ only in how
the document is built. Every preview carries a restrictive CSP
(`default-src 'none'`, inline script/style only, `connect-src 'none'`), so user
markup cannot reach the network.

### Embedding user source

User CSS and JavaScript never pass through the HTML parser. Both are handed to
the document as JS string literals with `<` escaped as `\u003c`, then attached
via `textContent`, so a literal `</script>` or `</style>` anywhere in ordinary
source — including inside `String.raw` or a `/…/u` regex, which textual escaping
would corrupt — is simply data. User *HTML* is inserted verbatim: it is markup,
and browsers already recover from malformed markup.

The console/error bridge is installed in `<head>`, ahead of the user's body
markup, so a `<script>` the user writes inside their own HTML is captured too.
Inline event handlers work (the CSP allows inline script) and their errors reach
the console.

`document.write` during parsing inserts, as in any page. After load it implies
`document.open()`, which discards the document and every listener on the window.
That is allowed, but the bridge re-arms its error traps afterwards and reports
once that the document was replaced — otherwise error reporting would stop
silently.

### Console budget

Each run may put `MAX_CONSOLE_ENTRIES` (500) messages on screen; the next one is
replaced by a single truncation notice and the run keeps going. The host cap is
authoritative and covers every runtime, and each execution context also stops
posting just past the same mark so a runaway loop cannot saturate the message
channel. Budgets are per run, so every edit starts fresh. Measured with a 100k
message loop: host event-loop stalls stayed under ~110ms.

### Web preview

`index.html` is body markup only, CodePen-style; the runtime supplies the
surrounding document. User JS runs at true top level in its own `<script>`, so
`function greet() {}` becomes a global that inline `onclick` handlers can call.
A separate trailing script reports startup, which is what keeps a *parse* error
in user JS from degrading into a startup timeout.

### React preview

TSX is compiled by esbuild-wasm (initialized once, module-scoped promise) to
**CommonJS**, then inlined into a `srcdoc` document alongside React itself. The
frame has an opaque origin, which is what forces that design: it cannot read the
parent's blob: URLs and cannot fetch our modules, so `import { useState } from
'react'` becomes `require("react")` and resolves against a tiny module registry
holding React's source text (taken from this app's own `node_modules`, so
versions always match). No import maps, no CDN, no network.

The runtime mounts the user's default export itself — problems never call
`createRoot`. Console output and errors return over `postMessage`, serialized
with the same module the Worker runtime uses, and are validated by source
window, channel tag and run id before reaching the console.

## Evaluation

Problems may carry `tests?: TestSuite` — plain data, like everything else in the
catalogue. `Run Tests` checks the **current editor contents**, not the debounced
copy, so pressing it right after typing checks what is on screen.

Evaluation is an optional runtime capability (`EvaluatableRuntime`), alongside
`PreviewRuntime`; the base `Runtime` is still two methods wide. Results travel on
their own `EvaluationEvent` channel rather than through `RuntimeEvent`, which is
what makes it structurally impossible for a test run to clear the console, spend
its 500-entry budget, or move the playground's run status.

Every case gets a fresh environment — a new Worker for JavaScript, a new hidden
off-screen iframe for React and web — so no test can observe state left by
another, and the visible preview is never touched. JavaScript tests share one
lexical scope with the solution (the test body sits in a nested block, so it
shadows rather than collides), which is why `debounce(...)` is directly callable
without exports. Test source reaches iframes through the same `toScriptString`
hardening as user source, so no `'unsafe-eval'` is needed in the preview CSP.

Tests get a tiny API: `assert.ok/equal/deepEqual/includes`, `sleep`, `waitFor`.
Each case has its own timeout (2s default), and a hang fails only that case.
Editing clears results and cancels any run in flight; so does switching problems.

## Navigation

Problem *content* and problem *organization* are separate. The catalogue owns
what an exercise is; `src/taxonomy` owns where it appears — flat
`ProblemFolder { id, name, parentId }` and `ProblemPlacement { problemId,
folderId }` records, with nesting derived for rendering. Folder ids are identity
and names are presentation, so Phase 7B can rename and move folders without
touching problems, drafts, or URLs. The hand-written taxonomy is validated at
startup (duplicate ids, unknown/self/cyclic parents, duplicate or dangling
placements, unplaced problems) and throws in development rather than quietly
rendering an incomplete tree.

The taxonomy is user-editable and persisted at `practice-app:taxonomy`
(`{ version, folders, placements }`). `defaultTaxonomy` stays immutable — it is
the source-controlled fallback that tells reconciliation where a newly added
problem belongs. On load the saved taxonomy is reconciled against the current
catalogue: custom folders, names, parents and placements are preserved,
placements for removed problems are dropped, and any problem the save predates
is filed at its default location, recreating only the default folders that
placement actually needs (with their original stable ids). A folder the user
deleted stays deleted until something needs it.

Organization edits live in `taxonomy/mutations.ts` as pure functions that build a
candidate taxonomy and validate it before returning, so a rejected operation —
a cycle, a non-empty delete, an empty name — leaves state untouched. The tree
requests mutations; it never performs them.

Routes are `/problem/:problemId`, keyed on stable problem ids only — never
folder paths. The URL is the sole source of truth for what is selected: there is
no parallel selection state, so reloads, deep links and browser Back/Forward all
stay consistent, and the tree highlight and ancestor expansion follow from the
route.

## Attempts

An unfinished attempt is saved automatically to `localStorage` under
`practice-app:draft:<problemId>` and restored when the problem is reopened. The
draft is resolved in the workspace's state initializer, before the first render,
so a restored attempt never flashes starter code on the way in.

A draft exists exactly when the source differs from the starter: opening a
problem and leaving writes nothing, and editing everything back to the starter
removes the record. `Problem.version` is compared against the saved
`problemVersion`, so changing a problem definition discards drafts written
against the old one instead of resurrecting stale code.

Two distinct ways to end an attempt, both of which drop the draft and remount the
workspace for a genuinely clean slate:

- **Reset Attempt** — start this problem over. Destructive, so it confirms inline.
- **Finish Attempt** — done practising. Never requires passing tests; this is
  where a practice record will later be written, and reset never will.

Only source text is persisted. Console output, previews, runtime state and test
results are always rebuilt from scratch.

## Editing

Workspace state is `Record<fileId, string>`, seeded from the problem definition
and debounced as a whole; `RuntimeSource` is always assembled from every file,
whichever one is being edited. Multi-file problems get a tab strip. Each file
owns a Monaco model at `file:///<problemId>/<fileId>`, created on first visit, so
undo history and diagnostics never cross a file or problem boundary. The editor
disposes every model it created on unmount (`keepCurrentModel` hands disposal
entirely to us), which is what stops models leaking across problem switches.

## Execution model

Every run gets a brand-new `Worker`. On each settled edit the runtime terminates
the previous worker, clears the console, constructs a fresh one and posts the
source to it. User code is only ever evaluated inside that worker — never in the
application's window.

Timeouts are enforced from the host, which is unaffected by a blocked worker:

- **4s** to finish the synchronous body → otherwise terminate + `Execution timed out.`
- **10s** total, covering pending timers → otherwise terminate with a note.

The React preview is destroyed and rebuilt per run too, but a *finished* run
stays alive so the rendered output remains clickable; only its 8s bootstrap
watchdog can tear it down.

Measured in Chrome: a `while (true) {}` inside the preview did **not** block the
host (max event-loop gap 101ms), because Chrome gives the opaque-origin sandbox
its own process, and the watchdog then removed the frame. This is a browser
behaviour, not a guarantee the architecture provides — see the note in
`ReactPreviewRuntime`.

## Adding a runtime later

Implement `Runtime` (`run`/`dispose`, emitting `RuntimeEvent`s) and register it in
`createRuntime`. React and HTML/CSS/JS problems will back it with a sandboxed
iframe and add a preview surface; the editor, console and problem layers stay
as they are.
