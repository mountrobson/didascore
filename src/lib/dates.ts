export const ymd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function parseIsoDay(s?: string | null): Date {
  if (!s) return startOfDay(new Date());
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a: Date, b: Date) => isoDay(a) === isoDay(b);

/** ESPN keys its `dates=` parameter by US Eastern calendar day. */
const etFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
export const etYmd = (d: Date) => etFmt.format(d).replace(/-/g, '');

/** The ESPN (US Eastern) dates that together cover one local calendar day: one or two. */
export function espnDatesForLocalDay(day: Date): string[] {
  const start = startOfDay(day);
  const end = new Date(addDays(start, 1).getTime() - 1);
  const a = etYmd(start);
  const b = etYmd(end);
  return a === b ? [a] : [a, b];
}

export function fmtTime(iso: string, h24: boolean) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !h24 });
}

export function fmtDayLabel(d: Date, today = startOfDay(new Date())) {
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });

export const fmtLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
