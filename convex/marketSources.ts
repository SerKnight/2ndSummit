import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Normalize a URL for dedup comparison. */
export function normalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw.trim().toLowerCase();
  }
  // Lowercase hostname, remove www. prefix
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  // Remove common tracking params
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid"];
  for (const param of trackingParams) {
    url.searchParams.delete(param);
  }
  // Build normalized string, remove trailing slash from pathname
  let normalized = url.origin + url.pathname.replace(/\/+$/, "");
  const qs = url.searchParams.toString();
  if (qs) normalized += "?" + qs;
  if (url.hash) normalized += url.hash;
  return normalized;
}

export const list = query({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("marketSources")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .collect();
  },
});

export const create = mutation({
  args: {
    marketId: v.id("markets"),
    url: v.string(),
    name: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    contentSelector: v.optional(v.string()),
    crawlFrequency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const market = await ctx.db.get(args.marketId);
    if (!market) throw new Error("Market not found");

    const url = args.url.trim();
    if (!url) throw new Error("URL cannot be empty");

    const normalized = normalizeUrl(url);

    // Check for duplicate URL in this market (using normalized comparison)
    const existing = await ctx.db
      .query("marketSources")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .collect();
    if (existing.some((s) => normalizeUrl(s.url) === normalized)) {
      throw new Error("Source URL already exists for this market");
    }

    return await ctx.db.insert("marketSources", {
      marketId: args.marketId,
      url,
      name: args.name,
      sourceType: args.sourceType ?? "crawl",
      contentSelector: args.contentSelector,
      isActive: true,
      crawlFrequency: args.crawlFrequency ?? "weekly",
      totalEventsFound: 0,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("marketSources"),
    url: v.optional(v.string()),
    name: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    contentSelector: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    crawlFrequency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanUpdates);
  },
});

export const remove = mutation({
  args: { id: v.id("marketSources") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

export const updateCrawlStatus = internalMutation({
  args: {
    id: v.id("marketSources"),
    status: v.string(), // "success" | "error" | "no_events"
    eventsFound: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.id);
    if (!source) return;

    const now = Date.now();
    const patch: Record<string, unknown> = {
      lastCrawledAt: now,
      lastCrawlStatus: args.status,
    };

    if (args.status === "success") {
      patch.consecutiveFailures = 0;
      patch.lastEventsFound = args.eventsFound ?? 0;
      patch.totalEventsFound =
        source.totalEventsFound + (args.eventsFound ?? 0);
      patch.lastCrawlError = undefined;
    } else if (args.status === "error") {
      const failures = (source.consecutiveFailures ?? 0) + 1;
      patch.consecutiveFailures = failures;
      patch.lastCrawlError = args.error;
      patch.lastEventsFound = 0;
      // Auto-disable after 5 consecutive failures
      if (failures >= 5) {
        patch.isActive = false;
      }
    } else if (args.status === "no_events") {
      patch.consecutiveFailures = 0;
      patch.lastEventsFound = 0;
      patch.lastCrawlError = undefined;
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const migrateFromSearchSources = mutation({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const market = await ctx.db.get(args.marketId);
    if (!market) throw new Error("Market not found");

    const existingSources = market.searchSources ?? [];
    if (existingSources.length === 0) return { migrated: 0 };

    // Get already-migrated URLs
    const alreadyMigrated = await ctx.db
      .query("marketSources")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .collect();
    const existingNormalized = new Set(alreadyMigrated.map((s) => normalizeUrl(s.url)));

    let migrated = 0;
    const now = Date.now();

    for (const url of existingSources) {
      const normalized = normalizeUrl(url);
      if (existingNormalized.has(normalized)) continue;
      existingNormalized.add(normalized);

      let name: string | undefined;
      try {
        name = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        // skip domain extraction
      }

      await ctx.db.insert("marketSources", {
        marketId: args.marketId,
        url,
        name,
        sourceType: "crawl",
        isActive: true,
        crawlFrequency: "weekly",
        totalEventsFound: 0,
        createdAt: now,
      });
      migrated++;
    }

    return { migrated };
  },
});

// Internal mutation for AI-generated sources — replaces old sources with new ones
export const bulkReplace = internalMutation({
  args: {
    marketId: v.id("markets"),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get existing sources for this market
    const existing = await ctx.db
      .query("marketSources")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .collect();

    const existingNormalized = new Set(existing.map((s) => normalizeUrl(s.url)));
    const now = Date.now();
    let added = 0;

    for (const url of args.urls) {
      const trimmed = url.trim();
      if (!trimmed) continue;
      const normalized = normalizeUrl(trimmed);
      if (existingNormalized.has(normalized)) continue;
      existingNormalized.add(normalized); // prevent dupes within same batch

      let name: string | undefined;
      try {
        name = new URL(trimmed).hostname.replace(/^www\./, "");
      } catch {
        // skip domain extraction
      }

      await ctx.db.insert("marketSources", {
        marketId: args.marketId,
        url: trimmed,
        name,
        sourceType: "crawl",
        isActive: true,
        crawlFrequency: "weekly",
        totalEventsFound: 0,
        createdAt: now,
      });
      added++;
    }

    return { added };
  },
});

export const removeDuplicates = mutation({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sources = await ctx.db
      .query("marketSources")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .collect();

    // Group by normalized URL, keep the oldest (smallest createdAt) in each group
    const groups = new Map<string, typeof sources>();
    for (const source of sources) {
      const normalized = normalizeUrl(source.url);
      const group = groups.get(normalized);
      if (group) {
        group.push(source);
      } else {
        groups.set(normalized, [source]);
      }
    }

    let removed = 0;
    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      // Sort by createdAt ascending — keep the first (oldest)
      group.sort((a, b) => a.createdAt - b.createdAt);
      for (let i = 1; i < group.length; i++) {
        await ctx.db.delete(group[i]._id);
        removed++;
      }
    }

    return { removed };
  },
});
