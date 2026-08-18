import { ProblemTree } from '../ProblemTree/ProblemTree';

interface NavigationSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * The taxonomy column, collapsible to a narrow rail.
 *
 * Collapsed means the tree is hidden and one obvious control brings it back —
 * deliberately not an icon-only miniature of the hierarchy, which would be
 * harder to read than the thing it replaces.
 */
export function NavigationSidebar({ collapsed, onToggle }: NavigationSidebarProps) {
  if (collapsed) {
    return (
      <div className="nav-rail">
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={false}
          aria-label="Expand problem navigation"
          title="Expand problem navigation"
          onClick={onToggle}
        >
          ☰
        </button>
      </div>
    );
  }

  return (
    <div className="nav-sidebar">
      <ProblemTree onCollapse={onToggle} />
    </div>
  );
}
