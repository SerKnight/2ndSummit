"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Per-source crawl orchestrator — mirrors runEventDiscovery.ts:
 * 1. Crawl source → extract events
 * 2. Validate events (OpenAI)
 * 3. Store with dedup
 */
export const run = internalAction({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    sourceId: v.id("marketSources"),
    marketId: v.id("markets"),
    dateRangeStart: v.string(),
    dateRangeEnd: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Step 1: Crawl + extract
      await ctx.runMutation(internal.eventDiscoveryJobs.updateStatus, {
        jobId: args.jobId,
        status: "searching",
      });

      const rawEvents = await ctx.runAction(
        internal.actions.crawlSource.run,
        {
          sourceId: args.sourceId,
          marketId: args.marketId,
          jobId: args.jobId,
          dateRangeStart: args.dateRangeStart,
          dateRangeEnd: args.dateRangeEnd,
        }
      );

      await ctx.runMutation(internal.eventDiscoveryJobs.updateCounts, {
        jobId: args.jobId,
        eventsFound: rawEvents.length,
      });

      if (rawEvents.length === 0) {
        await ctx.runMutation(internal.eventDiscoveryJobs.updateStatus, {
          jobId: args.jobId,
          status: "completed",
        });
        return;
      }

      // Step 2: Validate with OpenAI
      await ctx.runMutation(internal.eventDiscoveryJobs.updateStatus, {
        jobId: args.jobId,
        status: "validating",
      });

      // Get market info for validation context
      const market = await ctx.runQuery(internal.queries.getMarket, {
        id: args.marketId,
      });

      const validationResults = await ctx.runAction(
        internal.actions.validateEvents.run,
        {
          jobId: args.jobId,
          marketId: args.marketId,
          categoryName: "General",
          pillar: "Discover",
          events: JSON.stringify(rawEvents),
          marketName: market?.name,
          marketRegion: market?.regionDescription,
        }
      );

      const validatedCount = validationResults.filter(
        (r: any) => r.recommendation !== "reject"
      ).length;

      await ctx.runMutation(internal.eventDiscoveryJobs.updateCounts, {
        jobId: args.jobId,
        eventsValidated: validatedCount,
      });

      // Step 3: Store validated events with dedup
      await ctx.runMutation(internal.eventDiscoveryJobs.updateStatus, {
        jobId: args.jobId,
        status: "storing",
      });

      let storedCount = 0;

      for (const result of validationResults) {
        const r = result as any;
        if (r.recommendation === "reject") continue;

        const event = r.correctedEvent;
        try {
          let validationStatus: string;
          if (r.recommendation === "accept" && r.confidence >= 0.7) {
            validationStatus = "validated";
          } else if (
            r.recommendation === "needs_review" ||
            r.confidence < 0.7
          ) {
            validationStatus = "needs_review";
          } else {
            validationStatus = "pending";
          }

          const insertResult = await ctx.runMutation(
            internal.events.createFromDiscovery,
            {
              title: event.title || "Untitled Event",
              description: event.description || "",
              briefSummary: sanitize(event.briefSummary),
              marketId: args.marketId,
              originalPayload: JSON.stringify(event),
              sourceUrl: sanitize(event.sourceUrl),
              dateRaw: sanitize(event.dateRaw),
              dateStart: sanitize(event.dateStart),
              dateEnd: sanitize(event.dateEnd),
              timeStart: sanitize(event.timeStart),
              timeEnd: sanitize(event.timeEnd),
              isRecurring: event.isRecurring ?? false,
              recurrencePattern: sanitize(event.recurrencePattern),
              locationName: sanitize(event.locationName),
              locationAddress: sanitize(event.locationAddress),
              locationCity: sanitize(event.locationCity),
              locationState: sanitize(event.locationState),
              isVirtual: event.isVirtual ?? false,
              costRaw: sanitize(event.costRaw),
              costType: sanitize(event.costType),
              costMin:
                typeof event.costMin === "number" ? event.costMin : undefined,
              costMax:
                typeof event.costMax === "number" ? event.costMax : undefined,
              tags: Array.isArray(event.tags) ? event.tags : [],
              validationStatus,
              validationConfidence: r.confidence,
              validationNotes:
                r.issues && r.issues.length > 0
                  ? r.issues.join("; ")
                  : undefined,
              discoveryJobId: args.jobId,
              source: "crawl_extraction",
            }
          );

          if ((insertResult as any).inserted) {
            storedCount++;
          }
        } catch (error) {
          console.error(
            `Failed to store event "${event.title}":`,
            error instanceof Error ? error.message : error
          );
        }
      }

      await ctx.runMutation(internal.eventDiscoveryJobs.updateCounts, {
        jobId: args.jobId,
        eventsStored: storedCount,
      });

      await ctx.runMutation(internal.eventDiscoveryJobs.updateStatus, {
        jobId: args.jobId,
        status: "completed",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.eventDiscoveryJobs.updateStatus, {
        jobId: args.jobId,
        status: "failed",
        errorMessage: message,
      });
    }
  },
});

function sanitize(val: unknown): string | undefined {
  if (
    typeof val === "string" &&
    val.trim() !== "" &&
    val !== "null" &&
    val !== "undefined"
  ) {
    return val;
  }
  return undefined;
}
