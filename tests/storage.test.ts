// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validData } from './fixtures';
import { createDefaultData } from '../lib/storage/defaults';
import { validateImport } from '../lib/storage/migrations';
import { BACKUP_KEY, STORAGE_KEY, initializeData, readData, updateData, writeData } from '../lib/storage/repository';
import { captureWorkspace } from '../features/workspaces/chrome-service';

let records: Record<string, unknown>;
let queue: Promise<unknown>;
const get = vi.fn((keys: string | string[]) => Promise.resolve(Object.fromEntries(
  (Array.isArray(keys) ? keys : [keys]).map((key) => [key, structuredClone(records[key])]),
)));
const set = vi.fn(async (values: Record<string, unknown>) => { await Promise.resolve(); Object.assign(records, structuredClone(values)); });
const remove = vi.fn();

beforeEach(() => {
  records = { [STORAGE_KEY]: validData() };
  queue = Promise.resolve();
  vi.clearAllMocks();
  set.mockImplementation(async (values) => { await Promise.resolve(); Object.assign(records, structuredClone(values)); });
  vi.stubGlobal('navigator', { locks: { request: (_name: string, operation: () => Promise<unknown>) => {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  } } });
  vi.stubGlobal('chrome', {
    storage: { local: { get, set } },
    tabs: { get: (id: number) => Promise.resolve({ id, index: 0, url: 'https://research.test/', title: 'Research', active: true, pinned: false, groupId: -1 }), remove },
    scripting: { executeScript: () => Promise.resolve([{ result: { scrollX: 0, scrollY: 12, media: [] } }]) },
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('preserves sections, shortcuts and background when saving the first workspace', async () => {
  const original = validData();
  original.workspaces = [];
  original.settings.background = { selected: 'night-coast' };
  records[STORAGE_KEY] = original;
  const result = await captureWorkspace([42], { kind: 'new', name: 'Research' }, true);
  expect(result.ok).toBe(true);
  const saved = await readData();
  expect(saved.categories).toEqual(original.categories);
  expect(saved.shortcuts).toEqual(original.shortcuts);
  expect(saved.settings).toEqual(original.settings);
  expect(saved.workspaces).toHaveLength(1);
  expect(remove).toHaveBeenCalledWith(42);
});

it('never replaces invalid stored data with defaults or closes tabs', async () => {
  const damaged = validData(); damaged.shortcuts[0]!.categoryId = 'missing';
  records[STORAGE_KEY] = damaged;
  const result = await captureWorkspace([42], { kind: 'new', name: 'Research' }, true);
  expect(result.ok).toBe(false);
  expect(result.message).toMatch(/Nothing has been reset/);
  expect(records[STORAGE_KEY]).toEqual(damaged);
  expect(set).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
});

it('serializes mutations from separately loaded contexts', async () => {
  vi.resetModules();
  const otherContext = await import('../lib/storage/repository');
  await Promise.all([
    updateData((data) => ({ ...data, categories: data.categories.map((item) => ({ ...item, name: 'Renamed' })) })),
    otherContext.updateData((data) => ({ ...data, settings: { ...data.settings, background: { selected: 'night-coast' } } })),
  ]);
  const saved = await readData();
  expect(saved.categories[0]!.name).toBe('Renamed');
  expect(saved.settings.background.selected).toBe('night-coast');
});

it('does not persist a migration during a read', async () => {
  records[STORAGE_KEY] = { ...validData(), schemaVersion: 1, settings: { background: 'midnight', searchEngine: 'google' } };
  expect((await readData()).schemaVersion).toBe(2);
  expect(set).not.toHaveBeenCalled();
});

it('retains previous collections separately before a successful replacement', async () => {
  const original = validData();
  await writeData(createDefaultData());
  expect(records[BACKUP_KEY]).toMatchObject({ categories: original.categories, shortcuts: original.shortcuts, workspaces: original.workspaces });
  expect(set.mock.calls[0]![0]).toHaveProperty(BACKUP_KEY);
  expect(set.mock.calls[1]![0]).toHaveProperty(STORAGE_KEY);
});

it('aborts before replacing data if the backup cannot be saved', async () => {
  const original = structuredClone(records[STORAGE_KEY]);
  set.mockRejectedValueOnce(new Error('Storage full'));
  const result = await captureWorkspace([42], { kind: 'new', name: 'Research' }, true);
  expect(result.ok).toBe(false);
  expect(records[STORAGE_KEY]).toEqual(original);
  expect(remove).not.toHaveBeenCalled();
});

it('rejects a different but valid verification record and does not close tabs', async () => {
  set.mockImplementation(async (values) => {
    await Promise.resolve();
    Object.assign(records, structuredClone(values));
    if (STORAGE_KEY in values) records[STORAGE_KEY] = validData();
  });
  const result = await captureWorkspace([42], { kind: 'new', name: 'Research' }, true);
  expect(result.ok).toBe(false);
  expect(result.message).toMatch(/exact data/);
  expect(remove).not.toHaveBeenCalled();
});

it('fails closed when cross-context locks are unavailable', async () => {
  vi.stubGlobal('navigator', {});
  await expect(updateData((data) => data)).rejects.toThrow(/Safe saving/);
  expect(set).not.toHaveBeenCalled();
});

it('does not reset existing data on extension initialization', async () => {
  await initializeData();
  expect(set).not.toHaveBeenCalled();
});

it('protects a backup if the primary record is missing', async () => {
  records = { [BACKUP_KEY]: { categories: validData().categories } };
  await initializeData();
  await expect(updateData((data) => data)).rejects.toThrow(/recovery backup/);
  expect(set).not.toHaveBeenCalled();
});

it('creates defaults only for genuinely empty storage', async () => {
  records = {};
  await initializeData();
  expect(records[STORAGE_KEY]).toEqual(createDefaultData());
});

describe('malformed imports', () => {
  it('rejects unrelated JSON instead of converting it into an empty home', () => {
    expect(() => validateImport({})).toThrow(/supported/);
    expect(() => validateImport({ schemaVersion: 0, shortcuts: 'broken' })).toThrow(/supported/);
  });
});
