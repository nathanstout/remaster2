import type { ProblemFile } from '../../types/problem';

interface FileTabsProps {
  files: ProblemFile[];
  activeFileId: string;
  onSelect: (fileId: string) => void;
}

/** Minimal tab strip for multi-file problems. Selection only — no file management. */
export function FileTabs({ files, activeFileId, onSelect }: FileTabsProps) {
  return (
    <div className="file-tabs" role="tablist" aria-label="Files">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          role="tab"
          aria-selected={file.id === activeFileId}
          className={file.id === activeFileId ? 'selected' : undefined}
          onClick={() => onSelect(file.id)}
        >
          {file.name}
        </button>
      ))}
    </div>
  );
}
