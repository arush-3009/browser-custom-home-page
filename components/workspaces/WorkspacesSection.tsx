import { Archive, ArrowUpRight, Layers3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BrowserHomeData, Workspace } from '../../types/domain';
import { removeSavedTab, reorderSavedTabs } from '../../features/workspaces/operations';
import { sendBackgroundRequest } from '../../lib/chrome/messages';
import { nowIso } from '../../lib/utils/id';
import { AppDialog } from '../common/Dialog';
import { useToast } from '../common/Toast';
import { WorkspaceCard } from './WorkspaceCard';
import { WorkspaceDetailsDialog } from './WorkspaceDetailsDialog';

export function WorkspacesSection({ data, mutate }: {
  data: BrowserHomeData;
  mutate: (mutator: (data: BrowserHomeData) => BrowserHomeData) => Promise<BrowserHomeData>;
}) {
  const { show } = useToast();
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [renameWorkspace, setRenameWorkspace] = useState<Workspace | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const workspaces = useMemo(() => [...data.workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [data.workspaces]);
  const details = data.workspaces.find((workspace) => workspace.id === detailsId) ?? null;

  const resume = async (workspace: Workspace, destination: 'current-window' | 'new-window') => {
    setRestoringId(workspace.id);
    const result = await sendBackgroundRequest({ type: 'restore-workspace', workspaceId: workspace.id, destination });
    setRestoringId(null);
    show(result.message, { tone: result.ok ? 'success' : 'error', ...(result.warning ? { detail: result.warning } : {}) });
  };

  const openCapture = () => {
    if (typeof chrome !== 'undefined' && chrome.action?.openPopup) {
      void chrome.action.openPopup().catch(() => show('Open the Browser Home toolbar icon to add tabs.', { tone: 'info' }));
    } else {
      show('Open the Browser Home toolbar icon to add tabs.', { tone: 'info' });
    }
  };

  return (
    <section className="content-section workspace-section" aria-labelledby="workspaces-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow"><Archive size={15} />Workspaces</p>
          <h2 id="workspaces-heading">What you’ve put away</h2>
          <p>Recoverable activities—closed out of sight, ready to resume.</p>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div className="empty-state empty-state--workspaces">
          <span className="empty-state__icon"><Layers3 size={23} /></span>
          <div><h3>Clear the tabs. Keep the thread.</h3><p>Select related tabs from the Browser Home toolbar, name the activity, and put it away safely.</p></div>
          <button type="button" className="button button--quiet" onClick={() => setLearnOpen(true)}>How workspaces work <ArrowUpRight size={15} /></button>
        </div>
      ) : (
        <div className="workspace-grid">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              restoring={restoringId === workspace.id}
              onResume={(destination) => void resume(workspace, destination)}
              onInspect={() => setDetailsId(workspace.id)}
              onRename={() => { setRenameWorkspace(workspace); setRenameValue(workspace.name); }}
              onDelete={() => setDeleteWorkspace(workspace)}
            />
          ))}
        </div>
      )}

      <WorkspaceDetailsDialog
        workspace={details}
        open={Boolean(details)}
        onOpenChange={(open) => { if (!open) setDetailsId(null); }}
        onRemoveTab={(tabId) => void mutate((current) => ({ ...current, workspaces: current.workspaces.map((workspace) => workspace.id === detailsId ? removeSavedTab(workspace, tabId) : workspace) }))}
        onMoveTab={(from, to) => void mutate((current) => ({ ...current, workspaces: current.workspaces.map((workspace) => workspace.id === detailsId ? reorderSavedTabs(workspace, from, to) : workspace) }))}
        onAddTabs={openCapture}
      />
      <AppDialog
        open={Boolean(renameWorkspace)}
        onOpenChange={(open) => { if (!open) setRenameWorkspace(null); }}
        title="Rename workspace"
        description="Choose the activity name you want to recognize at a glance."
        size="small"
        footer={<>
          <button type="button" className="button button--ghost" onClick={() => setRenameWorkspace(null)}>Cancel</button>
          <button type="button" className="button button--primary" disabled={!renameValue.trim()} onClick={() => {
            if (!renameWorkspace || !renameValue.trim()) return;
            void mutate((current) => ({ ...current, workspaces: current.workspaces.map((workspace) => workspace.id === renameWorkspace.id ? { ...workspace, name: renameValue.trim(), updatedAt: nowIso() } : workspace) })).then(() => { setRenameWorkspace(null); show('Workspace renamed'); });
          }}>Rename</button>
        </>}
      ><label className="field-label">Workspace name<input className="text-field" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} autoFocus maxLength={120} /></label></AppDialog>
      <AppDialog
        open={Boolean(deleteWorkspace)}
        onOpenChange={(open) => { if (!open) setDeleteWorkspace(null); }}
        title={`Delete “${deleteWorkspace?.name ?? 'this workspace'}”?`}
        description={`Its ${deleteWorkspace?.tabs.length ?? 0} saved tabs will be removed from Browser Home. Open browser tabs are not affected.`}
        size="small"
        footer={<>
          <button type="button" className="button button--ghost" onClick={() => setDeleteWorkspace(null)}>Cancel</button>
          <button type="button" className="button button--danger" onClick={() => {
            if (!deleteWorkspace) return;
            void mutate((current) => ({ ...current, workspaces: current.workspaces.filter((workspace) => workspace.id !== deleteWorkspace.id) })).then(() => { setDeleteWorkspace(null); show('Workspace deleted', { tone: 'info' }); });
          }}>Delete workspace</button>
        </>}
      ><p className="notice notice--danger">This cannot be undone unless you have a recent Browser Home export.</p></AppDialog>
      <AppDialog
        open={learnOpen}
        onOpenChange={setLearnOpen}
        title="Put tabs away without losing your place"
        description="Workspaces are saved activities, separate from the websites you visit regularly."
        footer={<>
          <button type="button" className="button button--ghost" onClick={() => setLearnOpen(false)}>Close</button>
          <button type="button" className="button button--primary" onClick={() => { setLearnOpen(false); openCapture(); }}>Open capture</button>
        </>}
      >
        <ol className="how-it-works">
          <li><span>1</span><div><strong>Select a set of open tabs</strong><p>Use the Browser Home toolbar popup in your current Chrome window.</p></div></li>
          <li><span>2</span><div><strong>Save—or save and close</strong><p>Closing only happens after Chrome confirms the workspace was stored.</p></div></li>
          <li><span>3</span><div><strong>Resume when you’re ready</strong><p>Browser Home rebuilds order, pinned tabs, groups, and best-effort page position.</p></div></li>
        </ol>
      </AppDialog>
    </section>
  );
}
