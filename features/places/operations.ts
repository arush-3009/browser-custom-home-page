import type { BrowserHomeData, Category, Shortcut } from '../../types/domain';
import { createId, nowIso } from '../../lib/utils/id';

function byOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function normalizeCategoryOrder(categories: Category[]): Category[] {
  return byOrder(categories).map((category, order) => ({ ...category, order }));
}

export function reorderCategories(
  data: BrowserHomeData,
  categoryId: string,
  destinationCategoryId: string,
): BrowserHomeData {
  const ordered = byOrder(data.categories);
  const sourceIndex = ordered.findIndex((category) => category.id === categoryId);
  const destinationIndex = ordered.findIndex((category) => category.id === destinationCategoryId);
  if (sourceIndex < 0 || destinationIndex < 0 || sourceIndex === destinationIndex) return data;

  const [moving] = ordered.splice(sourceIndex, 1);
  if (!moving) return data;
  ordered.splice(destinationIndex, 0, { ...moving, updatedAt: nowIso() });

  return { ...data, categories: ordered.map((category, order) => ({ ...category, order })) };
}

export function normalizeShortcutOrder(shortcuts: Shortcut[], categoryId: string): Shortcut[] {
  const orderedIds = new Map(
    byOrder(shortcuts.filter((shortcut) => shortcut.categoryId === categoryId)).map((shortcut, order) => [shortcut.id, order]),
  );
  return shortcuts.map((shortcut) => shortcut.categoryId === categoryId
    ? { ...shortcut, order: orderedIds.get(shortcut.id) ?? shortcut.order }
    : shortcut);
}

export function createCategory(data: BrowserHomeData, name: string): BrowserHomeData {
  const timestamp = nowIso();
  const category: Category = {
    id: createId('cat'),
    name: name.trim(),
    order: data.categories.length,
    collapsed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { ...data, categories: [...data.categories, category] };
}

export function upsertShortcut(
  data: BrowserHomeData,
  input: { id?: string; name: string; url: string; categoryId: string },
): BrowserHomeData {
  const timestamp = nowIso();
  const existing = input.id ? data.shortcuts.find((shortcut) => shortcut.id === input.id) : undefined;
  if (existing) {
    const oldCategory = existing.categoryId;
    const updated = data.shortcuts.map((shortcut) => shortcut.id === input.id ? {
      ...shortcut,
      name: input.name.trim(),
      url: input.url,
      categoryId: input.categoryId,
      order: oldCategory === input.categoryId
        ? shortcut.order
        : data.shortcuts.filter((item) => item.categoryId === input.categoryId).length,
      updatedAt: timestamp,
    } : shortcut);
    return {
      ...data,
      shortcuts: normalizeShortcutOrder(normalizeShortcutOrder(updated, oldCategory), input.categoryId),
    };
  }

  const shortcut: Shortcut = {
    id: createId('place'),
    name: input.name.trim(),
    url: input.url,
    categoryId: input.categoryId,
    order: data.shortcuts.filter((item) => item.categoryId === input.categoryId).length,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { ...data, shortcuts: [...data.shortcuts, shortcut] };
}

export function moveShortcut(
  data: BrowserHomeData,
  shortcutId: string,
  destinationCategoryId: string,
  destinationIndex: number,
): BrowserHomeData {
  const moving = data.shortcuts.find((shortcut) => shortcut.id === shortcutId);
  if (!moving) return data;

  const sourceCategoryId = moving.categoryId;
  const source = byOrder(data.shortcuts.filter((item) => item.categoryId === sourceCategoryId && item.id !== shortcutId));
  const destination = sourceCategoryId === destinationCategoryId
    ? source
    : byOrder(data.shortcuts.filter((item) => item.categoryId === destinationCategoryId));
  const safeIndex = Math.max(0, Math.min(destinationIndex, destination.length));
  destination.splice(safeIndex, 0, { ...moving, categoryId: destinationCategoryId, updatedAt: nowIso() });

  const unaffected = data.shortcuts.filter((item) =>
    item.categoryId !== sourceCategoryId && item.categoryId !== destinationCategoryId,
  );
  const normalizedDestination = destination.map((shortcut, order) => ({ ...shortcut, order }));
  if (sourceCategoryId === destinationCategoryId) {
    return { ...data, shortcuts: [...unaffected, ...normalizedDestination] };
  }
  const normalizedSource = source.map((shortcut, order) => ({ ...shortcut, order }));
  return { ...data, shortcuts: [...unaffected, ...normalizedSource, ...normalizedDestination] };
}

export function deleteCategory(
  data: BrowserHomeData,
  categoryId: string,
  strategy: { kind: 'delete-contents' } | { kind: 'move'; targetCategoryId: string },
): BrowserHomeData {
  const timestamp = nowIso();
  const remainingCategories = normalizeCategoryOrder(data.categories.filter((category) => category.id !== categoryId));
  if (strategy.kind === 'delete-contents') {
    return {
      ...data,
      categories: remainingCategories,
      shortcuts: data.shortcuts.filter((shortcut) => shortcut.categoryId !== categoryId),
    };
  }
  const targetCount = data.shortcuts.filter((shortcut) => shortcut.categoryId === strategy.targetCategoryId).length;
  let appended = 0;
  const moved = data.shortcuts.map((shortcut) => shortcut.categoryId === categoryId ? {
    ...shortcut,
    categoryId: strategy.targetCategoryId,
    order: targetCount + appended++,
    updatedAt: timestamp,
  } : shortcut);
  return {
    ...data,
    categories: remainingCategories,
    shortcuts: normalizeShortcutOrder(moved, strategy.targetCategoryId),
  };
}
