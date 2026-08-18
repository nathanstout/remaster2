import { PREVIEW_CHANNEL } from './protocol';

export interface PreviewDocumentInput {
  runId: number;
  /** IIFE build of the shared serializer, exposing `__previewSerializer`. */
  serializerSource: string;
  /** CommonJS module id -> source text (React, ReactDOM, scheduler, …). */
  moduleSources: Record<string, string>;
  /** The user's entry file, already compiled to CommonJS. */
  userCode: string;
}

/**
 * Nothing here may terminate the surrounding `<script>` element early. React's
 * sources happen to contain neither sequence today, but user code is arbitrary.
 */
function escapeForScript(source: string): string {
  return source.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

/** A minimal, predictable baseline. The host app's CSS never reaches here. */
const BASELINE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  padding: 16px;
  background: #ffffff;
  color: #1c1e22;
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
}
`;

/**
 * The console/error bridge. Installed before anything else runs so that React's
 * own development warnings are captured too.
 */
function bridgeScript(runId: number, serializerSource: string): string {
  return `
(function () {
  var RUN_ID = ${runId};
  var CHANNEL = ${JSON.stringify(PREVIEW_CHANNEL)};

${serializerSource}

  function post(message) {
    message.channel = CHANNEL;
    message.runId = RUN_ID;
    try {
      parent.postMessage(message, "*");
    } catch (error) {
      // Never let reporting break the preview.
    }
  }

  function serializeArg(value) {
    try {
      return __previewSerializer.serialize(value);
    } catch (error) {
      return { kind: "unserializable", text: "[unserializable value]" };
    }
  }

  function describe(value, componentStack) {
    var described;
    if (value instanceof Error) {
      described = { message: (value.name || "Error") + ": " + value.message };
    } else {
      try {
        described = { message: "Uncaught " + String(value) };
      } catch (error) {
        described = { message: "Uncaught (unprintable value)" };
      }
    }
    // Raw stacks point at generated positions inside this document, which are
    // meaningless to the user. React's component stack is the useful part —
    // once the generated source positions are stripped off it.
    if (componentStack) {
      described.stack = String(componentStack)
        .replace(/\\s*\\(about:srcdoc[^)]*\\)/g, "")
        .split("\\n")
        .map(function (line) { return line.trim(); })
        .filter(Boolean)
        .map(function (line) { return "    " + line; })
        .join("\\n");
    }
    return described;
  }

  window.__preview = {
    post: post,
    reportError: function (value, componentStack) {
      var described = describe(value, componentStack);
      post({ type: "error", message: described.message, stack: described.stack });
    },
    reportMessage: function (message) {
      post({ type: "error", message: message });
    }
  };

  var levels = ["log", "info", "warn", "error", "debug"];
  var intercepted = {};
  levels.forEach(function (level) {
    intercepted[level] = function () {
      var args = Array.prototype.slice.call(arguments).map(serializeArg);
      post({ type: "console", level: level, args: args });
    };
  });
  intercepted.trace = intercepted.log;
  intercepted.dir = intercepted.log;
  intercepted.table = intercepted.log;
  intercepted.group = intercepted.log;
  intercepted.groupEnd = function () {};
  intercepted.clear = function () {};
  window.console = intercepted;

  window.addEventListener("error", function (event) {
    event.preventDefault();
    window.__preview.reportError(event.error !== undefined && event.error !== null ? event.error : event.message);
  });

  window.addEventListener("unhandledrejection", function (event) {
    event.preventDefault();
    window.__preview.reportError(event.reason);
  });

  // React's development builds branch on this.
  window.process = { env: { NODE_ENV: "development" } };
})();
`;
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

/** Evaluates the user's module and mounts its default export. */
function bootstrapScript(userCode: string): string {
  return `
(function () {
  var require = window.__require;
  var preview = window.__preview;
  var module = { exports: {} };

  function done() {
    preview.post({ type: "ready" });
  }

  try {
    (function (module, exports, require) {
${escapeForScript(userCode)}
    })(module, module.exports, require);
  } catch (error) {
    preview.reportError(error);
    done();
    return;
  }

  var App = module.exports && (module.exports.default || module.exports.App);
  if (typeof App !== "function") {
    preview.reportMessage(
      "No component to render: export your component as the default export, e.g. \`export default function App() { ... }\`."
    );
    done();
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
  setTimeout(done, 0);
})();
`;
}

/**
 * Builds the complete preview document.
 *
 * Everything is inline: an opaque-origin sandbox cannot fetch our modules, so
 * the document has to arrive self-contained through `srcdoc`.
 */
export function buildPreviewDocument(input: PreviewDocumentInput): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>${BASELINE_CSS}</style>
</head>
<body>
<div id="root"></div>
<script>${bridgeScript(input.runId, input.serializerSource)}</script>
<script>${moduleRegistryScript(input.moduleSources)}</script>
<script>${bootstrapScript(input.userCode)}</script>
</body>
</html>`;
}
