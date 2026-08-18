import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild-wasm';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Modules that preview iframes need as *text*.
 *
 * An opaque-origin sandbox can only receive code inline, so these are compiled
 * to IIFEs here at build time — with the esbuild-wasm the React runtime already
 * depends on, running under Node. That keeps each one a single source of truth
 * shared by the Worker and the previews, without making a plain HTML/CSS
 * exercise download the 14MB WASM compiler just to format a console line.
 */
const INLINE_MODULES: Record<string, { path: string; globalName: string }> = {
  'virtual:preview-serializer': {
    path: fileURLToPath(new URL('./src/runtime/shared/serialize.ts', import.meta.url)),
    globalName: '__previewSerializer',
  },
  'virtual:preview-test-api': {
    path: fileURLToPath(new URL('./src/runtime/shared/testing/testApi.ts', import.meta.url)),
    globalName: '__previewTestApi',
  },
};

function inlineModulesPlugin(): Plugin {
  const resolvedPrefix = '\0';

  return {
    name: 'preview-inline-modules',
    resolveId(id) {
      return id in INLINE_MODULES ? `${resolvedPrefix}${id}` : null;
    },
    async load(id) {
      if (!id.startsWith(resolvedPrefix)) return null;
      const entry = INLINE_MODULES[id.slice(resolvedPrefix.length)];
      if (!entry) return null;

      const source = await readFile(entry.path, 'utf8');
      const built = await esbuild.transform(source, {
        loader: 'ts',
        format: 'iife',
        globalName: entry.globalName,
        target: 'es2020',
        sourcefile: entry.path,
      });
      this.addWatchFile(entry.path);
      return `export default ${JSON.stringify(built.code)};`;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inlineModulesPlugin()],
});
