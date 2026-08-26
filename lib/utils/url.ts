export function ensureWebUrl(input: string): string {
  const value = input.trim();
  if (!value) throw new Error('Enter a website address.');

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  const parsed = new URL(candidate);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Use an http:// or https:// address.');
  }
  return parsed.toString();
}

export function isInspectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function isRestorableUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return ['http:', 'https:', 'file:', 'ftp:', 'chrome:', 'chrome-extension:', 'about:'].includes(protocol);
  } catch {
    return false;
  }
}

export function urlKey(url: string): string {
  try {
    return new URL(url).toString();
  } catch {
    return url.trim();
  }
}

export function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function hostnameInitial(url: string, name?: string): string {
  const source = name?.trim() || displayDomain(url);
  return source.charAt(0).toUpperCase() || '•';
}
