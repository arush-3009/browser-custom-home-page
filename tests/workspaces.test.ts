import { deduplicateTabs, mergeWorkspace, removeSavedTab, reorderSavedTabs } from '../features/workspaces/operations';
import { savedTab, workspace } from './fixtures';

describe('workspace tab logic', () => {
  it('deduplicates exact canonical URLs while preserving first-seen order', () => {
    const result = deduplicateTabs([
      savedTab('a', 'https://example.com', 0),
      savedTab('b', 'https://example.com/', 1),
      savedTab('c', 'https://example.com/other', 2),
    ]);
    expect(result.duplicateCount).toBe(1);
    expect(result.tabs.map((tab) => tab.id)).toEqual(['a', 'c']);
    expect(result.tabs.map((tab) => tab.order)).toEqual([0, 1]);
  });

  it('adds only new URLs to an existing workspace', () => {
    const existing = workspace({ tabs: [savedTab('a', 'https://one.test/', 0)] });
    const incoming = workspace({ id: 'incoming', tabs: [savedTab('b', 'https://one.test', 0), savedTab('c', 'https://two.test', 1)], activeSavedTabId: 'c' });
    const merged = mergeWorkspace(existing, incoming);
    expect(merged.addedCount).toBe(1);
    expect(merged.duplicateCount).toBe(1);
    expect(merged.workspace.tabs.map((tab) => tab.id)).toEqual(['a', 'c']);
    expect(merged.workspace.activeSavedTabId).toBe('c');
  });

  it('removes unused group metadata with the last group tab', () => {
    const tab = { ...savedTab('a', 'https://one.test', 0), groupId: 'group' };
    const result = removeSavedTab(workspace({ tabs: [tab], groups: [{ id: 'group', title: 'Group', color: 'blue', collapsed: false, order: 0 }], activeSavedTabId: 'a' }), 'a');
    expect(result.tabs).toEqual([]);
    expect(result.groups).toEqual([]);
    expect(result.activeSavedTabId).toBeUndefined();
  });

  it('reorders tabs and normalizes saved order', () => {
    const result = reorderSavedTabs(workspace({ tabs: [savedTab('a', 'https://a.test', 0), savedTab('b', 'https://b.test', 1), savedTab('c', 'https://c.test', 2)] }), 2, 0);
    expect(result.tabs.map((tab) => tab.id)).toEqual(['c', 'a', 'b']);
    expect(result.tabs.map((tab) => tab.order)).toEqual([0, 1, 2]);
  });
});
