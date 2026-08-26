import type { SavedTab, SavedTabGroup, Workspace } from '../../types/domain';
import { nowIso } from '../../lib/utils/id';
import { urlKey } from '../../lib/utils/url';

export interface WorkspaceMergeResult {
  workspace: Workspace;
  addedCount: number;
  duplicateCount: number;
}

export function deduplicateTabs(tabs: SavedTab[]): { tabs: SavedTab[]; duplicateCount: number } {
  const seen = new Set<string>();
  let duplicateCount = 0;
  const unique = tabs.filter((tab) => {
    const key = urlKey(tab.url);
    if (seen.has(key)) {
      duplicateCount += 1;
      return false;
    }
    seen.add(key);
    return true;
  }).map((tab, order) => ({ ...tab, order }));
  return { tabs: unique, duplicateCount };
}

export function mergeWorkspace(existing: Workspace, incoming: Workspace): WorkspaceMergeResult {
  const existingUrls = new Set(existing.tabs.map((tab) => urlKey(tab.url)));
  const uniqueIncoming = incoming.tabs.filter((tab) => !existingUrls.has(urlKey(tab.url)));
  const duplicateCount = incoming.tabs.length - uniqueIncoming.length;
  const incomingGroupIds = new Set(uniqueIncoming.flatMap((tab) => tab.groupId ? [tab.groupId] : []));
  const groups = [
    ...existing.groups,
    ...incoming.groups.filter((group) => incomingGroupIds.has(group.id)),
  ].map((group, order) => ({ ...group, order }));
  const tabs = [
    ...existing.tabs,
    ...uniqueIncoming,
  ].map((tab, order) => ({ ...tab, order }));
  const nextActiveId = incoming.activeSavedTabId && uniqueIncoming.some((tab) => tab.id === incoming.activeSavedTabId)
    ? incoming.activeSavedTabId
    : existing.activeSavedTabId;

  return {
    workspace: {
      ...existing,
      updatedAt: nowIso(),
      tabs,
      groups,
      ...(nextActiveId ? { activeSavedTabId: nextActiveId } : {}),
    },
    addedCount: uniqueIncoming.length,
    duplicateCount,
  };
}

export function removeSavedTab(workspace: Workspace, tabId: string): Workspace {
  const tabs = workspace.tabs.filter((tab) => tab.id !== tabId).map((tab, order) => ({ ...tab, order }));
  const usedGroupIds = new Set(tabs.flatMap((tab) => tab.groupId ? [tab.groupId] : []));
  const { activeSavedTabId: previousActiveId, ...workspaceWithoutActive } = workspace;
  const nextActiveId = previousActiveId === tabId ? tabs[0]?.id : previousActiveId;
  return {
    ...workspaceWithoutActive,
    tabs,
    groups: workspace.groups.filter((group) => usedGroupIds.has(group.id)).map((group, order) => ({ ...group, order })),
    updatedAt: nowIso(),
    ...(nextActiveId ? { activeSavedTabId: nextActiveId } : {}),
  };
}

export function reorderSavedTabs(workspace: Workspace, fromIndex: number, toIndex: number): Workspace {
  const tabs = [...workspace.tabs].sort((a, b) => a.order - b.order);
  const [moving] = tabs.splice(fromIndex, 1);
  if (!moving) return workspace;
  tabs.splice(Math.max(0, Math.min(toIndex, tabs.length)), 0, moving);
  return { ...workspace, tabs: tabs.map((tab, order) => ({ ...tab, order })), updatedAt: nowIso() };
}

export function usedGroups(tabs: SavedTab[], groups: SavedTabGroup[]): SavedTabGroup[] {
  const used = new Set(tabs.flatMap((tab) => tab.groupId ? [tab.groupId] : []));
  return groups.filter((group) => used.has(group.id));
}
