"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

/**
 * Pipeline orchestrator — runs the full discovery pipeline:
 * 1. Search (Perplexity) → 2. Validate (OpenAI) → 3. Store with dedup
 */
export const run = internalAction({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    marketId: v.id("markets"),
    categoryId: v.id("eventCategories"),
    dateRangeStart: v.string(),
    dateRangeEnd: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Step 1: Search with Perplexity
      await ctx.runMutation(internal.eventDiscoveryJobs.updateStatus, {
        jobId: args.jobId,
        status: "searching",
      });

      const rawEvents = await ctx.runAction(
        internal.actions.discoverEvents.run,
        {
          jobId: args.jobId,
          marketId: args.marketId,
          categoryId: args.categoryId,
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

      // Get category info for validation context
      const category = await ctx.runQuery(internal.queries.getEventCategory, {
        id: args.categoryId,
      });

      const validationResults = await ctx.runAction(
        internal.actions.validateEvents.run,
        {
          jobId: args.jobId,
          marketId: args.marketId,
          categoryName: category?.name ?? "Unknown",
          pillar: category?.pillar ?? "Discover",
          events: JSON.stringify(rawEvents),
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
        // Skip rejected events
        if (r.recommendation === "reject") continue;

        const event = r.correctedEvent;
        try {
          // Map validation recommendation to validationStatus
          let validationStatus: string;
          if (r.recommendation === "accept" && r.confidence >= 0.7) {
            validationStatus = "validated";
          } else if (r.recommendation === "needs_review" || r.confidence < 0.7) {
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
              categoryId: args.categoryId,
              pillar: category?.pillar,
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

      // Complete
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
  if (typeof val === "string" && val.trim() !== "" && val !== "null" && val !== "undefined") {
    return val;
  }
  return undefined;
}
