import type { BrowserHomeData, SavedTab, Workspace, WorkspaceColor } from '../../types/domain';
import { createDefaultData } from './defaults';

const createdAt = '2026-08-01T14:00:00.000Z';
const updatedAt = '2026-08-24T21:30:00.000Z';

function tab(id: string, url: string, title: string, order: number, groupId?: string): SavedTab {
  return { id, url, title, order, pinned: false, ...(groupId ? { groupId } : {}) };
}

function workspace(id: string, name: string, color: WorkspaceColor, tabs: SavedTab[]): Workspace {
  return {
    id,
    name,
    color,
    status: 'saved',
    createdAt,
    updatedAt,
    tabs,
    groups: [],
    ...(tabs[0] ? { activeSavedTabId: tabs[0].id } : {}),
  };
}

/** Development-only fixture. Production users always start with intentional empty states. */
export function createDemoData(): BrowserHomeData {
  const base = createDefaultData();
  return {
    ...base,
    categories: [
      { id: 'demo_cat_focus', name: 'Every day', order: 0, collapsed: false, createdAt, updatedAt },
      { id: 'demo_cat_learning', name: 'Learning', order: 1, collapsed: false, createdAt, updatedAt },
    ],
    shortcuts: [
      ['mail', 'Gmail', 'https://mail.google.com/', 'demo_cat_focus'],
      ['calendar', 'Calendar', 'https://calendar.google.com/', 'demo_cat_focus'],
      ['github', 'GitHub', 'https://github.com/', 'demo_cat_focus'],
      ['notion', 'Notion', 'https://notion.so/', 'demo_cat_focus'],
      ['figma', 'Figma', 'https://figma.com/', 'demo_cat_focus'],
      ['readwise', 'Readwise', 'https://readwise.io/', 'demo_cat_focus'],
      ['course', 'Course portal', 'https://example.edu/', 'demo_cat_learning'],
      ['docs', 'Reference docs', 'https://developer.mozilla.org/', 'demo_cat_learning'],
      ['video', 'Video lessons', 'https://youtube.com/', 'demo_cat_learning'],
      ['notes', 'Study notes', 'https://notion.so/', 'demo_cat_learning'],
    ].map(([id, name, url, categoryId], index) => ({
      id: `demo_place_${id}`,
      name: name!,
      url: url!,
      categoryId: categoryId!,
      order: index % 6,
      createdAt,
      updatedAt,
    })),
    workspaces: [
      workspace('demo_workspace_film', 'Learning filmmaking', 'violet', [
        tab('demo_tab_1', 'https://www.studiobinder.com/blog/camera-shots/', 'Camera shots and framing', 0),
        tab('demo_tab_2', 'https://www.studiobinder.com/blog/blocking-and-staging/', 'Blocking a scene', 1),
        tab('demo_tab_3', 'https://www.youtube.com/watch?v=example', 'Cinematography fundamentals', 2),
        tab('demo_tab_4', 'https://nofilmschool.com/', 'Lighting notes and references', 3),
        tab('demo_tab_5', 'https://www.studiobinder.com/', 'StudioBinder', 4),
      ]),
      workspace('demo_workspace_extension', 'Browser extension', 'cyan', [
        tab('demo_tab_6', 'https://developer.chrome.com/docs/extensions/', 'Chrome Extensions documentation', 0),
        tab('demo_tab_7', 'https://wxt.dev/', 'WXT documentation', 1),
        tab('demo_tab_8', 'https://github.com/', 'Repository', 2),
      ]),
      workspace('demo_workspace_trip', 'Montréal weekend', 'amber', [
        tab('demo_tab_9', 'https://maps.google.com/', 'Places to visit', 0),
        tab('demo_tab_10', 'https://www.thetrainline.com/', 'Train options', 1),
        tab('demo_tab_11', 'https://www.airbnb.com/', 'Places to stay', 2),
        tab('demo_tab_12', 'https://www.google.com/search?q=montreal+restaurants', 'Restaurant ideas', 3),
      ]),
    ],
  };
}
