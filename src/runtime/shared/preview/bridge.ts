import serializerSource from 'virtual:preview-serializer';
import testApiSource from 'virtual:preview-test-api';
import { CONSOLE_POST_LIMIT } from '../consoleLimit';
import { PREVIEW_CHANNEL } from './protocol';

/**
 * Escapes source that is written *literally* into a `<script>` element.
 *
 * Only safe for code we vendor ourselves. It rewrites `</script` to `<\/script`,
 * which is transparent to the JS parser in strings, templates and comments — but
 * *not* in `String.raw` templates or in `/…/u` regexes, where the added
 * backslash survives or is rejected. User-authored source therefore goes through
 * `toScriptString` instead, which cannot be corrupted at all.
 */
export function escapeForScript(source: string): string {
  return source.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

/**
 * Encodes arbitrary text as a JavaScript string literal that is safe to place
 * inside a `<script>` element.
 *
 * Escaping `<` as `\u003c` means the emitted text contains no `<` at all, so the
 * HTML parser can never see `</script`, `</style` or a comment opener no matter
 * what the user wrote. The literal still evaluates back to the exact original
 * text, so nothing — `String.raw`, regexes, anything — is altered. Paired with
 * assigning the result to a `textContent`, this takes user source out of the
 * HTML parser's reach entirely.
 */
export function toScriptString(source: string): string {
  return JSON.stringify(source).replace(/</g, '\\u003c');
}

/** Escapes text destined for an HTML text/attribute context. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Locks the preview down to what the runtime itself injects.
 *
 * `'unsafe-inline'` is required for our own inline bridge and for the user's
 * inline script and styles — that is the whole execution model here. Everything
 * that would reach the network is denied, so user markup cannot casually pull
 * in remote scripts, stylesheets, frames or fetch endpoints.
 */
export const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  "connect-src 'none'",
].join('; ');

/** A minimal, predictable baseline. The host app's CSS never reaches a preview. */
export const BASELINE_CSS = `
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
 * The console/error bridge, injected before any other script in a preview.
 *
 * Installing it first is what lets it capture output from everything that
 * follows — including a framework's own startup warnings. It exposes
 * `window.__preview` for runtime-specific bootstrap code to report through, and
 * uses the same serializer as the Worker runtime so both produce identical
 * console values.
 */
export function bridgeScript(runId: number, options: { silentConsole?: boolean } = {}): string {
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

  function describe(value, detail) {
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
    // meaningless to the user. Runtime-supplied detail (such as React's
    // component stack) is the useful part, once those positions are stripped.
    if (detail) {
      described.stack = String(detail)
        .replace(/\\s*\\((?:about:srcdoc|<anonymous>)[^)]*\\)/g, "")
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
    ready: function () {
      post({ type: "ready" });
    },
    reportError: function (value, detail) {
      var described = describe(value, detail);
      post({ type: "error", message: described.message, stack: described.stack });
    },
    reportMessage: function (message) {
      post({ type: "error", message: message });
    }
  };

  // A runaway loop can post faster than the host can drain the queue, so this
  // frame stops talking once its output is past the point of being useful. The
  // frame is disposable, so the budget is naturally per-run.
  var consolePosts = 0;
  function postConsole(level, args) {
    if (consolePosts >= ${CONSOLE_POST_LIMIT}) return;
    consolePosts += 1;
    post({ type: "console", level: level, args: args.map(serializeArg) });
  }

  // Evaluation documents drop console output entirely: results travel on their
  // own channel, and a noisy solution must not be able to drown them out or
  // spend the playground console's budget.
  var silent = ${options.silentConsole ? 'true' : 'false'};

  var levels = ["log", "info", "warn", "error", "debug"];
  var intercepted = {};
  levels.forEach(function (level) {
    intercepted[level] = function () {
      if (silent) return;
      postConsole(level, Array.prototype.slice.call(arguments));
    };
  });
  intercepted.trace = intercepted.log;
  intercepted.dir = intercepted.log;
  intercepted.table = intercepted.log;
  intercepted.group = intercepted.log;
  intercepted.groupCollapsed = intercepted.log;
  intercepted.groupEnd = function () {};
  intercepted.clear = function () {};
  intercepted.assert = function (condition) {
    if (!condition) {
      postConsole("error", ["Assertion failed:"].concat(Array.prototype.slice.call(arguments, 1)));
    }
  };
  window.console = intercepted;

  function installErrorTraps() {
    window.addEventListener("error", function (event) {
      event.preventDefault();
      window.__preview.reportError(
        event.error !== undefined && event.error !== null ? event.error : event.message
      );
    });

    window.addEventListener("unhandledrejection", function (event) {
      event.preventDefault();
      window.__preview.reportError(event.reason);
    });
  }

  installErrorTraps();

  // document.write after parsing implies document.open(), which throws the
  // whole document away -- including every listener registered on this window.
  // The console override survives (it is a property, not a listener) but error
  // reporting would silently stop, so re-arm it and say what happened once.
  var warnedAboutWrite = false;
  ["write", "writeln"].forEach(function (name) {
    var original = document[name];
    document[name] = function () {
      var replacing = document.readyState !== "loading";
      var result = original.apply(document, arguments);
      if (replacing) {
        installErrorTraps();
        if (!warnedAboutWrite) {
          warnedAboutWrite = true;
          window.__preview.reportMessage(
            "document." + name + "() after load replaced the preview document. " +
            "Existing markup and listeners were discarded."
          );
        }
      }
      return result;
    };
  });
})();
`;
}

/**
 * Runs one test case inside an evaluation document and reports the outcome.
 *
 * The test body is injected the same way user source is — as a string attached
 * to a script element's `textContent` — so a literal `</script>` in a test
 * cannot corrupt the document, and no `'unsafe-eval'` has to be added to the
 * preview CSP for a `Function` constructor.
 */
export function testRunnerScript(testSource: string): string {
  return `
(function () {
${testApiSource}

  var api = __previewTestApi.createTestApi();
  var preview = window.__preview;
  var started = Date.now();

  function report(message) {
    message.type = "test";
    message.durationMs = Date.now() - started;
    preview.post(message);
  }

  function describeFailure(error) {
    if (error && error.name === "AssertionError") {
      return {
        status: "failed",
        message: error.message,
        expected: error.hasComparison ? __previewSerializer.serialize(error.expected) : undefined,
        actual: error.hasComparison ? __previewSerializer.serialize(error.actual) : undefined
      };
    }
    if (error instanceof Error) {
      return { status: "failed", message: error.name + ": " + error.message };
    }
    return { status: "failed", message: "Test threw " + String(error) };
  }

  var loader = document.createElement("script");
  loader.textContent =
    "window.__runTest = async function (assert, sleep, waitFor) {\\n" +
    ${JSON.stringify(testSource).replace(/</g, '\\u003c')} +
    "\\n};";
  document.body.appendChild(loader);

  if (typeof window.__runTest !== "function") {
    report({ status: "failed", message: "The test could not be compiled." });
    return;
  }

  Promise.resolve()
    .then(function () { return window.__runTest(api.assert, api.sleep, api.waitFor); })
    .then(function () { report({ status: "passed" }); })
    .catch(function (error) { report(describeFailure(error)); });
})();
`;
}

export interface PreviewDocumentParts {
  runId: number;
  /** Evaluation documents suppress console forwarding. */
  silentConsole?: boolean;
  /**
   * Scripts run in `<head>`, after the bridge but before body markup is parsed.
   * Anything that must be in place before the user's own markup runs — such as
   * injecting their stylesheet — belongs here.
   */
  headScripts?: string[];
  /** Body markup rendered before the body scripts run. */
  body?: string;
  /** Scripts appended after the body markup, in order. */
  scripts: string[];
}

/**
 * Assembles a complete preview document.
 *
 * Everything is inline: an opaque-origin sandbox cannot fetch our modules, so
 * the document has to arrive self-contained through `srcdoc`.
 */
function scriptElements(sources: string[]): string {
  return sources.map((source) => `<script>${source}</script>`).join('\n');
}

export function buildPreviewDocument(parts: PreviewDocumentParts): string {
  // The bridge goes in <head>, ahead of the user's markup. That ordering is
  // what lets it capture output and errors from a `<script>` the user wrote
  // inside their own HTML, which runs while the body is still being parsed.
  const head = scriptElements([
    bridgeScript(parts.runId, { silentConsole: parts.silentConsole }),
    ...(parts.headScripts ?? []),
  ]);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(PREVIEW_CSP)}">
<style>${BASELINE_CSS}</style>
${head}
</head>
<body>
${parts.body ?? ''}
${scriptElements(parts.scripts)}
</body>
</html>`;
}
