import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import type { Workspace } from '../../types/domain';
import { displayDomain } from '../../lib/utils/url';
import { AppDialog } from '../common/Dialog';
import { Favicon } from '../common/Favicon';

export function WorkspaceDetailsDialog({ workspace, open, onOpenChange, onRemoveTab, onMoveTab, onAddTabs }: {
  workspace: Workspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveTab: (tabId: string) => void;
  onMoveTab: (from: number, to: number) => void;
  onAddTabs: () => void;
}) {
  if (!workspace) return null;
  const tabs = [...workspace.tabs].sort((a, b) => a.order - b.order);
  const groupMap = new Map(workspace.groups.map((group) => [group.id, group]));
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={workspace.name}
      description={`${tabs.length} saved ${tabs.length === 1 ? 'tab' : 'tabs'} · arranged in restore order`}
      size="large"
      footer={<>
        <button type="button" className="button button--quiet" onClick={onAddTabs}><Plus size={16} />Add open tabs</button>
        <button type="button" className="button button--primary" onClick={() => onOpenChange(false)}>Done</button>
      </>}
    >
      <div className="saved-tab-list">
        {tabs.length === 0 && <div className="notice">This workspace is empty. Add open tabs from the toolbar popup.</div>}
        {tabs.map((tab, index) => {
          const group = tab.groupId ? groupMap.get(tab.groupId) : undefined;
          return (
            <div key={tab.id} className="saved-tab-row">
              <span className="saved-tab-row__order">{index + 1}</span>
              <Favicon url={tab.url} name={tab.title} source={tab.faviconUrl} size="small" />
              <span className="saved-tab-row__copy"><strong>{tab.title}</strong><small>{displayDomain(tab.url)}{tab.pinned ? ' · Pinned' : ''}{group?.title ? ` · ${group.title}` : ''}</small></span>
              <a href={tab.url} target="_blank" rel="noreferrer" className="icon-button" aria-label={`Open ${tab.title}`}><ExternalLink size={15} /></a>
              <button type="button" className="icon-button" onClick={() => onMoveTab(index, index - 1)} disabled={index === 0} aria-label={`Move ${tab.title} earlier`}><ArrowUp size={15} /></button>
              <button type="button" className="icon-button" onClick={() => onMoveTab(index, index + 1)} disabled={index === tabs.length - 1} aria-label={`Move ${tab.title} later`}><ArrowDown size={15} /></button>
              <button type="button" className="icon-button icon-button--danger" onClick={() => onRemoveTab(tab.id)} aria-label={`Remove ${tab.title}`}><Trash2 size={15} /></button>
            </div>
          );
        })}
      </div>
    </AppDialog>
  );
}
