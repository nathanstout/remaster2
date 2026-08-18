import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';

declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

/**
 * Serve Monaco from the bundle instead of its default CDN, and wire up its
 * language workers the way Vite expects. These are Monaco's own workers and
 * have nothing to do with the execution runtime.
 */
window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      default:
        return new EditorWorker();
    }
  },
};

loader.config({ monaco });
