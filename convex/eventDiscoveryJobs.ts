import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
        return {
          ...job,
          marketName: market?.name ?? "Unknown",
          categoryName: category?.name ?? "All Categories",
        };
      })
    );
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
    return {
      ...job,
      marketName: market?.name ?? "Unknown",
      categoryName: category?.name ?? "All Categories",
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

    for (const categoryId of args.categoryIds) {
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

      await ctx.scheduler.runAfter(
        0,
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

export const saveRawResponse = internalMutation({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    rawResponse: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { rawResponse: args.rawResponse });
  },
});
