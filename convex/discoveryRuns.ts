import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { marketId: v.optional(v.id("markets")) },
  handler: async (ctx, args) => {
    let runs;
    if (args.marketId) {
      runs = await ctx.db
        .query("discoveryRuns")
        .withIndex("by_market", (q) => q.eq("marketId", args.marketId!))
        .order("desc")
        .collect();
    } else {
      runs = await ctx.db
        .query("discoveryRuns")
        .order("desc")
        .collect();
    }

    return Promise.all(
      runs.map(async (run) => {
        const market = await ctx.db.get(run.marketId);
        return { ...run, marketName: market?.name ?? "Unknown" };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("discoveryRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.id);
    if (!run) return null;
    const market = await ctx.db.get(run.marketId);
    return { ...run, marketName: market?.name ?? "Unknown" };
  },
});

export const create = mutation({
  args: {
    marketId: v.id("markets"),
    categoryIds: v.optional(v.array(v.id("categories"))),
    radiusMiles: v.optional(v.number()),
    timeRangeDays: v.optional(v.number()),
    batchSize: v.optional(v.number()),
    temperature: v.optional(v.number()),
    searchRecencyFilter: v.optional(v.string()),
    model: v.optional(v.string()),
    promptTemplateId: v.optional(v.id("promptTemplates")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Resolve market for defaults
    const market = await ctx.db.get(args.marketId);
    if (!market) throw new Error("Market not found");

    // Resolve categories
    let categories;
    if (args.categoryIds && args.categoryIds.length > 0) {
      const results = await Promise.all(
        args.categoryIds.map((id) => ctx.db.get(id))
      );
      categories = results.filter(Boolean) as Array<{
        _id: any;
        name: string;
        pillar: string;
      }>;
    } else {
      categories = await ctx.db
        .query("categories")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }
    const categoryNames = categories.map((c) => c.name);
    const categoryIds = categories.map((c) => c._id);

    // Resolve prompt template
    let systemPrompt =
      "You are a local events researcher. Find specific, current events, classes, and activities suitable for active adults aged 60+. Always return your findings as a JSON array.";
    let userPromptTemplate = `Search for upcoming {{categoryNames}} events and activities for adults within {{radiusMiles}} miles of {{marketName}} ({{regionDescription}}, coordinates: {{latitude}}, {{longitude}}).

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

    let promptTemplateId = args.promptTemplateId;

    if (promptTemplateId) {
      const template = await ctx.db.get(promptTemplateId);
      if (template) {
        systemPrompt = template.systemPrompt;
        userPromptTemplate = template.userPromptTemplate;
      }
    } else {
      // Try to use the default template
      const defaults = await ctx.db
        .query("promptTemplates")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .collect();
      if (defaults[0]) {
        systemPrompt = defaults[0].systemPrompt;
        userPromptTemplate = defaults[0].userPromptTemplate;
        promptTemplateId = defaults[0]._id;
      }
    }

    const config = {
      categoryIds,
      radiusMiles: args.radiusMiles ?? market.radiusMiles,
      timeRangeDays: args.timeRangeDays ?? 90,
      batchSize: args.batchSize ?? 4,
      temperature: args.temperature ?? 0.1,
      searchRecencyFilter: args.searchRecencyFilter ?? "month",
      model: args.model ?? "sonar",
      promptTemplateId,
      systemPromptUsed: systemPrompt,
      userPromptTemplateUsed: userPromptTemplate,
    };

    const runId = await ctx.db.insert("discoveryRuns", {
      marketId: args.marketId,
      status: "pending",
      categoriesSearched: categoryNames,
      eventsFound: 0,
      startedAt: Date.now(),
      config,
      createdBy: userId,
    });

    // Schedule the discovery action
    await ctx.scheduler.runAfter(0, internal.actions.discoverEvents.run, {
      runId,
      marketId: args.marketId,
    });

    return runId;
  },
});

export const updateStatus = internalMutation({
  args: {
    runId: v.id("discoveryRuns"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.errorMessage) patch.errorMessage = args.errorMessage;
    if (args.status === "completed" || args.status === "failed") {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(args.runId, patch);
  },
});

export const saveRawResponse = internalMutation({
  args: {
    runId: v.id("discoveryRuns"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return;
    const existing = run.rawResponses ?? [];
    await ctx.db.patch(args.runId, {
      rawResponses: [...existing, args.response],
    });
  },
});

export const updateEventsFound = internalMutation({
  args: {
    runId: v.id("discoveryRuns"),
    eventsFound: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { eventsFound: args.eventsFound });
  },
});
