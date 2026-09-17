import type { BrowserHomeData } from '../../types/domain';
import { createDefaultData } from './defaults';
import { migrateData } from './migrations';
import { browserHomeDataSchema } from './schema';
import { createDemoData } from './demo-data';

export const STORAGE_KEY = 'browserHome:data';
export const BACKUP_KEY = 'browserHome:previousCollections';
const WRITE_LOCK = 'browserHome:storage-write';
let browserFallbackData = createDefaultData();
let fallbackQueue: Promise<unknown> = Promise.resolve();

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

// A module-local queue cannot coordinate a popup, multiple New Tabs and a worker.
// Web Locks share this lock across all contexts of the extension's origin.
function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  if (hasChromeStorage()) {
    if (!globalThis.navigator?.locks) {
      return Promise.reject(new Error('Safe saving is unavailable. Reload Browser Home before making changes.'));
    }
    return navigator.locks.request(WRITE_LOCK, operation);
  }
  const result = fallbackQueue.then(operation);
  fallbackQueue = result.catch(() => undefined);
  return result;
}

export async function readData(): Promise<BrowserHomeData> {
  if (!hasChromeStorage()) {
    if (import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')) {
      return createDemoData();
    }
    return structuredClone(browserFallbackData);
  }
  const stored = await chrome.storage.local.get([STORAGE_KEY, BACKUP_KEY]);
  const raw: unknown = stored[STORAGE_KEY];
  if (raw === undefined) {
    if (stored[BACKUP_KEY] !== undefined) {
      throw new Error('The main data record is missing, but a recovery backup exists. Saving is paused to protect it.');
    }
    return createDefaultData();
  }
  try {
    // Reads must never write a migrated or default record over a concurrent edit.
    return migrateData(raw);
  } catch (error) {
    console.error('Browser Home could not validate stored data. The original data was preserved.', error);
    throw new Error('Your saved data could not be read safely. Nothing has been reset or overwritten.', { cause: error });
  }
}

function fingerprint(value: unknown): string {
  // Chrome may return object properties in a different order.
  return JSON.stringify(value, (_key: string, item: unknown): unknown => {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]]));
    }
    return item;
  });
}

async function saveUnlocked(data: BrowserHomeData, previous: BrowserHomeData): Promise<BrowserHomeData> {
  const checked = browserHomeDataSchema.safeParse(data);
  if (!checked.success) throw new Error('Browser Home refused to save invalid data.');
  const next = checked.data as BrowserHomeData;
  if (!hasChromeStorage()) {
    browserFallbackData = structuredClone(next);
    globalThis.dispatchEvent(new CustomEvent('browser-home-storage'));
    return next;
  }

  // Keep a separate recovery copy before replacing the primary record. Images
  // are excluded so a large photo cannot double the storage needed for a save.
  const backup = {
    schemaVersion: previous.schemaVersion,
    categories: previous.categories,
    shortcuts: previous.shortcuts,
    workspaces: previous.workspaces,
    savedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [BACKUP_KEY]: backup });
  const preserved = await chrome.storage.local.get(BACKUP_KEY);
  if (fingerprint(preserved[BACKUP_KEY]) !== fingerprint(backup)) {
    throw new Error('Chrome could not confirm the recovery backup. Your data was not replaced.');
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  const verification = await chrome.storage.local.get(STORAGE_KEY);
  if (fingerprint(verification[STORAGE_KEY]) !== fingerprint(next)) {
    throw new Error('Chrome did not confirm the exact data saved. No tabs will be closed.');
  }
  return next;
}

export async function writeData(data: BrowserHomeData): Promise<void> {
  await withWriteLock(async () => {
    const previous = await readData();
    await saveUnlocked(data, previous);
  });
}

export async function updateData(mutator: (current: BrowserHomeData) => BrowserHomeData): Promise<BrowserHomeData> {
  return withWriteLock(async () => {
    const current = await readData();
    return saveUnlocked(mutator(structuredClone(current)), current);
  });
}

export async function initializeData(): Promise<void> {
  await withWriteLock(async () => {
    if (!hasChromeStorage()) return;
    const stored = await chrome.storage.local.get([STORAGE_KEY, BACKUP_KEY]);
    if (stored[STORAGE_KEY] !== undefined || stored[BACKUP_KEY] !== undefined) return;
    await chrome.storage.local.set({ [STORAGE_KEY]: createDefaultData() });
  });
}

export function subscribeToData(listener: () => void): () => void {
  if (!hasChromeStorage()) {
    globalThis.addEventListener('browser-home-storage', listener);
    return () => globalThis.removeEventListener('browser-home-storage', listener);
  }
  const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[STORAGE_KEY]) listener();
  };
  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
}
