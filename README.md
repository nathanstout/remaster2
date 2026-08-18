# JS Practice

A LeetCode-style playground for practical JavaScript and React problems.
Prototype scope: **problem catalogue → editor → isolated execution → console
(+ preview)**.

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
      serialize.ts                clone-safe value serialization (both runtimes)
    javascript/
      JavaScriptWorkerRuntime.ts  host side: worker lifecycle + timeouts
      javascript.worker.ts        sandbox: console, timers, error traps
      protocol.ts                 typed worker <-> host messages
    react/
      ReactPreviewRuntime.ts      host side: iframe lifecycle + stale fencing
      compiler.ts                 esbuild-wasm singleton (TSX -> CJS)
      previewDocument.ts          the generated sandbox document
      reactRuntimeSources.ts      React/ReactDOM as inlined text
      protocol.ts                 typed iframe <-> host messages
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
