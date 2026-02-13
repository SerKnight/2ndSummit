import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const markets = await ctx.db.query("markets").collect();
    // Attach event counts
    return Promise.all(
      markets.map(async (market) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_market", (q) => q.eq("marketId", market._id))
          .collect();
        return { ...market, eventCount: events.length };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    regionDescription: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    radiusMiles: v.number(),
    zipCodes: v.optional(v.array(v.string())),
    zipCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const id = await ctx.db.insert("markets", {
      ...args,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule source generation if zipCode is provided
    if (args.zipCode) {
      await ctx.scheduler.runAfter(
        0,
        internal.actions.generateMarketSources.run,
        { marketId: id }
      );
    }

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("markets"),
    name: v.optional(v.string()),
    regionDescription: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    radiusMiles: v.optional(v.number()),
    zipCodes: v.optional(v.array(v.string())),
    zipCode: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    searchSources: v.optional(v.array(v.string())),
    sourcePromptContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...cleanUpdates, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("markets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

export const regenerateSources = mutation({
  args: { id: v.id("markets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.scheduler.runAfter(
      0,
      internal.actions.generateMarketSources.run,
      { marketId: args.id }
    );

    return { scheduled: true };
  },
});

export const addSource = mutation({
  args: {
    id: v.id("markets"),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const market = await ctx.db.get(args.id);
    if (!market) throw new Error("Market not found");

    const sources = market.searchSources ?? [];
    const trimmed = args.source.trim();
    if (!trimmed) throw new Error("Source cannot be empty");
    if (sources.includes(trimmed)) throw new Error("Source already exists");

    await ctx.db.patch(args.id, {
      searchSources: [...sources, trimmed],
      updatedAt: Date.now(),
    });
  },
});

export const removeSource = mutation({
  args: {
    id: v.id("markets"),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const market = await ctx.db.get(args.id);
    if (!market) throw new Error("Market not found");

    const sources = market.searchSources ?? [];
    await ctx.db.patch(args.id, {
      searchSources: sources.filter((s) => s !== args.source),
      updatedAt: Date.now(),
    });
  },
});

// Internal mutation for actions to update sources
export const updateSources = internalMutation({
  args: {
    id: v.id("markets"),
    searchSources: v.array(v.string()),
    sourcePromptContext: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      searchSources: args.searchSources,
      sourcePromptContext: args.sourcePromptContext,
      updatedAt: Date.now(),
    });
  },
});
