/**
 * Human-readable ages for practice timestamps.
 *
 * Deliberately coarse: "3 days ago" is what a reader acts on, and the exact
 * fractional age is already carried separately for the health calculation.
 */
export function formatRelativeDay(iso: string, now: Date): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'Unknown date';

  const days = Math.floor((now.getTime() - then) / (24 * 60 * 60 * 1000));

  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  return formatDate(iso);
}

/** Absolute date for history rows, where the exact day matters more. */
export function formatDate(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'Unknown date';
  return new Date(then).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
