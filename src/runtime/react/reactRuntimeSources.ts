/**
 * The React runtime, as source text, for injection into the preview iframe.
 *
 * The preview iframe is sandboxed with `allow-scripts` only, which gives it an
 * opaque origin. That rules out every usual way of supplying dependencies: it
 * cannot read the parent's blob: URLs, and module scripts fetched from our own
 * origin would be blocked as cross-origin. So React travels the one way that
 * still works — inlined into the document as text.
 *
 * These are the packages already installed in this app, so the preview always
 * matches the React version in package.json. Development builds are used
 * deliberately: their warnings ("rendered more hooks than expected", invalid
 * key, bad hook call) are exactly what a practice environment should surface,
 * and they arrive through the console bridge like any other message.
 *
 * This module is imported dynamically so ~1.1MB of text stays out of the main
 * bundle for anyone who never opens a React problem.
 */
import react from '../../../node_modules/react/cjs/react.development.js?raw';
import jsxRuntime from '../../../node_modules/react/cjs/react-jsx-runtime.development.js?raw';
import scheduler from '../../../node_modules/scheduler/cjs/scheduler.development.js?raw';
import reactDom from '../../../node_modules/react-dom/cjs/react-dom.development.js?raw';
import reactDomClient from '../../../node_modules/react-dom/cjs/react-dom-client.development.js?raw';

/** CommonJS module id -> source text. Each source may `require` the others. */
export const reactRuntimeSources: Record<string, string> = {
  react,
  'react/jsx-runtime': jsxRuntime,
  scheduler,
  'react-dom': reactDom,
  'react-dom/client': reactDomClient,
};
