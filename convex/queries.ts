import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal queries used by actions (actions can't read DB directly)

export const getMarket = internalQuery({
  args: { id: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getActiveCategories = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getRawEvents = internalQuery({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_market_status", (q) =>
        q.eq("marketId", args.marketId).eq("status", "raw")
      )
      .collect();
  },
});

export const getUncategorizedEvents = internalQuery({
  args: { marketId: v.optional(v.id("markets")) },
  handler: async (ctx, args) => {
    let events;
    if (args.marketId) {
      events = await ctx.db
        .query("events")
        .withIndex("by_market", (q) => q.eq("marketId", args.marketId!))
        .collect();
    } else {
      events = await ctx.db.query("events").collect();
    }
    // Return events that have no category assigned and aren't rejected
    return events.filter((e) => !e.categoryId && e.status !== "rejected");
  },
});

export const getDiscoveryRun = internalQuery({
  args: { id: v.id("discoveryRuns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getCategoriesByIds = internalQuery({
  args: { ids: v.array(v.id("categories")) },
  handler: async (ctx, args) => {
    const results = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return results.filter(Boolean);
  },
});

export const getPromptTemplate = internalQuery({
  args: { id: v.id("promptTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
