"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { CRAWL_STAGGER_MS } from "../lib/rateLimits";

interface MarketSource {
  _id: string;
  marketId: string;
  url: string;
  name?: string;
  isActive: boolean;
  crawlFrequency: string;
  lastCrawledAt?: number;
}

/**
 * Crawls ALL due sources for a single market.
 * Creates one discovery job per source and schedules crawl orchestrators
 * with a 5-second stagger to avoid overwhelming targets.
 */
export const run = internalAction({
  args: {
    marketId: v.id("markets"),
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
    forceAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ jobCount: number }> => {
    const market = await ctx.runQuery(internal.queries.getMarket, {
      id: args.marketId,
    });
    if (!market) throw new Error("Market not found");

    const sources = (await ctx.runQuery(
      internal.queries.getActiveMarketSources,
      { marketId: args.marketId }
    )) as MarketSource[];

    if (sources.length === 0) return { jobCount: 0 };

    // Default date range: today + 90 days
    const today = new Date();
    const dateRangeStart =
      args.dateRangeStart ?? today.toISOString().split("T")[0];
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 90);
    const dateRangeEnd =
      args.dateRangeEnd ?? futureDate.toISOString().split("T")[0];

    // Filter to sources that are due for crawling
    const now = Date.now();
    const dueSources = args.forceAll
      ? sources
      : sources.filter((source) => isSourceDue(source, now));

    let jobCount = 0;

    for (let i = 0; i < dueSources.length; i++) {
      const source = dueSources[i];

      // Create a job record for this crawl
      const jobId = await ctx.runMutation(
        internal.eventDiscoveryJobs.createCrawlJob,
        {
          marketId: args.marketId,
          sourceId: source._id as any,
          dateRangeStart,
          dateRangeEnd,
        }
      );

      // Schedule crawl with stagger to stay within Convex action limits
      await ctx.scheduler.runAfter(
        i * CRAWL_STAGGER_MS,
        internal.actions.runCrawlDiscovery.run,
        {
          jobId,
          sourceId: source._id as any,
          marketId: args.marketId,
          dateRangeStart,
          dateRangeEnd,
        }
      );

      jobCount++;
    }

    return { jobCount };
  },
});

function isSourceDue(source: MarketSource, now: number): boolean {
  if (!source.lastCrawledAt) return true; // Never crawled

  const elapsed = now - source.lastCrawledAt;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  switch (source.crawlFrequency) {
    case "daily":
      return elapsed >= ONE_DAY;
    case "twice_weekly":
      return elapsed >= 3.5 * ONE_DAY;
    case "weekly":
      return elapsed >= 7 * ONE_DAY;
    default:
      return elapsed >= 7 * ONE_DAY;
  }
}
