export function faviconUrl(pageUrl: string, size = 64): string | undefined {
  if (!pageUrl) return undefined;
  try {
    const url = new URL(pageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      const base = chrome.runtime.getURL('/_favicon/');
      return `${base}?pageUrl=${encodeURIComponent(url.toString())}&size=${size}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
