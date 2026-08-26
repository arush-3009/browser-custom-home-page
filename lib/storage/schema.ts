import { z } from 'zod';
import { CURRENT_SCHEMA_VERSION } from '../../types/domain';

const isoDate = z.string().datetime();
const id = z.string().min(1);
const customBackgroundSchema = z.object({
  dataUrl: z.string().max(7_100_000).refine((value) => /^data:image\/(?:webp|png|jpeg);base64,/i.test(value), 'Custom background must be an embedded image.'),
  fileName: z.string().trim().min(1).max(180),
  width: z.number().int().positive().max(10_000),
  height: z.number().int().positive().max(10_000),
  size: z.number().int().positive().max(5 * 1024 * 1024),
  updatedAt: isoDate,
});

const pageStateSchema = z.object({
  scrollX: z.number().finite().optional(),
  scrollY: z.number().finite().optional(),
  media: z.array(z.object({
    kind: z.enum(['audio', 'video']),
    index: z.number().int().nonnegative(),
    currentTime: z.number().finite().nonnegative(),
    source: z.string().optional(),
  })).optional(),
});

export const savedTabSchema = z.object({
  id,
  url: z.string().min(1),
  title: z.string(),
  faviconUrl: z.string().optional(),
  order: z.number().int().nonnegative(),
  pinned: z.boolean(),
  groupId: id.optional(),
  pageState: pageStateSchema.optional(),
});

export const workspaceSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  icon: z.string().max(16).optional(),
  color: z.enum(['violet', 'blue', 'cyan', 'emerald', 'amber', 'rose']),
  status: z.enum(['saved', 'restoring', 'open']),
  createdAt: isoDate,
  updatedAt: isoDate,
  lastOpenedAt: isoDate.optional(),
  tabs: z.array(savedTabSchema),
  groups: z.array(z.object({
    id,
    title: z.string().optional(),
    color: z.enum(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']),
    collapsed: z.boolean(),
    order: z.number().int().nonnegative(),
  })),
  activeSavedTabId: id.optional(),
});

export const browserHomeDataSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  settings: z.object({
    background: z.object({
      selected: z.enum(['alpine-blue-hour', 'night-coast', 'misty-evergreens', 'midnight', 'custom']),
      customImage: customBackgroundSchema.optional(),
    }).superRefine((background, context) => {
      if (background.selected === 'custom' && !background.customImage) {
        context.addIssue({ code: 'custom', path: ['customImage'], message: 'A selected custom background must include image data.' });
      }
    }),
    searchEngine: z.literal('google'),
  }),
  categories: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(80),
    order: z.number().int().nonnegative(),
    collapsed: z.boolean(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })),
  shortcuts: z.array(z.object({
    id,
    name: z.string().trim().min(1).max(100),
    url: z.string().url(),
    faviconUrl: z.string().optional(),
    categoryId: id,
    order: z.number().int().nonnegative(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })),
  workspaces: z.array(workspaceSchema),
}).superRefine((data, context) => {
  const categoryIds = new Set(data.categories.map((category) => category.id));
  const allIds = [
    ...data.categories.map((category) => category.id),
    ...data.shortcuts.map((shortcut) => shortcut.id),
    ...data.workspaces.map((workspace) => workspace.id),
    ...data.workspaces.flatMap((workspace) => workspace.tabs.map((tab) => tab.id)),
    ...data.workspaces.flatMap((workspace) => workspace.groups.map((group) => group.id)),
  ];
  if (new Set(allIds).size !== allIds.length) {
    context.addIssue({ code: 'custom', message: 'IDs must be unique throughout Browser Home data.' });
  }
  data.shortcuts.forEach((shortcut, index) => {
    if (!categoryIds.has(shortcut.categoryId)) {
      context.addIssue({ code: 'custom', path: ['shortcuts', index, 'categoryId'], message: 'Shortcut refers to a missing section.' });
    }
  });
  data.workspaces.forEach((workspace, workspaceIndex) => {
    const groupIds = new Set(workspace.groups.map((group) => group.id));
    const tabIds = new Set(workspace.tabs.map((tab) => tab.id));
    workspace.tabs.forEach((tab, tabIndex) => {
      if (tab.groupId && !groupIds.has(tab.groupId)) {
        context.addIssue({ code: 'custom', path: ['workspaces', workspaceIndex, 'tabs', tabIndex, 'groupId'], message: 'Saved tab refers to a missing group.' });
      }
    });
    if (workspace.activeSavedTabId && !tabIds.has(workspace.activeSavedTabId)) {
      context.addIssue({ code: 'custom', path: ['workspaces', workspaceIndex, 'activeSavedTabId'], message: 'Active tab refers to a missing saved tab.' });
    }
  });
});

export type BrowserHomeDataInput = z.input<typeof browserHomeDataSchema>;
