import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_SYSTEM_PROMPT =
  "You are a local events researcher. Find specific, upcoming future events, classes, and activities suitable for active adults aged 60+. Only include events that have NOT yet occurred — every event must have a date on or after today's date. Never include past events. Always return your findings as a JSON array.";

const DEFAULT_USER_PROMPT_TEMPLATE = `Today's date is {{todaysDate}}. Search for FUTURE {{categoryNames}} events and activities for adults within {{radiusMiles}} miles of {{marketName}} ({{regionDescription}}, coordinates: {{latitude}}, {{longitude}}).

IMPORTANT: Only include events happening on or after {{todaysDate}}. Do NOT include any events that have already occurred.

Focus on the {{timeRange}}. For each event found, provide:
- Event name
- Organizer/host
- Date(s) and time(s)
- Location name and address
- Price or cost
- Brief description (2-3 sentences)
- Source URL where more info can be found

Return results as a JSON array with this exact structure:
[
  {
    "title": "Event Name",
    "description": "2-3 sentence description",
    "date": "YYYY-MM-DD or date range",
    "startTime": "HH:MM AM/PM",
    "endTime": "HH:MM AM/PM",
    "locationName": "Venue Name",
    "locationAddress": "Full address",
    "price": "Free / $XX / etc",
    "sourceUrl": "https://..."
  }
]

Be specific — include real event names, real venues, and real dates. If you find fewer than 3 events for a category, note that.`;

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("promptTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("promptTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const defaults = await ctx.db
      .query("promptTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();
    return defaults[0] ?? null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.string(),
    userPromptTemplate: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const isDefault = args.isDefault ?? false;

    // If setting as default, unset existing defaults
    if (isDefault) {
      const existing = await ctx.db
        .query("promptTemplates")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .collect();
      for (const tmpl of existing) {
        await ctx.db.patch(tmpl._id, { isDefault: false });
      }
    }

    return await ctx.db.insert("promptTemplates", {
      name: args.name,
      description: args.description,
      systemPrompt: args.systemPrompt,
      userPromptTemplate: args.userPromptTemplate,
      isDefault,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("promptTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    userPromptTemplate: v.optional(v.string()),
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
  args: { id: v.id("promptTemplates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.id);
    if (!template) throw new Error("Template not found");

    // Prevent deleting the only active template
    const activeTemplates = await ctx.db
      .query("promptTemplates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    if (activeTemplates.length <= 1) {
      throw new Error("Cannot delete the only active template");
    }

    // If deleting the default, promote another
    if (template.isDefault) {
      const other = activeTemplates.find((t) => t._id !== args.id);
      if (other) {
        await ctx.db.patch(other._id, { isDefault: true });
      }
    }

    await ctx.db.delete(args.id);
  },
});

export const setDefault = mutation({
  args: { id: v.id("promptTemplates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Unset existing defaults
    const existing = await ctx.db
      .query("promptTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .collect();
    for (const tmpl of existing) {
      await ctx.db.patch(tmpl._id, { isDefault: false });
    }

    await ctx.db.patch(args.id, { isDefault: true });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if templates already exist (idempotent)
    const existing = await ctx.db.query("promptTemplates").collect();
    if (existing.length > 0) {
      return { seeded: false, message: "Templates already exist" };
    }

    const now = Date.now();
    await ctx.db.insert("promptTemplates", {
      name: "Default Discovery",
      description:
        "Standard discovery prompt that searches for events across selected categories in a market area.",
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
      isDefault: true,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return { seeded: true, message: "Default template created" };
  },
});
