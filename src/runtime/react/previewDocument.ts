import {
  buildPreviewDocument,
  escapeForScript,
  testRunnerScript,
  toScriptString,
} from '../shared/preview/bridge';

export interface ReactPreviewDocumentInput {
  runId: number;
  /** CommonJS module id -> source text (React, ReactDOM, scheduler, …). */
  moduleSources: Record<string, string>;
  /** The user's entry file, already compiled to CommonJS. */
  userCode: string;
}

/**
 * A tiny CommonJS registry. The compiled user module's `require("react")` calls
 * resolve here rather than through import maps or the network.
 */
function moduleRegistryScript(moduleSources: Record<string, string>): string {
  const factories = Object.entries(moduleSources)
    .map(
      ([id, source]) => `  ${JSON.stringify(id)}: function (module, exports, require) {
${escapeForScript(source)}
  }`,
    )
    .join(',\n');

  return `
(function () {
  // React's development builds branch on this.
  window.process = { env: { NODE_ENV: "development" } };

  var factories = {
${factories}
  };
  var cache = {};

  function req(name) {
    if (Object.prototype.hasOwnProperty.call(cache, name)) return cache[name].exports;
    var factory = factories[name];
    if (!factory) {
      throw new Error(
        'Cannot find module "' + name + '". This preview provides only: ' +
        Object.keys(factories).join(", ") + "."
      );
    }
    var module = { exports: {} };
    cache[name] = module;
    factory(module, module.exports, req);
    return module.exports;
  }

  window.__require = req;
})();
`;
}

/**
 * Evaluates the user's module and mounts its default export.
 *
 * The compiled module arrives as a string and becomes a function via an
 * injected script's `textContent`, so a literal `</script>` anywhere in the
 * user's source — in a string, a template, a `String.raw` — cannot terminate
 * the surrounding element or be altered on its way in.
 */
function bootstrapScript(userCode: string): string {
  return `
(function () {
  var require = window.__require;
  var preview = window.__preview;
  var module = { exports: {} };

  var loader = document.createElement("script");
  loader.textContent =
    "window.__userModule = function (module, exports, require) {\\n" +
    ${toScriptString(userCode)} +
    "\\n};";
  document.body.appendChild(loader);

  if (typeof window.__userModule !== "function") {
    preview.reportMessage("The compiled module could not be loaded.");
    preview.ready();
    return;
  }

  try {
    window.__userModule(module, module.exports, require);
  } catch (error) {
    preview.reportError(error);
    preview.ready();
    return;
  }

  var App = module.exports && (module.exports.default || module.exports.App);
  if (typeof App !== "function") {
    preview.reportMessage(
      "No component to render: export your component as the default export, e.g. \`export default function App() { ... }\`."
    );
    preview.ready();
    return;
  }

  try {
    var React = require("react");
    var client = require("react-dom/client");
    var onError = function (error, info) {
      preview.reportError(error, info && info.componentStack);
    };
    var root = client.createRoot(document.getElementById("root"), {
      onUncaughtError: onError,
      onCaughtError: onError
    });
    root.render(React.createElement(App));
  } catch (error) {
    preview.reportError(error);
  }

  // Render is concurrent, so this only reports that bootstrapping finished.
  // Errors thrown during the commit still arrive afterwards, and the host keeps
  // accepting events from the active run.
  setTimeout(function () { preview.ready(); }, 0);
})();
`;
}

/** Builds the React preview document on top of the shared scaffold. */
export function buildReactPreviewDocument(input: ReactPreviewDocumentInput): string {
  return buildPreviewDocument({
    runId: input.runId,
    body: '<div id="root"></div>',
    scripts: [moduleRegistryScript(input.moduleSources), bootstrapScript(input.userCode)],
  });
}

/**
 * The evaluation variant: the same document the user sees, plus one test.
 *
 * Identical bootstrap, registry, sandbox and embedding protections — only the
 * console is silenced and a test runner is appended, so what gets checked is
 * exactly what the preview would render.
 */
export function buildReactEvaluationDocument(
  input: ReactPreviewDocumentInput & { testSource: string },
): string {
  return buildPreviewDocument({
    runId: input.runId,
    silentConsole: true,
    body: '<div id="root"></div>',
    scripts: [
      moduleRegistryScript(input.moduleSources),
      bootstrapScript(input.userCode),
      testRunnerScript(input.testSource),
    ],
  });
}
