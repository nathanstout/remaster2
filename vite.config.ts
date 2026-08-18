import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild-wasm';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const SERIALIZER_ID = 'virtual:preview-serializer';
const SERIALIZER_PATH = fileURLToPath(new URL('./src/runtime/shared/serialize.ts', import.meta.url));

/**
 * Exposes the shared console serializer as an IIFE *string*.
 *
 * Preview iframes are opaque-origin and can only receive code inline, so the
 * serializer has to reach them as text. Compiling it here at build time — with
 * the esbuild-wasm the React runtime already depends on, running under Node —
 * keeps `serialize.ts` the single source of truth for both the Worker and the
 * previews, without making a plain HTML/CSS exercise download the 14MB WASM
 * compiler just to format a console line.
 */
function previewSerializerPlugin(): Plugin {
  const resolved = `\0${SERIALIZER_ID}`;

  return {
    name: 'preview-serializer',
    resolveId(id) {
      return id === SERIALIZER_ID ? resolved : null;
    },
    async load(id) {
      if (id !== resolved) return null;
      const source = await readFile(SERIALIZER_PATH, 'utf8');
      const built = await esbuild.transform(source, {
        loader: 'ts',
        format: 'iife',
        globalName: '__previewSerializer',
        target: 'es2020',
        sourcefile: SERIALIZER_PATH,
      });
      this.addWatchFile(SERIALIZER_PATH);
      return `export default ${JSON.stringify(built.code)};`;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), previewSerializerPlugin()],
});
