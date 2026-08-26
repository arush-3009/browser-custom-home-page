import { ArrowRight, FolderOpen, Layers3, Pencil, PanelTopOpen, Trash2 } from 'lucide-react';
import type { Workspace } from '../../types/domain';
import { relativeTime } from '../../lib/utils/date';
import { displayDomain } from '../../lib/utils/url';
import { Favicon } from '../common/Favicon';
import { Menu, MenuItem, MenuSeparator } from '../common/Menu';

export function WorkspaceCard({ workspace, restoring, onResume, onInspect, onRename, onDelete }: {
  workspace: Workspace;
  restoring: boolean;
  onResume: (destination: 'current-window' | 'new-window') => void;
  onInspect: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const tabs = [...workspace.tabs].sort((a, b) => a.order - b.order);
  const preview = tabs.slice(0, 3);
  return (
    <article className={`workspace-card workspace-card--${workspace.color}`}>
      <div className="workspace-card__topline">
        <span className="workspace-card__glyph"><Layers3 size={20} /></span>
        <Menu>
          <MenuItem className="menu-item" onSelect={() => onResume('current-window')}><PanelTopOpen size={15} />Open in current window</MenuItem>
          <MenuItem className="menu-item" onSelect={() => onResume('new-window')}><FolderOpen size={15} />Open in new window</MenuItem>
          <MenuItem className="menu-item" onSelect={onInspect}><Layers3 size={15} />Inspect contents</MenuItem>
          <MenuItem className="menu-item" onSelect={onRename}><Pencil size={15} />Rename</MenuItem>
          <MenuSeparator className="menu-separator" />
          <MenuItem className="menu-item menu-item--danger" onSelect={onDelete}><Trash2 size={15} />Delete workspace</MenuItem>
        </Menu>
      </div>
      <div className="workspace-card__title">
        <h3>{workspace.name}</h3>
        <span>{tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}</span>
      </div>
      <div className="workspace-card__structure" aria-label={`${tabs.length} saved tabs`}>
        {preview.map((tab) => (
          <div key={tab.id} className="workspace-preview-row">
            <Favicon url={tab.url} name={tab.title} source={tab.faviconUrl} size="small" />
            <span><strong>{tab.title}</strong><small>{displayDomain(tab.url)}</small></span>
          </div>
        ))}
        {tabs.length > preview.length && <button type="button" className="workspace-more" onClick={onInspect}>+{tabs.length - preview.length} more saved</button>}
      </div>
      <div className="workspace-card__footer">
        <span>{relativeTime(workspace.updatedAt)}</span>
        <button type="button" className="resume-button" onClick={() => onResume('new-window')} disabled={restoring}>
          {restoring ? 'Restoring…' : 'Resume'} {!restoring && <ArrowRight size={16} />}
        </button>
      </div>
    </article>
  );
}
