import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const triggerClassification = mutation({
  args: { marketId: v.optional(v.id("markets")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Schedule the classification action
    await ctx.scheduler.runAfter(
      0,
      internal.actions.classifyEvents.run,
      { marketId: args.marketId }
    );

    return { scheduled: true };
  },
});
