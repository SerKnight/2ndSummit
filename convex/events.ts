import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateDedupHash, fuzzyTitleSimilarity } from "./lib/dedup";

export const list = query({
  args: {
    marketId: v.optional(v.id("markets")),
    validationStatus: v.optional(v.string()),
    pillar: v.optional(v.string()),
    categoryId: v.optional(v.id("eventCategories")),
  },
  handler: async (ctx, args) => {
    let events;

    if (args.marketId && args.validationStatus) {
      events = await ctx.db
        .query("events")
        .withIndex("by_market_validationStatus", (q) =>
          q
            .eq("marketId", args.marketId!)
            .eq("validationStatus", args.validationStatus!)
        )
        .collect();
    } else if (args.marketId) {
      events = await ctx.db
        .query("events")
        .withIndex("by_market", (q) => q.eq("marketId", args.marketId!))
        .collect();
    } else if (args.validationStatus) {
      events = await ctx.db
        .query("events")
        .withIndex("by_validationStatus", (q) =>
          q.eq("validationStatus", args.validationStatus!)
        )
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

    // Apply additional filters for combinations not covered by indexes
    if (args.pillar && args.marketId) {
      events = events.filter((e) => e.pillar === args.pillar);
    }
    if (args.categoryId && (args.marketId || args.validationStatus)) {
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
    categoryId: v.optional(v.id("eventCategories")),
    pillar: v.optional(v.string()),
    dateRaw: v.optional(v.string()),
    dateStart: v.optional(v.string()),
    timeStart: v.optional(v.string()),
    timeEnd: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    costRaw: v.optional(v.string()),
    costType: v.optional(v.string()),
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
      validationStatus: "validated",
      dateRaw: args.dateRaw,
      dateStart: args.dateStart,
      timeStart: args.timeStart,
      timeEnd: args.timeEnd,
      locationName: args.locationName,
      locationAddress: args.locationAddress,
      costRaw: args.costRaw,
      costType: args.costType,
      difficultyLevel: args.difficultyLevel,
      ageAppropriate: true,
      tags: args.tags ?? [],
      adminReviewed: true,
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
    categoryId: v.optional(v.id("eventCategories")),
    pillar: v.optional(v.string()),
    dateRaw: v.optional(v.string()),
    dateStart: v.optional(v.string()),
    dateEnd: v.optional(v.string()),
    timeStart: v.optional(v.string()),
    timeEnd: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    costRaw: v.optional(v.string()),
    costType: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()),
    ageAppropriate: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    sourceUrl: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
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
      validationStatus: "validated",
      adminReviewed: true,
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
      validationStatus: "rejected",
      adminReviewed: true,
      lastUpdatedAt: Date.now(),
    });
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("events")),
    validationStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    for (const id of args.ids) {
      const patch: Record<string, unknown> = {
        validationStatus: args.validationStatus,
        adminReviewed: true,
        lastUpdatedAt: now,
      };
      if (args.validationStatus === "validated") {
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
      pending: 0,
      validated: 0,
      rejected: 0,
      needs_review: 0,
      total: events.length,
    };

    for (const event of events) {
      if (counts[event.validationStatus] !== undefined) {
        counts[event.validationStatus]++;
      }
    }

    return counts;
  },
});

// Public query — validated/approved events for the customer-facing calendar
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
        .withIndex("by_market_validationStatus", (q) =>
          q.eq("marketId", args.marketId!).eq("validationStatus", "validated")
        )
        .collect();
    } else {
      events = await ctx.db
        .query("events")
        .withIndex("by_validationStatus", (q) =>
          q.eq("validationStatus", "validated")
        )
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
          briefSummary: event.briefSummary,
          pillar: event.pillar,
          dateRaw: event.dateRaw,
          dateStart: event.dateStart,
          dateEnd: event.dateEnd,
          timeStart: event.timeStart,
          timeEnd: event.timeEnd,
          isRecurring: event.isRecurring,
          recurrencePattern: event.recurrencePattern,
          locationName: event.locationName,
          locationAddress: event.locationAddress,
          locationCity: event.locationCity,
          locationState: event.locationState,
          isVirtual: event.isVirtual,
          costRaw: event.costRaw,
          costType: event.costType,
          costMin: event.costMin,
          costMax: event.costMax,
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

export const listByJob = query({
  args: { discoveryJobId: v.id("eventDiscoveryJobs") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_discoveryJob", (q) =>
        q.eq("discoveryJobId", args.discoveryJobId)
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

// Called by the orchestrator action — internal only
export const createFromDiscovery = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    briefSummary: v.optional(v.string()),
    marketId: v.id("markets"),
    categoryId: v.optional(v.id("eventCategories")),
    pillar: v.optional(v.string()),
    originalPayload: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceDomain: v.optional(v.string()),
    dateRaw: v.optional(v.string()),
    dateStart: v.optional(v.string()),
    dateEnd: v.optional(v.string()),
    timeStart: v.optional(v.string()),
    timeEnd: v.optional(v.string()),
    timezone: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    recurrencePattern: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    locationCity: v.optional(v.string()),
    locationState: v.optional(v.string()),
    isVirtual: v.optional(v.boolean()),
    virtualUrl: v.optional(v.string()),
    costRaw: v.optional(v.string()),
    costType: v.optional(v.string()),
    costMin: v.optional(v.number()),
    costMax: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    validationStatus: v.string(),
    validationConfidence: v.optional(v.number()),
    validationNotes: v.optional(v.string()),
    discoveryJobId: v.id("eventDiscoveryJobs"),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate dedup hash
    const dedupHash = generateDedupHash(
      args.title,
      args.dateStart,
      args.locationName
    );

    // Check for exact hash match
    const exactMatch = await ctx.db
      .query("events")
      .withIndex("by_dedupHash", (q) => q.eq("dedupHash", dedupHash))
      .first();

    if (exactMatch) {
      // Exact duplicate — skip
      return { inserted: false, reason: "exact_duplicate", eventId: exactMatch._id };
    }

    // Check for fuzzy match — same date + similar title
    let isDuplicate = false;
    if (args.dateStart) {
      const sameDateEvents = await ctx.db
        .query("events")
        .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
        .collect();

      for (const existing of sameDateEvents) {
        if (existing.dateStart === args.dateStart) {
          const similarity = fuzzyTitleSimilarity(args.title, existing.title);
          if (similarity > 0.85) {
            isDuplicate = true;
            break;
          }
        }
      }
    }

    // Extract domain from source URL
    let sourceDomain = args.sourceDomain;
    if (!sourceDomain && args.sourceUrl) {
      try {
        sourceDomain = new URL(args.sourceUrl).hostname;
      } catch {
        // Invalid URL, skip domain extraction
      }
    }

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      briefSummary: args.briefSummary,
      source: args.source ?? "perplexity_discovery",
      sourceUrl: args.sourceUrl,
      sourceDomain,
      sourceExtractedAt: now,
      marketId: args.marketId,
      categoryId: args.categoryId,
      pillar: args.pillar,
      originalPayload: args.originalPayload,
      dateRaw: args.dateRaw,
      dateStart: args.dateStart,
      dateEnd: args.dateEnd,
      timeStart: args.timeStart,
      timeEnd: args.timeEnd,
      timezone: args.timezone,
      isRecurring: args.isRecurring,
      recurrencePattern: args.recurrencePattern,
      locationName: args.locationName,
      locationAddress: args.locationAddress,
      locationCity: args.locationCity,
      locationState: args.locationState,
      isVirtual: args.isVirtual,
      virtualUrl: args.virtualUrl,
      costRaw: args.costRaw,
      costType: args.costType,
      costMin: args.costMin,
      costMax: args.costMax,
      tags: args.tags ?? [],
      ageAppropriate: true,
      validationStatus: isDuplicate ? "needs_review" : args.validationStatus,
      validationConfidence: args.validationConfidence,
      validationNotes: isDuplicate
        ? `${args.validationNotes ?? ""} [Flagged as potential duplicate]`.trim()
        : args.validationNotes,
      dedupHash,
      isDuplicate,
      discoveredAt: now,
      lastUpdatedAt: now,
      discoveryJobId: args.discoveryJobId,
    });

    return { inserted: true, isDuplicate, eventId };
  },
});
