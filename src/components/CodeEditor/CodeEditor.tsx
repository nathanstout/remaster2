import Editor from '@monaco-editor/react';
import './setupMonaco';

interface CodeEditorProps {
  /**
   * Unique identity for the edited file. Monaco keys its model — and therefore
   * its undo/redo stack and diagnostics — off this, so distinct paths keep
   * unrelated files fully isolated from one another.
   */
  path: string;
  value: string;
  language: string;
  onChange: (value: string) => void;
}

/**
 * A thin wrapper around Monaco.
 *
 * It knows nothing about execution: it reports source changes upward and that
 * is the end of its responsibility.
 */
export function CodeEditor({ path, value, language, onChange }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      theme="vs-dark"
      path={path}
      defaultLanguage={language}
      value={value}
      onChange={(next) => onChange(next ?? '')}
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
