import type { BrowserHomeData, SavedTab, Workspace } from '../types/domain';
import { createDefaultData } from '../lib/storage/defaults';

export const timestamp = '2026-08-25T12:00:00.000Z';

export function savedTab(id: string, url: string, order: number): SavedTab {
  return { id, url, title: id, order, pinned: false };
}

export function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'workspace_1',
    name: 'Research',
    color: 'violet',
    status: 'saved',
    createdAt: timestamp,
    updatedAt: timestamp,
    tabs: [],
    groups: [],
    ...overrides,
  };
}

export function validData(): BrowserHomeData {
  const data = createDefaultData();
  return {
    ...data,
    categories: [{ id: 'cat_1', name: 'Favorites', order: 0, collapsed: false, createdAt: timestamp, updatedAt: timestamp }],
    shortcuts: [{ id: 'place_1', name: 'Example', url: 'https://example.com/', categoryId: 'cat_1', order: 0, createdAt: timestamp, updatedAt: timestamp }],
    workspaces: [workspace({ tabs: [savedTab('tab_1', 'https://example.com/a', 0)], activeSavedTabId: 'tab_1' })],
  };
}
