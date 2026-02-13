import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal queries used by actions (actions can't read DB directly)

export const getMarket = internalQuery({
  args: { id: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getEventCategory = internalQuery({
  args: { id: v.id("eventCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getActiveCategories = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("eventCategories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const getDiscoveryJob = internalQuery({
  args: { id: v.id("eventDiscoveryJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getMarketSource = internalQuery({
  args: { id: v.id("marketSources") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getActiveMarketSources = internalQuery({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("marketSources")
      .withIndex("by_market_active", (q) =>
        q.eq("marketId", args.marketId).eq("isActive", true)
      )
      .collect();
  },
});

export const getActiveMarkets = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("markets")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});
