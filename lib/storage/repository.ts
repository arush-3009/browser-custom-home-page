import type { BrowserHomeData } from '../../types/domain';
import { createDefaultData } from './defaults';
import { migrateData } from './migrations';
import { browserHomeDataSchema } from './schema';
import { createDemoData } from './demo-data';

export const STORAGE_KEY = 'browserHome:data';

let browserFallbackData = createDefaultData();

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

export async function readData(): Promise<BrowserHomeData> {
  if (!hasChromeStorage()) {
    if (import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')) {
      return createDemoData();
    }
    return structuredClone(browserFallbackData);
  }
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const raw = stored[STORAGE_KEY];
  if (raw === undefined) return createDefaultData();
  try {
    const migrated = migrateData(raw);
    const storedVersion = typeof raw === 'object' && raw !== null && 'schemaVersion' in raw
      ? (raw as { schemaVersion?: unknown }).schemaVersion
      : undefined;
    if (storedVersion !== migrated.schemaVersion) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEY]: migrated });
      } catch (error) {
        console.warn('Browser Home loaded migrated data but could not persist the upgrade yet.', error);
      }
    }
    return migrated;
  } catch (error) {
    console.error('Browser Home ignored invalid stored data.', error);
    return createDefaultData();
  }
}

export async function writeData(data: BrowserHomeData): Promise<void> {
  const checked = browserHomeDataSchema.safeParse(data);
  if (!checked.success) throw new Error('Browser Home refused to save invalid data.');

  if (!hasChromeStorage()) {
    browserFallbackData = structuredClone(checked.data) as BrowserHomeData;
    globalThis.dispatchEvent(new CustomEvent('browser-home-storage'));
    return;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: checked.data });
  const verification = await chrome.storage.local.get(STORAGE_KEY);
  if (!browserHomeDataSchema.safeParse(verification[STORAGE_KEY]).success) {
    throw new Error('Chrome did not confirm the saved Browser Home data.');
  }
}

export async function updateData(mutator: (current: BrowserHomeData) => BrowserHomeData): Promise<BrowserHomeData> {
  const current = await readData();
  const next = mutator(structuredClone(current));
  await writeData(next);
  return next;
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
