import type { SavedPageState } from '../../types/domain';
import { isInspectableUrl } from '../utils/url';

export async function capturePageState(tab: chrome.tabs.Tab): Promise<SavedPageState | undefined> {
  if (tab.id === undefined || !isInspectableUrl(tab.url ?? tab.pendingUrl)) return undefined;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        media: Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio')).map((element, index) => {
          const source = element.currentSrc || element.src;
          return {
            kind: element.tagName.toLowerCase() as 'audio' | 'video',
            index,
            currentTime: Number.isFinite(element.currentTime) ? element.currentTime : 0,
            ...(source ? { source } : {}),
          };
        }),
      }),
    });
    return results[0]?.result;
  } catch (error) {
    console.debug('Browser Home could not capture page state.', tab.url, error);
    return undefined;
  }
}

function waitForTabComplete(tabId: number, timeoutMs = 20_000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timeout);
      resolve();
    };
    const listener = (updatedTabId: number, changeInfo: { status?: string }) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') finish();
    };
    const timeout = setTimeout(finish, timeoutMs);
    chrome.tabs.onUpdated.addListener(listener);
    void chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') finish();
    }).catch(finish);
  });
}

export async function restorePageState(tabId: number, url: string, state: SavedPageState | undefined): Promise<void> {
  if (!state || !isInspectableUrl(url)) return;
  await waitForTabComplete(tabId);
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [state],
      func: (savedState: SavedPageState) => {
        const restore = () => {
          if (typeof savedState.scrollX === 'number' || typeof savedState.scrollY === 'number') {
            window.scrollTo(savedState.scrollX ?? 0, savedState.scrollY ?? 0);
          }
          for (const mediaState of savedState.media ?? []) {
            const candidates = Array.from(document.querySelectorAll<HTMLMediaElement>(mediaState.kind));
            const media = candidates[mediaState.index];
            if (!media || !Number.isFinite(mediaState.currentTime)) continue;
            const seek = () => {
              try { media.currentTime = mediaState.currentTime; } catch { /* best effort */ }
            };
            if (media.readyState >= 1) seek();
            else media.addEventListener('loadedmetadata', seek, { once: true });
          }
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore, { once: true });
        else restore();
      },
    });
  } catch (error) {
    console.debug('Browser Home could not restore page state.', url, error);
  }
}
