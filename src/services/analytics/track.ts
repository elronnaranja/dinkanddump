/**
 * Minimal analytics stub. Phase 2 just logs to console; a later phase can
 * swap the implementation for a real analytics SDK (Segment, PostHog, etc.)
 * without changing call sites.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props?: AnalyticsProps): void {
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${event}`, props ?? {});
}
