import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    marketId: v.optional(v.id("markets")),
    status: v.optional(v.string()),
    pillar: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    let events;

    if (args.marketId && args.status) {
      events = await ctx.db
        .query("events")
        .withIndex("by_market_status", (q) =>
          q.eq("marketId", args.marketId!).eq("status", args.status!)
        )
        .collect();
    } else if (args.marketId) {
      events = await ctx.db
        .query("events")
        .withIndex("by_market", (q) => q.eq("marketId", args.marketId!))
        .collect();
    } else if (args.status) {
      events = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.pillar) {
      events = await ctx.db
        .query("events")
        .withIndex("by_pillar", (q) => q.eq("pillar", args.pillar!))
        .collect();
    } else if (args.categoryId) {
      events = await ctx.db
        .query("events")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .collect();
    } else {
      events = await ctx.db.query("events").collect();
    }

    // Apply additional client-side filters for combinations not covered by indexes
    if (args.pillar && args.marketId) {
      events = events.filter((e) => e.pillar === args.pillar);
    }
    if (args.categoryId && (args.marketId || args.status)) {
      events = events.filter((e) => e.categoryId === args.categoryId);
    }

    // Resolve market and category names
    return Promise.all(
      events.map(async (event) => {
        const market = await ctx.db.get(event.marketId);
        const category = event.categoryId
          ? await ctx.db.get(event.categoryId)
          : null;
        return {
          ...event,
          marketName: market?.name ?? "Unknown",
          categoryName: category?.name ?? "Uncategorized",
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) return null;

    const market = await ctx.db.get(event.marketId);
    const category = event.categoryId
      ? await ctx.db.get(event.categoryId)
      : null;

    return {
      ...event,
      marketName: market?.name ?? "Unknown",
      categoryName: category?.name ?? "Uncategorized",
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    marketId: v.id("markets"),
    categoryId: v.optional(v.id("categories")),
    pillar: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    price: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      source: "manual",
      sourceUrl: args.sourceUrl,
      marketId: args.marketId,
      categoryId: args.categoryId,
      pillar: args.pillar,
      status: "approved",
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      locationName: args.locationName,
      locationAddress: args.locationAddress,
      price: args.price,
      difficultyLevel: args.difficultyLevel,
      ageAppropriate: true,
      tags: args.tags ?? [],
      discoveredAt: now,
      lastUpdatedAt: now,
      approvedBy: userId,
      approvedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    pillar: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    price: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()),
    ageAppropriate: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...cleanUpdates, lastUpdatedAt: Date.now() });
  },
});

export const approve = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, {
      status: "approved",
      approvedBy: userId,
      approvedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });
  },
});

export const reject = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, {
      status: "rejected",
      lastUpdatedAt: Date.now(),
    });
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("events")),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    for (const id of args.ids) {
      const patch: Record<string, unknown> = {
        status: args.status,
        lastUpdatedAt: now,
      };
      if (args.status === "approved") {
        patch.approvedBy = userId;
        patch.approvedAt = now;
      }
      await ctx.db.patch(id, patch);
    }
  },
});

export const getCountsByStatus = query({
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

    const counts: Record<string, number> = {
      raw: 0,
      classified: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
      total: events.length,
    };

    for (const event of events) {
      if (counts[event.status] !== undefined) {
        counts[event.status]++;
      }
    }

    return counts;
  },
});

// Public query — approved events for the customer-facing calendar (no auth required)
export const listApproved = query({
  args: {
    pillar: v.optional(v.string()),
    marketId: v.optional(v.id("markets")),
  },
  handler: async (ctx, args) => {
    let events;

    if (args.marketId) {
      events = await ctx.db
        .query("events")
        .withIndex("by_market_status", (q) =>
          q.eq("marketId", args.marketId!).eq("status", "approved")
        )
        .collect();
    } else {
      events = await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect();
    }

    if (args.pillar) {
      events = events.filter((e) => e.pillar === args.pillar);
    }

    return Promise.all(
      events.map(async (event) => {
        const market = await ctx.db.get(event.marketId);
        const category = event.categoryId
          ? await ctx.db.get(event.categoryId)
          : null;
        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          pillar: event.pillar,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          locationName: event.locationName,
          locationAddress: event.locationAddress,
          price: event.price,
          difficultyLevel: event.difficultyLevel,
          tags: event.tags,
          sourceUrl: event.sourceUrl,
          marketName: market?.name ?? "Unknown",
          categoryName: category?.name ?? "Uncategorized",
        };
      })
    );
  },
});

// Public query — active markets for the calendar filter
export const listActiveMarkets = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("markets")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const listByRun = query({
  args: { discoveryRunId: v.id("discoveryRuns") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_discoveryRun", (q) =>
        q.eq("discoveryRunId", args.discoveryRunId)
      )
      .collect();

    return Promise.all(
      events.map(async (event) => {
        const market = await ctx.db.get(event.marketId);
        const category = event.categoryId
          ? await ctx.db.get(event.categoryId)
          : null;
        return {
          ...event,
          marketName: market?.name ?? "Unknown",
          categoryName: category?.name ?? "Uncategorized",
        };
      })
    );
  },
});

// Called by discovery action — internal only
export const createFromDiscovery = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    marketId: v.id("markets"),
    rawData: v.string(),
    sourceUrl: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    price: v.optional(v.string()),
    discoveryRunId: v.id("discoveryRuns"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      source: "perplexity_discovery",
      sourceUrl: args.sourceUrl,
      marketId: args.marketId,
      status: "raw",
      rawData: args.rawData,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      locationName: args.locationName,
      locationAddress: args.locationAddress,
      price: args.price,
      ageAppropriate: true,
      tags: [],
      discoveredAt: now,
      lastUpdatedAt: now,
      discoveryRunId: args.discoveryRunId,
    });
  },
});

// Called by classify action — internal only
export const updateClassification = internalMutation({
  args: {
    id: v.id("events"),
    categoryId: v.optional(v.id("categories")),
    pillar: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()),
    tags: v.array(v.string()),
    ageAppropriate: v.boolean(),
    classificationConfidence: v.number(),
    classificationNotes: v.optional(v.string()),
    preserveStatus: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, preserveStatus, ...updates } = args;
    const patch: Record<string, unknown> = {
      ...updates,
      lastUpdatedAt: Date.now(),
    };
    // Don't demote approved events to "classified"
    if (!preserveStatus) {
      patch.status = "classified";
    }
    await ctx.db.patch(id, patch);
  },
});
