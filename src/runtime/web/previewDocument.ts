import type { RuntimeSource } from '../../types/runtime';
import { buildPreviewDocument, toScriptString } from '../shared/preview/bridge';

/**
 * Splits a web problem's files into the three preview slots.
 *
 * `RuntimeSource` deliberately carries no per-file metadata — it is just source
 * text — so classification happens by extension. Multiple stylesheets or
 * scripts are concatenated in the problem's own file order, which keeps the
 * door open for exercises with more than three files.
 */
export function splitWebSource(source: RuntimeSource): {
  html: string;
  css: string;
  js: string;
} {
  const html: string[] = [];
  const css: string[] = [];
  const js: string[] = [];

  for (const [fileId, contents] of Object.entries(source.files)) {
    if (fileId.endsWith('.css')) css.push(contents);
    else if (fileId.endsWith('.js')) js.push(contents);
    else if (fileId.endsWith('.html') || fileId.endsWith('.htm')) html.push(contents);
  }

  // The entry file leads, so a problem's main document comes first.
  const entry = source.files[source.entry];
  if (entry !== undefined && html.includes(entry)) {
    html.splice(html.indexOf(entry), 1);
    html.unshift(entry);
  }

  return { html: html.join('\n'), css: css.join('\n\n'), js: js.join('\n;\n') };
}

/**
 * Builds the preview document for an HTML/CSS/JS problem.
 *
 * The user writes body markup only — CodePen style — and the runtime supplies
 * the surrounding document, so exercises never have to repeat boilerplate.
 *
 * Their CSS and JavaScript are handed to the document as *strings* and attached
 * with `textContent`, rather than being written between `<style>`/`<script>`
 * tags. That is what makes a literal `</style>` or `</script>` inside otherwise
 * ordinary source harmless: the HTML parser never sees it.
 *
 * Their HTML, by contrast, is inserted verbatim — it is markup, and browsers
 * recover from malformed markup on their own. Pretending otherwise would
 * misrepresent how the platform behaves.
 */
export function buildWebPreviewDocument(runId: number, source: RuntimeSource): string {
  const { html, css, js } = splitWebSource(source);

  // In <head>, so styles are applied before the body is parsed — no flash of
  // unstyled markup on every rebuild.
  const styleScript = `
(function () {
  var style = document.createElement("style");
  style.textContent = ${toScriptString(css)};
  document.head.appendChild(style);
})();
`;

  // Appending an inline script executes it synchronously at global scope, so
  // `function greet() {}` still becomes a global that the user's inline
  // handlers can call — exactly as a literal <script> would behave. Syntax
  // errors surface through the bridge's window.onerror, as before.
  const userScript = `
(function () {
  var script = document.createElement("script");
  script.textContent = ${toScriptString(js)};
  document.body.appendChild(script);
})();
`;

  // A separate element, so it still runs when the script above throws or fails
  // to parse. Without it a syntax error would degrade into a startup timeout.
  const readyScript = `setTimeout(function () { window.__preview.ready(); }, 0);`;

  return buildPreviewDocument({
    runId,
    headScripts: [styleScript],
    body: html,
    scripts: [userScript, readyScript],
  });
}
