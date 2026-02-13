import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  MAX_CONCURRENT_DISCOVERY_JOBS,
  DISCOVERY_BATCH_STAGGER_MS,
} from "./lib/rateLimits";

export const list = query({
  args: { marketId: v.optional(v.id("markets")) },
  handler: async (ctx, args) => {
    let jobs;
    if (args.marketId) {
      jobs = await ctx.db
        .query("eventDiscoveryJobs")
        .withIndex("by_market", (q) => q.eq("marketId", args.marketId!))
        .order("desc")
        .collect();
    } else {
      jobs = await ctx.db
        .query("eventDiscoveryJobs")
        .order("desc")
        .collect();
    }

    return Promise.all(
      jobs.map(async (job) => {
        const market = await ctx.db.get(job.marketId);
        const category = job.categoryId
          ? await ctx.db.get(job.categoryId)
          : null;
        const source = job.sourceId
          ? await ctx.db.get(job.sourceId)
          : null;
        return {
          ...job,
          marketName: market?.name ?? "Unknown",
          categoryName: category?.name ?? "All Categories",
          sourceName: source?.name ?? source?.url,
          sourceUrl: source?.url,
        };
      })
    );
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    marketId: v.optional(v.id("markets")),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("eventDiscoveryJobs")
      .withIndex("by_startedAt", (q) =>
        args.since ? q.gte("startedAt", args.since) : q
      )
      .order("desc");

    if (args.marketId) {
      q = q.filter((f) => f.eq(f.field("marketId"), args.marketId!));
    }

    const results = await q.paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      results.page.map(async (job) => {
        const market = await ctx.db.get(job.marketId);
        const category = job.categoryId
          ? await ctx.db.get(job.categoryId)
          : null;
        const source = job.sourceId
          ? await ctx.db.get(job.sourceId)
          : null;
        return {
          ...job,
          marketName: market?.name ?? "Unknown",
          categoryName: category?.name ?? "All Categories",
          sourceName: source?.name ?? source?.url,
          sourceUrl: source?.url,
        };
      })
    );

    return { ...results, page: enrichedPage };
  },
});

export const get = query({
  args: { id: v.id("eventDiscoveryJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job) return null;
    const market = await ctx.db.get(job.marketId);
    const category = job.categoryId
      ? await ctx.db.get(job.categoryId)
      : null;
    const source = job.sourceId
      ? await ctx.db.get(job.sourceId)
      : null;
    return {
      ...job,
      marketName: market?.name ?? "Unknown",
      categoryName: category?.name ?? "All Categories",
      sourceName: source?.name ?? source?.url,
      sourceUrl: source?.url,
    };
  },
});

export const create = mutation({
  args: {
    marketId: v.id("markets"),
    categoryId: v.id("eventCategories"),
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify market and category exist
    const market = await ctx.db.get(args.marketId);
    if (!market) throw new Error("Market not found");
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

    // Default date range: today + 90 days
    const today = new Date();
    const dateRangeStart =
      args.dateRangeStart ?? today.toISOString().split("T")[0];
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 90);
    const dateRangeEnd =
      args.dateRangeEnd ?? futureDate.toISOString().split("T")[0];

    const jobId = await ctx.db.insert("eventDiscoveryJobs", {
      marketId: args.marketId,
      categoryId: args.categoryId,
      status: "pending",
      dateRangeStart,
      dateRangeEnd,
      eventsFound: 0,
      triggeredBy: userId,
      startedAt: Date.now(),
    });

    // Schedule the orchestrator action
    await ctx.scheduler.runAfter(
      0,
      internal.actions.runEventDiscovery.run,
      {
        jobId,
        marketId: args.marketId,
        categoryId: args.categoryId,
        dateRangeStart,
        dateRangeEnd,
      }
    );

    return jobId;
  },
});

export const createBatch = mutation({
  args: {
    marketId: v.id("markets"),
    categoryIds: v.array(v.id("eventCategories")),
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const market = await ctx.db.get(args.marketId);
    if (!market) throw new Error("Market not found");

    const today = new Date();
    const dateRangeStart =
      args.dateRangeStart ?? today.toISOString().split("T")[0];
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 90);
    const dateRangeEnd =
      args.dateRangeEnd ?? futureDate.toISOString().split("T")[0];

    const jobIds: string[] = [];

    // Limit concurrency to stay within Convex free-tier action limits.
    // Jobs beyond MAX_CONCURRENT are staggered by DISCOVERY_BATCH_STAGGER_MS.
    const categoriesToRun = args.categoryIds.slice(
      0,
      args.categoryIds.length
    );

    for (let i = 0; i < categoriesToRun.length; i++) {
      const categoryId = categoriesToRun[i];
      const category = await ctx.db.get(categoryId);
      if (!category) continue;

      const jobId = await ctx.db.insert("eventDiscoveryJobs", {
        marketId: args.marketId,
        categoryId,
        status: "pending",
        dateRangeStart,
        dateRangeEnd,
        eventsFound: 0,
        triggeredBy: userId,
        startedAt: Date.now(),
      });

      // Stagger jobs: first MAX_CONCURRENT start immediately,
      // remaining are delayed to avoid hitting the 16 action limit.
      const delay =
        i < MAX_CONCURRENT_DISCOVERY_JOBS
          ? 0
          : (i - MAX_CONCURRENT_DISCOVERY_JOBS + 1) *
            DISCOVERY_BATCH_STAGGER_MS;

      await ctx.scheduler.runAfter(
        delay,
        internal.actions.runEventDiscovery.run,
        {
          jobId,
          marketId: args.marketId,
          categoryId,
          dateRangeStart,
          dateRangeEnd,
        }
      );

      jobIds.push(jobId);
    }

    return jobIds;
  },
});

// Internal mutations for status updates
export const updateStatus = internalMutation({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.errorMessage) patch.errorMessage = args.errorMessage;
    if (args.status === "completed" || args.status === "failed") {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(args.jobId, patch);
  },
});

export const updateCounts = internalMutation({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    eventsFound: v.optional(v.number()),
    eventsValidated: v.optional(v.number()),
    eventsStored: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...counts } = args;
    const patch = Object.fromEntries(
      Object.entries(counts).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(jobId, patch);
  },
});

export const updatePromptUsed = internalMutation({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    promptUsed: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { promptUsed: args.promptUsed });
  },
});

export const triggerMarketCrawl = mutation({
  args: {
    marketId: v.id("markets"),
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const market = await ctx.db.get(args.marketId);
    if (!market) throw new Error("Market not found");

    await ctx.scheduler.runAfter(
      0,
      internal.actions.runMarketCrawl.run,
      {
        marketId: args.marketId,
        dateRangeStart: args.dateRangeStart,
        dateRangeEnd: args.dateRangeEnd,
        forceAll: true,
      }
    );

    return { scheduled: true };
  },
});

export const triggerSingleCrawl = mutation({
  args: {
    sourceId: v.id("marketSources"),
    marketId: v.id("markets"),
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const source = await ctx.db.get(args.sourceId);
    if (!source) throw new Error("Source not found");

    const today = new Date();
    const dateRangeStart =
      args.dateRangeStart ?? today.toISOString().split("T")[0];
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 90);
    const dateRangeEnd =
      args.dateRangeEnd ?? futureDate.toISOString().split("T")[0];

    const jobId = await ctx.db.insert("eventDiscoveryJobs", {
      marketId: args.marketId,
      status: "pending",
      dateRangeStart,
      dateRangeEnd,
      eventsFound: 0,
      triggeredBy: userId,
      startedAt: Date.now(),
      discoveryMethod: "crawl",
      sourceId: args.sourceId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.runCrawlDiscovery.run,
      {
        jobId,
        sourceId: args.sourceId,
        marketId: args.marketId,
        dateRangeStart,
        dateRangeEnd,
      }
    );

    return jobId;
  },
});

export const createCrawlJob = internalMutation({
  args: {
    marketId: v.id("markets"),
    sourceId: v.id("marketSources"),
    dateRangeStart: v.string(),
    dateRangeEnd: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("eventDiscoveryJobs", {
      marketId: args.marketId,
      status: "pending",
      dateRangeStart: args.dateRangeStart,
      dateRangeEnd: args.dateRangeEnd,
      eventsFound: 0,
      startedAt: Date.now(),
      discoveryMethod: "crawl",
      sourceId: args.sourceId,
    });
  },
});

export const saveRawResponse = internalMutation({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    rawResponse: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { rawResponse: args.rawResponse });
  },
});
