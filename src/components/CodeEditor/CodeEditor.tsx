import Editor from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import './setupMonaco';

interface CodeEditorProps {
  /**
   * Model URI of the file being edited. Monaco keys its model — and therefore
   * its undo/redo stack and diagnostics — off this, so distinct paths keep
   * unrelated files fully isolated. Changing it switches files; the model for
   * the previous path stays alive with its history intact.
   */
  path: string;
  /**
   * Every model URI this editor is responsible for, i.e. all files of the
   * current problem. They are disposed together on unmount, which is what stops
   * models from leaking across problem switches.
   */
  ownedPaths: string[];
  value: string;
  language: string;
  onChange: (value: string) => void;
}

/**
 * A thin wrapper around Monaco.
 *
 * It knows nothing about execution: it reports source changes upward and owns
 * the lifetime of the models it created. That is the whole job.
 */
export function CodeEditor({ path, ownedPaths, value, language, onChange }: CodeEditorProps) {
  const ownedRef = useRef(ownedPaths);
  ownedRef.current = ownedPaths;

  // `keepCurrentModel` stops the editor from disposing whichever model happens
  // to be active on unmount, so disposal is all in one place instead of split
  // between the library (current file) and us (the rest).
  useEffect(() => {
    return () => {
      for (const owned of ownedRef.current) {
        monaco.editor.getModel(monaco.Uri.parse(owned))?.dispose();
      }
    };
  }, []);

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      path={path}
      defaultLanguage={language}
      value={value}
      onChange={(next) => onChange(next ?? '')}
      keepCurrentModel
      loading={<div className="editor-loading">Loading editor…</div>}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
      }}
    />
  );
}
