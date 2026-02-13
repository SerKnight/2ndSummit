/**
 * Centralized rate-limit / concurrency config for Convex free-tier.
 * Convex free tier allows 16 concurrent actions.
 * Adjust these values when upgrading to Pro.
 */

/** Max discovery jobs to run concurrently (batch "Discover All" button). */
export const MAX_CONCURRENT_DISCOVERY_JOBS = 3;

/** Delay in ms between scheduling each discovery job in a batch. */
export const DISCOVERY_BATCH_STAGGER_MS = 10_000; // 10s between jobs

/** Delay in ms between scheduling each crawl source. */
export const CRAWL_STAGGER_MS = 8_000; // 8s between crawls (was 5s)

/** Delay in ms between individual validation calls within a single job. */
export const VALIDATION_DELAY_MS = 300;
