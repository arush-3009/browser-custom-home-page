import type {
  CaptureTarget,
  OperationResult,
  SavedTab,
  SavedTabGroup,
  Workspace,
  WorkspaceColor,
} from '../../types/domain';
import { capturePageState, restorePageState } from '../../lib/chrome/page-state';
import { readData, updateData } from '../../lib/storage/repository';
import { createId, nowIso } from '../../lib/utils/id';
import { isRestorableUrl } from '../../lib/utils/url';
import { deduplicateTabs, mergeWorkspace } from './operations';

const workspaceColors: WorkspaceColor[] = ['violet', 'blue', 'cyan', 'emerald', 'amber', 'rose'];
const restoring = new Set<string>();

interface CaptureResult {
  workspace: Workspace;
  stateFailureCount: number;
  duplicateCount: number;
}

async function getExistingTabs(tabIds: number[]): Promise<chrome.tabs.Tab[]> {
  const settled = await Promise.allSettled(tabIds.map((tabId) => chrome.tabs.get(tabId)));
  return settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []).sort((a, b) => a.index - b.index);
}

async function captureGroups(tabs: chrome.tabs.Tab[]): Promise<{
  groups: SavedTabGroup[];
  groupIds: Map<number, string>;
}> {
  const numericIds = [...new Set(tabs.map((tab) => tab.groupId).filter((id) => id !== undefined && id >= 0))];
  const groupIds = new Map<number, string>();
  const groups: SavedTabGroup[] = [];

  for (const numericId of numericIds) {
    try {
      const group = await chrome.tabGroups.get(numericId);
      const id = createId('group');
      groupIds.set(numericId, id);
      groups.push({
        id,
        ...(group.title ? { title: group.title } : {}),
        color: group.color,
        collapsed: group.collapsed,
        order: groups.length,
      });
    } catch (error) {
      console.debug('Browser Home skipped a tab group that disappeared during capture.', numericId, error);
    }
  }
  return { groups, groupIds };
}

async function buildWorkspace(tabIds: number[], name: string, color: WorkspaceColor): Promise<CaptureResult> {
  const tabs = await getExistingTabs(tabIds);
  if (tabs.length === 0) throw new Error('The selected tabs are no longer open.');
  const { groups, groupIds } = await captureGroups(tabs);
  let stateFailureCount = 0;

  const savedTabs = await Promise.all(tabs.map(async (tab, order): Promise<SavedTab | undefined> => {
    const url = tab.url ?? tab.pendingUrl;
    if (!url) return undefined;
    const pageState = await capturePageState(tab);
    if (!pageState && (url.startsWith('http://') || url.startsWith('https://'))) stateFailureCount += 1;
    const groupId = tab.groupId !== undefined ? groupIds.get(tab.groupId) : undefined;
    return {
      id: createId('tab'),
      url,
      title: tab.title?.trim() || url,
      ...(tab.favIconUrl ? { faviconUrl: tab.favIconUrl } : {}),
      order,
      pinned: tab.pinned,
      ...(groupId ? { groupId } : {}),
      ...(pageState ? { pageState } : {}),
    };
  }));

  const filteredTabs = savedTabs.filter((tab): tab is SavedTab => Boolean(tab));
  const deduplicated = deduplicateTabs(filteredTabs);
  if (deduplicated.tabs.length === 0) throw new Error('None of the selected tabs had a restorable address.');
  const usedGroupIds = new Set(deduplicated.tabs.flatMap((tab) => tab.groupId ? [tab.groupId] : []));
  const timestamp = nowIso();
  const activeTab = tabs.find((tab) => tab.active);
  const activeSavedTab = activeTab
    ? deduplicated.tabs.find((tab) => tab.url === (activeTab.url ?? activeTab.pendingUrl))
    : undefined;

  return {
    workspace: {
      id: createId('workspace'),
      name: name.trim(),
      color,
      status: 'saved',
      createdAt: timestamp,
      updatedAt: timestamp,
      tabs: deduplicated.tabs,
      groups: groups.filter((group) => usedGroupIds.has(group.id)),
      ...(activeSavedTab ? { activeSavedTabId: activeSavedTab.id } : {}),
    },
    stateFailureCount,
    duplicateCount: deduplicated.duplicateCount,
  };
}

async function closeTabsAfterSave(tabIds: number[]): Promise<number> {
  const results = await Promise.allSettled(tabIds.map((tabId) => chrome.tabs.remove(tabId)));
  return results.filter((result) => result.status === 'rejected').length;
}

export async function captureWorkspace(
  tabIds: number[],
  target: CaptureTarget,
  closeAfterSave: boolean,
): Promise<OperationResult> {
  try {
    const data = await readData();
    const existing = target.kind === 'existing'
      ? data.workspaces.find((workspace) => workspace.id === target.workspaceId)
      : undefined;
    if (target.kind === 'existing' && !existing) {
      return { ok: false, message: 'That workspace no longer exists.' };
    }

    const name = target.kind === 'new' ? target.name.trim() : existing!.name;
    if (!name) return { ok: false, message: 'Give this workspace a name.' };
    const color = target.kind === 'new'
      ? (target.color ?? workspaceColors[data.workspaces.length % workspaceColors.length]!)
      : existing!.color;
    const captured = await buildWorkspace(tabIds, name, color);
    let savedCount = captured.workspace.tabs.length;
    let duplicateCount = captured.duplicateCount;
    let workspaceId = captured.workspace.id;

    await updateData((current) => {
      if (target.kind === 'new') {
        return { ...current, workspaces: [captured.workspace, ...current.workspaces] };
      }
      const index = current.workspaces.findIndex((workspace) => workspace.id === target.workspaceId);
      if (index < 0) throw new Error('That workspace was deleted before the tabs could be saved.');
      const merged = mergeWorkspace(current.workspaces[index]!, captured.workspace);
      savedCount = merged.addedCount;
      duplicateCount += merged.duplicateCount;
      workspaceId = merged.workspace.id;
      const workspaces = [...current.workspaces];
      workspaces[index] = merged.workspace;
      return { ...current, workspaces };
    });

    let closeFailureCount = 0;
    if (closeAfterSave) closeFailureCount = await closeTabsAfterSave(tabIds);

    const notes: string[] = [];
    if (duplicateCount > 0) notes.push(`${duplicateCount} duplicate ${duplicateCount === 1 ? 'was' : 'were'} skipped`);
    if (captured.stateFailureCount > 0) notes.push('some page positions could not be captured');
    if (closeFailureCount > 0) notes.push(`${closeFailureCount} ${closeFailureCount === 1 ? 'tab was' : 'tabs were'} already closed or could not be closed`);
    return {
      ok: true,
      workspaceId,
      savedCount,
      duplicateCount,
      message: target.kind === 'new'
        ? `Workspace “${name}” saved`
        : `${savedCount} ${savedCount === 1 ? 'tab' : 'tabs'} added to “${name}”`,
      ...(notes.length > 0 ? { warning: notes.join('; ') } : {}),
    };
  } catch (error) {
    console.error('Browser Home could not save the workspace.', error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'The workspace could not be saved. No tabs were closed.',
    };
  }
}

interface CreatedTab {
  saved: SavedTab;
  tabId: number;
}

async function createSavedTabs(workspace: Workspace, destination: 'current-window' | 'new-window'): Promise<{
  created: CreatedTab[];
  windowId: number;
  skipped: number;
}> {
  const ordered = [...workspace.tabs].sort((a, b) => a.order - b.order);
  const restorable = ordered.filter((tab) => isRestorableUrl(tab.url));
  let skipped = ordered.length - restorable.length;
  if (restorable.length === 0) throw new Error('This workspace has no URLs Chrome can reopen.');

  const created: CreatedTab[] = [];
  let windowId: number;

  if (destination === 'new-window') {
    let firstOpenedIndex = -1;
    let openedWindow: chrome.windows.Window | undefined;
    for (const [index, saved] of restorable.entries()) {
      try {
        const candidate = await chrome.windows.create({ url: saved.url, focused: true });
        const candidateTab = candidate?.tabs?.[0];
        if (!candidate || candidate.id === undefined || candidateTab?.id === undefined) throw new Error('Chrome did not return the created tab.');
        firstOpenedIndex = index;
        openedWindow = candidate;
        if (saved.pinned) await chrome.tabs.update(candidateTab.id, { pinned: true });
        created.push({ saved, tabId: candidateTab.id });
        break;
      } catch (error) {
        skipped += 1;
        console.debug('Browser Home skipped a URL Chrome refused to open.', saved.url, error);
      }
    }
    if (!openedWindow || openedWindow.id === undefined) throw new Error('Chrome could not create the workspace window.');
    windowId = openedWindow.id;

    for (const [index, saved] of restorable.entries()) {
      if (index <= firstOpenedIndex) continue;
      try {
        const tab = await chrome.tabs.create({ windowId, url: saved.url, active: false, pinned: saved.pinned });
        if (tab.id !== undefined) created.push({ saved, tabId: tab.id });
      } catch (error) {
        skipped += 1;
        console.debug('Browser Home skipped a URL Chrome refused to open.', saved.url, error);
      }
    }
  } else {
    const currentWindow = await chrome.windows.getCurrent({ populate: true });
    if (currentWindow.id === undefined) throw new Error('Chrome could not identify the current window.');
    windowId = currentWindow.id;
    for (const saved of restorable) {
      try {
        const tab = await chrome.tabs.create({ windowId, url: saved.url, active: false, pinned: saved.pinned });
        if (tab.id !== undefined) created.push({ saved, tabId: tab.id });
      } catch (error) {
        skipped += 1;
        console.debug('Browser Home skipped a URL Chrome refused to open.', saved.url, error);
      }
    }
  }
  return { created, windowId, skipped };
}

async function restoreGroups(workspace: Workspace, created: CreatedTab[], windowId: number): Promise<void> {
  for (const group of [...workspace.groups].sort((a, b) => a.order - b.order)) {
    const tabIds = created.filter((entry) => entry.saved.groupId === group.id && !entry.saved.pinned).map((entry) => entry.tabId);
    if (tabIds.length === 0) continue;
    try {
      const groupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]], createProperties: { windowId } });
      await chrome.tabGroups.update(groupId, {
        ...(group.title ? { title: group.title } : {}),
        color: group.color,
        collapsed: group.collapsed,
      });
    } catch (error) {
      console.debug('Browser Home could not recreate a saved tab group.', group.title, error);
    }
  }
}

export async function restoreWorkspace(
  workspaceId: string,
  destination: 'current-window' | 'new-window',
): Promise<OperationResult> {
  if (restoring.has(workspaceId)) return { ok: false, message: 'This workspace is already being restored.' };
  restoring.add(workspaceId);
  try {
    const data = await readData();
    const workspace = data.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return { ok: false, message: 'That workspace no longer exists.' };

    const result = await createSavedTabs(workspace, destination);
    if (result.created.length === 0) throw new Error('Chrome could not reopen any tabs from this workspace.');
    await restoreGroups(workspace, result.created, result.windowId);

    const active = result.created.find((entry) => entry.saved.id === workspace.activeSavedTabId) ?? result.created[0];
    if (active) await chrome.tabs.update(active.tabId, { active: true });
    await Promise.allSettled(result.created.map((entry) => restorePageState(entry.tabId, entry.saved.url, entry.saved.pageState)));

    await updateData((current) => ({
      ...current,
      workspaces: current.workspaces.map((item) => item.id === workspaceId
        ? { ...item, status: 'saved', lastOpenedAt: nowIso(), updatedAt: nowIso() }
        : item),
    }));

    return {
      ok: true,
      workspaceId,
      message: `“${workspace.name}” restored`,
      ...(result.skipped > 0 ? { warning: `${result.skipped} ${result.skipped === 1 ? 'URL was' : 'URLs were'} skipped because Chrome could not open them.` } : {}),
    };
  } catch (error) {
    console.error('Browser Home could not restore the workspace.', error);
    return { ok: false, message: error instanceof Error ? error.message : 'The workspace could not be restored.' };
  } finally {
    restoring.delete(workspaceId);
  }
}
