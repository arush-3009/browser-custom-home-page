export function relativeTime(iso: string): string {
  const time = new Date(iso).getTime();
  const difference = time - Date.now();
  const absolute = Math.abs(difference);
  if (!Number.isFinite(time)) return 'Recently updated';
  if (absolute < 60_000) return 'Updated just now';
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (absolute < 3_600_000) return `Updated ${formatter.format(Math.round(difference / 60_000), 'minute')}`;
  if (absolute < 86_400_000) return `Updated ${formatter.format(Math.round(difference / 3_600_000), 'hour')}`;
  if (absolute < 604_800_000) return `Updated ${formatter.format(Math.round(difference / 86_400_000), 'day')}`;
  return `Updated ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(time))}`;
}
