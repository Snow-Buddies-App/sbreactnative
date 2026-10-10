/** Local calendar date as YYYY-MM-DD (the format Postgres `date` columns use). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as a local date (new Date('2026-01-05') would be UTC). */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function upcomingDays(count: number, from: Date = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return day;
  });
}

export function formatTripDate(iso: string, today: Date = new Date()): string {
  const date = fromIsoDate(iso);
  const diff = Math.round(
    (date.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMessageTime(timestamp: string, now: Date = new Date()): string {
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
