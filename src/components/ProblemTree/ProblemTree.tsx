import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getProblem } from '../../problems';
import {
  getAncestorFolders,
  getChildFolders,
  getDescendantFolders,
  getDirectProblems,
  getFolderForProblem,
  getRootFolders,
  useTaxonomy,
  type MutationResult,
  type ProblemFolder,
  type Taxonomy,
} from '../../taxonomy';
import { FolderPicker } from './FolderPicker';

/** Which inline form, if any, a row is currently showing. */
type RowAction =
  | { kind: 'none' }
  | { kind: 'menu'; target: string }
  | { kind: 'create'; parentId: string | null }
  | { kind: 'rename'; folderId: string }
  | { kind: 'move-folder'; folderId: string }
  | { kind: 'move-problem'; problemId: string };

interface TreeContext {
  taxonomy: Taxonomy;
  /** The domain layer. The tree requests mutations; it never performs them. */
  taxonomyActions: ReturnType<typeof useTaxonomy>;
  action: RowAction;
  setAction: (action: RowAction) => void;
  error: string | null;
  run: (result: MutationResult, onSuccess?: () => void) => void;
  expandFolder: (folderId: string) => void;
  expanded: Set<string>;
  onToggle: (folderId: string) => void;
}

function NameForm({
  label,
  initial,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial ?? '');
  return (
    <form
      className="tree-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
    >
      <input
        aria-label={label}
        value={name}
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      />
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

function RowMenu({ items }: { items: Array<{ label: string; onSelect: () => void }> }) {
  return (
    <div className="row-menu">
      {items.map((item) => (
        <button key={item.label} type="button" onClick={item.onSelect}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function FolderNode({
  folder,
  depth,
  context,
}: {
  folder: ProblemFolder;
  depth: number;
  context: TreeContext;
}) {
  const { taxonomy, action, setAction, run, expandFolder, expanded, onToggle } = context;
  const isOpen = expanded.has(folder.id);
  const childFolders = getChildFolders(taxonomy, folder.id);
  const problemIds = getDirectProblems(taxonomy, folder.id);
  const menuOpen = action.kind === 'menu' && action.target === folder.id;

  return (
    <li className="tree-node">
      <div className="tree-row">
        <button
          type="button"
          className="tree-folder"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          aria-expanded={isOpen}
          onClick={() => onToggle(folder.id)}
        >
          <span className="tree-caret">{isOpen ? '▾' : '▸'}</span>
          {folder.name}
        </button>
        <button
          type="button"
          className="row-actions"
          aria-label={`Actions for ${folder.name}`}
          // Without this the click would also reach the folder row and toggle it.
          onClick={(event) => {
            event.stopPropagation();
            setAction(menuOpen ? { kind: 'none' } : { kind: 'menu', target: folder.id });
          }}
        >
          •••
        </button>
      </div>

      {menuOpen && (
        <RowMenu
          items={[
            { label: 'New subfolder', onSelect: () => setAction({ kind: 'create', parentId: folder.id }) },
            { label: 'Rename', onSelect: () => setAction({ kind: 'rename', folderId: folder.id }) },
            { label: 'Move', onSelect: () => setAction({ kind: 'move-folder', folderId: folder.id }) },
            {
              label: 'Delete',
              onSelect: () => run(context.taxonomyActions.deleteFolder({ folderId: folder.id })),
            },
          ]}
        />
      )}

      {action.kind === 'rename' && action.folderId === folder.id && (
        <NameForm
          label="Folder name"
          initial={folder.name}
          onCancel={() => setAction({ kind: 'none' })}
          onSubmit={(name) => run(context.taxonomyActions.renameFolder({ folderId: folder.id, name }))}
        />
      )}

      {action.kind === 'create' && action.parentId === folder.id && (
        <NameForm
          label="New folder name"
          onCancel={() => setAction({ kind: 'none' })}
          onSubmit={(name) =>
            run(context.taxonomyActions.createFolder({ name, parentId: folder.id }), () =>
              // Keep the parent open so the new folder is visible.
              expandFolder(folder.id),
            )
          }
        />
      )}

      {action.kind === 'move-folder' && action.folderId === folder.id && (
        <FolderPicker
          taxonomy={taxonomy}
          allowRoot
          // Self and descendants are exactly the destinations that would loop.
          excludedIds={new Set([folder.id, ...getDescendantFolders(taxonomy, folder.id).map((f) => f.id)])}
          onCancel={() => setAction({ kind: 'none' })}
          onPick={(parentId) => run(context.taxonomyActions.moveFolder({ folderId: folder.id, parentId }))}
        />
      )}

      {isOpen && (
        <ul className="tree-children">
          {childFolders.map((child) => (
            <FolderNode key={child.id} folder={child} depth={depth + 1} context={context} />
          ))}

          {problemIds.map((problemId) => {
            const problem = getProblem(problemId);
            if (!problem) return null;
            const problemMenuOpen = action.kind === 'menu' && action.target === problemId;

            return (
              <li key={problemId} className="tree-node">
                <div className="tree-row">
                  <NavLink
                    to={`/problem/${problemId}`}
                    className={({ isActive }) => (isActive ? 'tree-problem selected' : 'tree-problem')}
                    style={{ paddingLeft: `${22 + depth * 14}px` }}
                  >
                    {problem.title}
                  </NavLink>
                  <button
                    type="button"
                    className="row-actions"
                    aria-label={`Actions for ${problem.title}`}
                    // Stops the click from also following the problem link.
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setAction(problemMenuOpen ? { kind: 'none' } : { kind: 'menu', target: problemId });
                    }}
                  >
                    •••
                  </button>
                </div>

                {problemMenuOpen && (
                  <RowMenu
                    items={[
                      {
                        label: 'Move to…',
                        onSelect: () => setAction({ kind: 'move-problem', problemId }),
                      },
                    ]}
                  />
                )}

                {action.kind === 'move-problem' && action.problemId === problemId && (
                  <FolderPicker
                    taxonomy={taxonomy}
                    onCancel={() => setAction({ kind: 'none' })}
                    onPick={(folderId) =>
                      folderId && run(context.taxonomyActions.moveProblem({ problemId, folderId }))
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/**
 * The navigation tree, derived from flat taxonomy data on every render.
 *
 * Selection is not stored here: the active problem comes from the route, so the
 * highlight stays correct after a reload, a deep link, or browser Back. Editing
 * organization changes this component's data only — it never touches the route,
 * so the workspace beside it is not remounted.
 */
export function ProblemTree({ activeProblemId }: { activeProblemId: string | undefined }) {
  const taxonomyActions = useTaxonomy();
  const { taxonomy } = taxonomyActions;
  const [action, setAction] = useState<RowAction>({ kind: 'none' });
  const [error, setError] = useState<string | null>(null);

  // Folders that must be open for the routed problem to be visible.
  const requiredOpen = useMemo(() => {
    if (!activeProblemId) return [];
    const folderId = getFolderForProblem(taxonomy, activeProblemId);
    if (!folderId) return [];
    return [...getAncestorFolders(taxonomy, folderId).map((f) => f.id), folderId];
  }, [taxonomy, activeProblemId]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(requiredOpen));

  // Also runs after a move: the selected problem's new branch opens so it stays
  // visible, while folders collapsed elsewhere stay collapsed.
  const requiredKey = requiredOpen.join('|');
  useEffect(() => {
    if (requiredOpen.length === 0) return;
    setExpanded((previous) => {
      if (requiredOpen.every((id) => previous.has(id))) return previous;
      const next = new Set(previous);
      for (const id of requiredOpen) next.add(id);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredKey]);

  const expandFolder = (folderId: string): void =>
    setExpanded((previous) => new Set(previous).add(folderId));

  const toggle = (folderId: string): void =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (!next.delete(folderId)) next.add(folderId);
      return next;
    });

  /** Adopts a mutation's outcome: close the form, or surface why it was refused. */
  const run = (result: MutationResult, onSuccess?: () => void): void => {
    if (result.ok) {
      setError(null);
      setAction({ kind: 'none' });
      onSuccess?.();
    } else {
      setError(result.error);
    }
  };

  const context: TreeContext = {
    taxonomy,
    taxonomyActions,
    action,
    setAction,
    error,
    run,
    expandFolder,
    expanded,
    onToggle: toggle,
  };

  return (
    <nav className="problem-list" aria-label="Problems">
      <header className="pane-header">
        <span>Problems</span>
        <button
          type="button"
          className="row-actions"
          aria-label="New root folder"
          onClick={() => setAction({ kind: 'create', parentId: null })}
        >
          +
        </button>
      </header>

      {error && <p className="tree-error">{error}</p>}

      {action.kind === 'create' && action.parentId === null && (
        <NameForm
          label="New folder name"
          onCancel={() => setAction({ kind: 'none' })}
          onSubmit={(name) => run(taxonomyActions.createFolder({ name, parentId: null }))}
        />
      )}

      <ul className="tree-root">
        {getRootFolders(taxonomy).map((folder) => (
          <FolderNode key={folder.id} folder={folder} depth={0} context={context} />
        ))}
      </ul>
    </nav>
  );
}
