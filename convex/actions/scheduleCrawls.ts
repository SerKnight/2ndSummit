"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Cron handler — iterates all active markets and schedules
 * runMarketCrawl for each with a 2-minute stagger.
 */
export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const markets = await ctx.runQuery(internal.queries.getActiveMarkets, {});

    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];

      // 2-minute stagger between markets
      await ctx.scheduler.runAfter(
        i * 2 * 60 * 1000,
        internal.actions.runMarketCrawl.run,
        { marketId: market._id }
      );
    }

    console.log(
      `Scheduled crawls for ${markets.length} active market(s)`
    );
  },
});
