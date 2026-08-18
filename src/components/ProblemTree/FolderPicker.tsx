import { getChildFolders, getRootFolders, type ProblemFolder, type Taxonomy } from '../../taxonomy';

interface FolderPickerProps {
  taxonomy: Taxonomy;
  /** Folders that may not be chosen — a folder cannot move into its own subtree. */
  excludedIds?: Set<string>;
  /** Offered for folder moves, which may return a folder to the root. */
  allowRoot?: boolean;
  onPick: (folderId: string | null) => void;
  onCancel: () => void;
}

function flatten(
  taxonomy: Taxonomy,
  folders: ProblemFolder[],
  depth: number,
  excluded: Set<string>,
): Array<{ folder: ProblemFolder; depth: number }> {
  const rows: Array<{ folder: ProblemFolder; depth: number }> = [];
  for (const folder of folders) {
    // Skipping an excluded folder skips its whole subtree, which is exactly the
    // set of destinations that would create a cycle.
    if (excluded.has(folder.id)) continue;
    rows.push({ folder, depth });
    rows.push(...flatten(taxonomy, getChildFolders(taxonomy, folder.id), depth + 1, excluded));
  }
  return rows;
}

/** A flat, indented list of destinations. Deliberately not drag-and-drop. */
export function FolderPicker({
  taxonomy,
  excludedIds = new Set(),
  allowRoot = false,
  onPick,
  onCancel,
}: FolderPickerProps) {
  const rows = flatten(taxonomy, getRootFolders(taxonomy), 0, excludedIds);

  return (
    <div className="folder-picker">
      <ul>
        {allowRoot && (
          <li>
            <button type="button" onClick={() => onPick(null)}>
              Top level
            </button>
          </li>
        )}
        {rows.map(({ folder, depth }) => (
          <li key={folder.id}>
            <button
              type="button"
              style={{ paddingLeft: `${8 + depth * 12}px` }}
              onClick={() => onPick(folder.id)}
            >
              {folder.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="picker-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
