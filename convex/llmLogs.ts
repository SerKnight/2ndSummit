import { internalMutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

export const list = query({
  args: {
    provider: v.optional(v.string()),
    action: v.optional(v.string()),
    discoveryJobId: v.optional(v.id("eventDiscoveryJobs")),
  },
  handler: async (ctx, args) => {
    let logs;

    if (args.discoveryJobId) {
      logs = await ctx.db
        .query("llmLogs")
        .withIndex("by_discoveryJob", (q) =>
          q.eq("discoveryJobId", args.discoveryJobId!)
        )
        .order("desc")
        .collect();
    } else if (args.provider) {
      logs = await ctx.db
        .query("llmLogs")
        .withIndex("by_provider", (q) => q.eq("provider", args.provider!))
        .order("desc")
        .collect();
    } else if (args.action) {
      logs = await ctx.db
        .query("llmLogs")
        .withIndex("by_action", (q) => q.eq("action", args.action!))
        .order("desc")
        .collect();
    } else {
      logs = await ctx.db
        .query("llmLogs")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    // Apply additional client-side filters for combinations
    if (args.provider && args.action) {
      logs = logs.filter((l) => l.action === args.action);
    }

    return logs;
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    provider: v.optional(v.string()),
    action: v.optional(v.string()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("llmLogs")
      .withIndex("by_createdAt", (q) =>
        args.since ? q.gte("createdAt", args.since) : q
      )
      .order("desc");

    if (args.provider) {
      q = q.filter((f) => f.eq(f.field("provider"), args.provider!));
    }
    if (args.action) {
      q = q.filter((f) => f.eq(f.field("action"), args.action!));
    }

    return await q.paginate(args.paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("llmLogs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = internalMutation({
  args: {
    provider: v.string(),
    model: v.string(),
    action: v.string(),
    prompt: v.string(),
    response: v.string(),
    durationMs: v.number(),
    tokensUsed: v.optional(v.number()),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    marketId: v.optional(v.id("markets")),
    discoveryJobId: v.optional(v.id("eventDiscoveryJobs")),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("llmLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
