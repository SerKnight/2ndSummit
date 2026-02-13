"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

interface CategoryRecord {
  _id: string;
  name: string;
  pillar: string;
}

interface MarketRecord {
  name: string;
  regionDescription: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
}

interface RunConfig {
  categoryIds: string[];
  radiusMiles: number;
  timeRangeDays: number;
  batchSize: number;
  temperature: number;
  searchRecencyFilter: string;
  model: string;
  systemPromptUsed: string;
  userPromptTemplateUsed: string;
}

function sanitize(val: unknown): string | undefined {
  return typeof val === "string" && val.trim() !== "" ? val : undefined;
}

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => vars[key] ?? match
  );
}

// Default prompts (fallback for legacy runs without config)
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

export const run = internalAction({
  args: {
    runId: v.id("discoveryRuns"),
    marketId: v.id("markets"),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      // Update status to running
      await ctx.runMutation(internal.discoveryRuns.updateStatus, {
        runId: args.runId,
        status: "running",
      });

      // Get market details
      const market = (await ctx.runQuery(internal.queries.getMarket, {
        id: args.marketId,
      })) as MarketRecord | null;
      if (!market) throw new Error("Market not found");

      // Read run config (if available)
      const runRecord = await ctx.runQuery(internal.queries.getDiscoveryRun, {
        id: args.runId,
      });
      const config: RunConfig = (runRecord as any)?.config ?? {
        categoryIds: [],
        radiusMiles: market.radiusMiles,
        timeRangeDays: 90,
        batchSize: 4,
        temperature: 0.1,
        searchRecencyFilter: "month",
        model: "sonar",
        systemPromptUsed: DEFAULT_SYSTEM_PROMPT,
        userPromptTemplateUsed: DEFAULT_USER_PROMPT_TEMPLATE,
      };

      // Get categories — use config.categoryIds if provided, else all active
      let categories: CategoryRecord[];
      if (config.categoryIds && config.categoryIds.length > 0) {
        categories = (await ctx.runQuery(
          internal.queries.getCategoriesByIds,
          { ids: config.categoryIds as any }
        )) as CategoryRecord[];
      } else {
        categories = (await ctx.runQuery(
          internal.queries.getActiveCategories,
          {}
        )) as CategoryRecord[];
      }

      // Batch categories
      const batchSize = config.batchSize;
      const batches: string[][] = [];
      for (let i = 0; i < categories.length; i += batchSize) {
        batches.push(
          categories
            .slice(i, i + batchSize)
            .map((c: CategoryRecord) => c.name)
        );
      }

      let totalEventsFound = 0;

      for (const batch of batches) {
        const categoryNames = batch.join(", ");

        // Build prompt from template
        const todaysDate = new Date().toISOString().split("T")[0];
        const templateVars: Record<string, string> = {
          categoryNames,
          radiusMiles: String(config.radiusMiles),
          marketName: market.name,
          regionDescription: market.regionDescription,
          latitude: String(market.latitude),
          longitude: String(market.longitude),
          timeRange: `next ${config.timeRangeDays} days`,
          todaysDate,
        };

        const userPrompt = applyTemplate(
          config.userPromptTemplateUsed,
          templateVars
        );

        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

        const messages = [
          { role: "system", content: config.systemPromptUsed },
          { role: "user", content: userPrompt },
        ];

        const requestBody = {
          model: config.model,
          messages,
          search_recency_filter: config.searchRecencyFilter,
          temperature: config.temperature,
        };

        const startTime = Date.now();
        let responseBody = "";
        let llmStatus: "success" | "error" = "success";
        let errorMsg: string | undefined;
        let tokensUsed: number | undefined;

        try {
          const response = await fetch(
            "https://api.perplexity.ai/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(requestBody),
            }
          );

          const durationMs = Date.now() - startTime;

          if (!response.ok) {
            const err = await response.text();
            llmStatus = "error";
            errorMsg = `Perplexity API error ${response.status}: ${err}`;
            responseBody = err;

            await ctx.runMutation(internal.llmLogs.create, {
              provider: "perplexity",
              model: config.model,
              action: "discovery",
              prompt: JSON.stringify(messages),
              response: responseBody,
              durationMs,
              status: llmStatus,
              errorMessage: errorMsg,
              marketId: args.marketId,
              discoveryRunId: args.runId,
            });

            throw new Error(errorMsg);
          }

          const data = await response.json();
          responseBody = JSON.stringify(data);
          const rawContent = data.choices[0].message.content;

          // Extract token usage if available
          if (data.usage) {
            tokensUsed = data.usage.total_tokens;
          }

          // Log successful Perplexity call
          await ctx.runMutation(internal.llmLogs.create, {
            provider: "perplexity",
            model: config.model,
            action: "discovery",
            prompt: JSON.stringify(messages),
            response: responseBody,
            durationMs,
            tokensUsed,
            status: "success",
            marketId: args.marketId,
            discoveryRunId: args.runId,
          });

          // Save raw response
          await ctx.runMutation(internal.discoveryRuns.saveRawResponse, {
            runId: args.runId,
            response: rawContent,
          });

          // Try to parse events from the response
          const allEvents = parseEventsFromResponse(rawContent);

          // Filter out past events
          const todayStr = new Date().toISOString().split("T")[0];
          const events = allEvents.filter((event) => {
            if (!event.date) return true; // Keep events without dates (let humans review)
            // Extract first YYYY-MM-DD from the date string
            const dateMatch = event.date.match(/\d{4}-\d{2}-\d{2}/);
            if (!dateMatch) return true; // Keep if date isn't parseable
            return dateMatch[0] >= todayStr;
          });

          if (events.length < allEvents.length) {
            console.log(
              `Filtered out ${allEvents.length - events.length} past events from batch`
            );
          }

          for (const event of events) {
            if (
              !event.title ||
              (typeof event.title === "string" && event.title.trim() === "")
            ) {
              console.warn(
                "Skipping event with missing title:",
                JSON.stringify(event).slice(0, 200)
              );
              continue;
            }

            try {
              await ctx.runMutation(internal.events.createFromDiscovery, {
                title: event.title,
                description: event.description || "",
                marketId: args.marketId,
                rawData: JSON.stringify(event),
                sourceUrl: sanitize(event.sourceUrl),
                date: sanitize(event.date),
                startTime: sanitize(event.startTime),
                endTime: sanitize(event.endTime),
                locationName: sanitize(event.locationName),
                locationAddress: sanitize(event.locationAddress),
                price: sanitize(event.price),
                discoveryRunId: args.runId,
              });
              totalEventsFound++;
            } catch (eventError) {
              console.error(
                `Failed to insert event "${event.title}":`,
                eventError instanceof Error ? eventError.message : eventError
              );
            }
          }
        } catch (batchError) {
          if (llmStatus === "error") throw batchError;
          console.error("Batch processing error:", batchError);
        }

        // Rate limit delay between batches
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Complete the run
      await ctx.runMutation(internal.discoveryRuns.updateEventsFound, {
        runId: args.runId,
        eventsFound: totalEventsFound,
      });
      await ctx.runMutation(internal.discoveryRuns.updateStatus, {
        runId: args.runId,
        status: "completed",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.discoveryRuns.updateStatus, {
        runId: args.runId,
        status: "failed",
        errorMessage: message,
      });
    }
  },
});

function parseEventsFromResponse(
  content: string
): Array<{
  title?: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  locationAddress?: string;
  price?: string;
  sourceUrl?: string;
}> {
  try {
    // Try to find JSON array in the response (non-greedy to avoid matching too broadly)
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (e: Record<string, unknown>) =>
            e && typeof e === "object" && e.title
        );
      }
    }

    // Try parsing the entire content as JSON
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed))
      return parsed.filter(
        (e: Record<string, unknown>) => e && e.title
      );
    if (parsed.events && Array.isArray(parsed.events))
      return parsed.events.filter(
        (e: Record<string, unknown>) => e && e.title
      );

    return [];
  } catch {
    return [];
  }
}
