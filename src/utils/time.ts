/**
 * Short relative-time labels ("now", "5m", "2h", "3d", "2w") for match/
 * message list rows. Falls back to a short date once it's been a while,
 * rather than letting the week count climb indefinitely.
 */
export function formatRelativeShort(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Clock-time label ("2:45 PM") for individual chat bubbles. */
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
