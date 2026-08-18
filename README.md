# JS Practice

A LeetCode-style playground for practical JavaScript problems. Prototype scope:
**problem catalogue → editor → isolated execution → console**.

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
    javascript/
      JavaScriptWorkerRuntime.ts  host side: worker lifecycle + timeouts
      javascript.worker.ts        sandbox: console, timers, error traps
      protocol.ts                 typed worker <-> host messages
      serialize.ts                clone-safe value serialization
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

## Execution model

Every run gets a brand-new `Worker`. On each settled edit the runtime terminates
the previous worker, clears the console, constructs a fresh one and posts the
source to it. User code is only ever evaluated inside that worker — never in the
application's window.

Timeouts are enforced from the host, which is unaffected by a blocked worker:

- **4s** to finish the synchronous body → otherwise terminate + `Execution timed out.`
- **10s** total, covering pending timers → otherwise terminate with a note.

## Adding a runtime later

Implement `Runtime` (`run`/`dispose`, emitting `RuntimeEvent`s) and register it in
`createRuntime`. React and HTML/CSS/JS problems will back it with a sandboxed
iframe and add a preview surface; the editor, console and problem layers stay
as they are.
