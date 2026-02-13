"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { assembleSearchPrompt } from "../lib/promptAssembly";

interface MarketRecord {
  name: string;
  regionDescription: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  searchSources?: string[];
  sourcePromptContext?: string;
}

interface CategoryRecord {
  _id: string;
  name: string;
  pillar: string;
  searchSubPrompt?: string;
  exclusionRules?: string;
}

interface RawEventCandidate {
  title?: string;
  description?: string;
  briefSummary?: string;
  dateRaw?: string;
  dateStart?: string;
  dateEnd?: string;
  timeStart?: string;
  timeEnd?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  locationName?: string;
  locationAddress?: string;
  locationCity?: string;
  locationState?: string;
  isVirtual?: boolean;
  virtualUrl?: string;
  costRaw?: string;
  costType?: string;
  costMin?: number;
  costMax?: number;
  sourceUrl?: string;
  tags?: string[];
}

function sanitize(val: unknown): string | undefined {
  return typeof val === "string" && val.trim() !== "" ? val : undefined;
}

/**
 * Layer 1 — Search action using Perplexity.
 * Takes a single job + market + category and returns parsed event candidates.
 * Does NOT store events — that happens after validation in the orchestrator.
 */
export const run = internalAction({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    marketId: v.id("markets"),
    categoryId: v.id("eventCategories"),
    dateRangeStart: v.string(),
    dateRangeEnd: v.string(),
  },
  handler: async (ctx, args): Promise<RawEventCandidate[]> => {
    // Get market details
    const market = (await ctx.runQuery(internal.queries.getMarket, {
      id: args.marketId,
    })) as MarketRecord | null;
    if (!market) throw new Error("Market not found");

    // Get category details
    const category = (await ctx.runQuery(internal.queries.getEventCategory, {
      id: args.categoryId,
    })) as CategoryRecord | null;
    if (!category) throw new Error("Category not found");

    // Assemble the prompt
    const { systemPrompt, userPrompt } = assembleSearchPrompt(
      market,
      category,
      { start: args.dateRangeStart, end: args.dateRangeEnd }
    );

    // Save prompt on job record
    await ctx.runMutation(internal.eventDiscoveryJobs.updatePromptUsed, {
      jobId: args.jobId,
      promptUsed: userPrompt,
    });

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const requestBody = {
      model: "sonar",
      messages,
      search_recency_filter: "month",
      temperature: 0.1,
    };

    const startTime = Date.now();
    let responseBody = "";
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
        responseBody = err;

        await ctx.runMutation(internal.llmLogs.create, {
          provider: "perplexity",
          model: "sonar",
          action: "discovery",
          prompt: JSON.stringify(messages),
          response: responseBody,
          durationMs,
          status: "error",
          errorMessage: `Perplexity API error ${response.status}: ${err}`,
          marketId: args.marketId,
          discoveryJobId: args.jobId,
        });

        throw new Error(`Perplexity API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      responseBody = JSON.stringify(data);
      const rawContent = data.choices[0].message.content;
      tokensUsed = data.usage?.total_tokens;

      // Log successful call
      await ctx.runMutation(internal.llmLogs.create, {
        provider: "perplexity",
        model: "sonar",
        action: "discovery",
        prompt: JSON.stringify(messages),
        response: responseBody,
        durationMs,
        tokensUsed,
        status: "success",
        marketId: args.marketId,
        discoveryJobId: args.jobId,
      });

      // Save raw response on job
      await ctx.runMutation(internal.eventDiscoveryJobs.saveRawResponse, {
        jobId: args.jobId,
        rawResponse: rawContent,
      });

      // Parse events from response
      const allEvents = parseEventsFromResponse(rawContent);

      // Filter out past events
      const todayStr = args.dateRangeStart;
      const events = allEvents.filter((event) => {
        const dateStr = event.dateStart || event.dateRaw;
        if (!dateStr) return true; // Keep events without dates for human review
        const dateMatch = dateStr.match(/\d{4}-\d{2}-\d{2}/);
        if (!dateMatch) return true;
        return dateMatch[0] >= todayStr;
      });

      // Filter out events with missing titles
      return events.filter(
        (e) => e.title && typeof e.title === "string" && e.title.trim() !== ""
      );
    } catch (error) {
      if (responseBody) throw error; // Already logged
      // Log unlogged errors
      const durationMs = Date.now() - startTime;
      await ctx.runMutation(internal.llmLogs.create, {
        provider: "perplexity",
        model: "sonar",
        action: "discovery",
        prompt: JSON.stringify(messages),
        response: responseBody || "No response",
        durationMs,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
        marketId: args.marketId,
        discoveryJobId: args.jobId,
      });
      throw error;
    }
  },
});

function parseEventsFromResponse(content: string): RawEventCandidate[] {
  try {
    // Strategy 1: Find JSON array in the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (e: Record<string, unknown>) => e && typeof e === "object" && e.title
          );
        }
      } catch {
        // Try to repair common JSON issues
        const repaired = repairJson(jsonMatch[0]);
        if (repaired) {
          const parsed = JSON.parse(repaired);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (e: Record<string, unknown>) =>
                e && typeof e === "object" && e.title
            );
          }
        }
      }
    }

    // Strategy 2: Parse entire content as JSON
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

function repairJson(str: string): string | null {
  try {
    // Remove trailing commas before ] or }
    let repaired = str.replace(/,\s*([}\]])/g, "$1");
    // Try to fix unescaped quotes in strings (basic)
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}
