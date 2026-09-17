import type { BrowserHomeData } from '../../types/domain';
import { createId, nowIso } from '../utils/id';
import { createDefaultData } from './defaults';
import { browserHomeDataSchema } from './schema';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrateData(input: unknown): BrowserHomeData {
  const current = browserHomeDataSchema.safeParse(input);
  if (current.success) return current.data as BrowserHomeData;

  if (isRecord(input) && input.schemaVersion === 2) {
    throw new Error(`The saved Browser Home data is invalid: ${current.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }

  if (isRecord(input) && input.schemaVersion === 1) {
    const rawSettings = isRecord(input.settings) ? input.settings : {};
    const migrated = browserHomeDataSchema.safeParse({
      ...input,
      schemaVersion: 2,
      settings: {
        ...rawSettings,
        background: { selected: 'alpine-blue-hour' },
        searchEngine: 'google',
      },
    });
    if (!migrated.success) throw new Error('The previous Browser Home data could not be migrated safely.');
    return migrated.data as BrowserHomeData;
  }

  if (!isRecord(input) || (input.schemaVersion !== 0 && input.schemaVersion !== undefined)) {
    throw new Error('This file is not a supported Browser Home data export.');
  }

  if (!Array.isArray(input.categories) || !Array.isArray(input.shortcuts)) {
    throw new Error('This file is not a supported legacy Browser Home export.');
  }

  const timestamp = nowIso();
  const result = createDefaultData();
  const rawCategories = Array.isArray(input.categories) ? input.categories : [];
  const categoryIds = new Map<string, string>();

  result.categories = rawCategories.flatMap((item, order) => {
    if (!isRecord(item) || typeof item.name !== 'string' || !item.name.trim()) return [];
    const oldId = typeof item.id === 'string' ? item.id : createId('cat');
    const nextId = oldId || createId('cat');
    categoryIds.set(oldId, nextId);
    return [{
      id: nextId,
      name: item.name.trim(),
      order,
      collapsed: item.collapsed === true,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : timestamp,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : timestamp,
    }];
  });

  const rawShortcuts = Array.isArray(input.shortcuts) ? input.shortcuts : [];
  result.shortcuts = rawShortcuts.flatMap((item, order) => {
    if (!isRecord(item) || typeof item.name !== 'string' || typeof item.url !== 'string') return [];
    const mappedCategory = typeof item.categoryId === 'string' ? categoryIds.get(item.categoryId) : undefined;
    const firstCategory = result.categories[0]?.id;
    if (!mappedCategory && !firstCategory) return [];
    return [{
      id: typeof item.id === 'string' && item.id ? item.id : createId('place'),
      name: item.name.trim(),
      url: item.url,
      categoryId: mappedCategory ?? firstCategory!,
      order,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : timestamp,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : timestamp,
      ...(typeof item.faviconUrl === 'string' ? { faviconUrl: item.faviconUrl } : {}),
    }];
  });

  const validated = browserHomeDataSchema.safeParse(result);
  if (!validated.success) throw new Error('The older Browser Home data could not be migrated safely.');
  return validated.data as BrowserHomeData;
}

export function validateImport(input: unknown): BrowserHomeData {
  return migrateData(input);
}
