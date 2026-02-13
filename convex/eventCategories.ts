import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    pillar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let categories;
    if (args.pillar) {
      categories = await ctx.db
        .query("eventCategories")
        .withIndex("by_pillar", (q) => q.eq("pillar", args.pillar!))
        .collect();
    } else {
      categories = await ctx.db.query("eventCategories").collect();
    }
    // Attach event counts
    return Promise.all(
      categories.map(async (cat) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
          .collect();
        return { ...cat, eventCount: events.length };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("eventCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    pillar: v.string(),
    description: v.optional(v.string()),
    searchSubPrompt: v.optional(v.string()),
    exclusionRules: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const id = await ctx.db.insert("eventCategories", {
      name: args.name,
      pillar: args.pillar,
      description: args.description,
      searchSubPrompt: args.searchSubPrompt,
      exclusionRules: args.exclusionRules,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule prompt generation if no searchSubPrompt was provided
    if (!args.searchSubPrompt) {
      await ctx.scheduler.runAfter(
        0,
        internal.actions.generateCategoryPrompt.run,
        { categoryId: id }
      );
    }

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("eventCategories"),
    name: v.optional(v.string()),
    pillar: v.optional(v.string()),
    description: v.optional(v.string()),
    searchSubPrompt: v.optional(v.string()),
    exclusionRules: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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
  args: { id: v.id("eventCategories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
  },
});

export const regeneratePrompt = mutation({
  args: { id: v.id("eventCategories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.scheduler.runAfter(
      0,
      internal.actions.generateCategoryPrompt.run,
      { categoryId: args.id }
    );

    return { scheduled: true };
  },
});

// Internal mutation for actions to update searchSubPrompt
export const updateSearchSubPrompt = internalMutation({
  args: {
    id: v.id("eventCategories"),
    searchSubPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      searchSubPrompt: args.searchSubPrompt,
      updatedAt: Date.now(),
    });
  },
});

const DEFAULT_CATEGORIES = [
  // Move
  { name: "Walking Groups", pillar: "Move" },
  { name: "Hiking", pillar: "Move" },
  { name: "Cycling", pillar: "Move" },
  { name: "Balance & Mobility", pillar: "Move" },
  { name: "Skiing/Snowboarding", pillar: "Move" },
  { name: "Skating", pillar: "Move" },
  { name: "Yoga/Stretching", pillar: "Move" },
  { name: "Water Sports", pillar: "Move" },
  // Discover
  { name: "Museum & Gallery Tours", pillar: "Discover" },
  { name: "Lectures & Talks", pillar: "Discover" },
  { name: "Behind-the-Scenes Experiences", pillar: "Discover" },
  { name: "Astronomy & Science", pillar: "Discover" },
  { name: "Cooking Classes", pillar: "Discover" },
  { name: "Creative Arts & Workshops", pillar: "Discover" },
  { name: "Music & Performing Arts", pillar: "Discover" },
  // Connect
  { name: "Small-Group Dinners", pillar: "Connect" },
  { name: "Cultural Outings", pillar: "Connect" },
  { name: "Brunches & Social Hours", pillar: "Connect" },
  { name: "Volunteer Events", pillar: "Connect" },
  { name: "Book & Discussion Groups", pillar: "Connect" },
];

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if categories already exist (idempotent)
    const existing = await ctx.db.query("eventCategories").collect();
    if (existing.length > 0) {
      return { seeded: false, message: "Categories already exist" };
    }

    const now = Date.now();
    const categoryIds: string[] = [];

    for (const cat of DEFAULT_CATEGORIES) {
      const id = await ctx.db.insert("eventCategories", {
        name: cat.name,
        pillar: cat.pillar,
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      categoryIds.push(id);
    }

    // Schedule prompt generation for each category
    for (const id of categoryIds) {
      await ctx.scheduler.runAfter(
        0,
        internal.actions.generateCategoryPrompt.run,
        { categoryId: id as any }
      );
    }

    return {
      seeded: true,
      message: `Seeded ${DEFAULT_CATEGORIES.length} categories — prompt generation scheduled`,
    };
  },
});
