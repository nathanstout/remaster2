import * as esbuild from 'esbuild-wasm';
import wasmURL from 'esbuild-wasm/esbuild.wasm?url';

/**
 * JSX/TSX compilation for preview runtimes.
 *
 * esbuild-wasm must be initialized exactly once per page. The promise is
 * memoized at module scope so that every runtime instance — and every
 * keystroke-triggered run — shares a single WASM instance. esbuild runs its
 * own Worker internally, so compilation stays off the main thread.
 */
let initialization: Promise<void> | null = null;

export function ensureCompiler(): Promise<void> {
  initialization ??= esbuild.initialize({ wasmURL }).catch((error: unknown) => {
    // Allow a later run to retry rather than wedging the runtime forever.
    initialization = null;
    throw error;
  });
  return initialization;
}

export interface CompileResult {
  code: string;
}

/** A compilation failure with esbuild's location-annotated message. */
export class CompileError extends Error {
  /** Read by the preview host: esbuild's text is already user-facing. */
  readonly isUserFacing = true;

  constructor(message: string) {
    super(message);
    this.name = 'CompileError';
  }
}

/**
 * Transforms one TSX/JSX source file into CommonJS.
 *
 * CommonJS (rather than ESM) is what lets the preview iframe run entirely from
 * inline classic scripts: bare imports become `require()` calls that the
 * iframe's tiny module registry resolves against the React runtime it already
 * has inlined. No import maps, no blob URLs, no network — all of which an
 * opaque-origin sandboxed iframe cannot use anyway.
 */
export async function compileModule(source: string, fileName: string): Promise<CompileResult> {
  await ensureCompiler();

  try {
    const result = await esbuild.transform(source, {
      loader: 'tsx',
      format: 'cjs',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      sourcefile: fileName,
      logLevel: 'silent',
    });
    return { code: result.code };
  } catch (error) {
    throw new CompileError(formatCompileError(error, fileName));
  }
}

/** esbuild throws a TransformFailure carrying structured `errors`. */
function formatCompileError(error: unknown, fileName: string): string {
  const errors = (error as { errors?: esbuild.Message[] }).errors;
  if (!Array.isArray(errors) || errors.length === 0) {
    return error instanceof Error ? error.message : String(error);
  }

  return errors
    .map((message) => {
      const at = message.location
        ? ` (${message.location.file || fileName}:${message.location.line}:${message.location.column + 1})`
        : '';
      const snippet = message.location?.lineText ? `\n    ${message.location.lineText.trim()}` : '';
      return `${message.text}${at}${snippet}`;
    })
    .join('\n');
}
