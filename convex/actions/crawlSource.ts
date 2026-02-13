"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { extractContentFromHtml } from "../lib/htmlExtractor";
import { buildCrawlExtractionPrompt } from "../lib/crawlExtractionPrompt";

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

/**
 * Crawls a single source URL, extracts text via cheerio,
 * then uses OpenAI to extract structured event data.
 */
export const run = internalAction({
  args: {
    sourceId: v.id("marketSources"),
    marketId: v.id("markets"),
    jobId: v.id("eventDiscoveryJobs"),
    dateRangeStart: v.string(),
    dateRangeEnd: v.string(),
  },
  handler: async (ctx, args): Promise<RawEventCandidate[]> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    // Fetch source and market details
    const source = await ctx.runQuery(internal.queries.getMarketSource, {
      id: args.sourceId,
    });
    if (!source) throw new Error("Market source not found");

    const market = await ctx.runQuery(internal.queries.getMarket, {
      id: args.marketId,
    });
    if (!market) throw new Error("Market not found");

    // Step 1: Fetch HTML
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; 2ndSummitBot/1.0; event-discovery)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errMsg = `HTTP ${response.status} fetching ${source.url}`;
        await ctx.runMutation(internal.marketSources.updateCrawlStatus, {
          id: args.sourceId,
          status: "error",
          error: errMsg,
        });
        throw new Error(errMsg);
      }

      html = await response.text();
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown fetch error";
      await ctx.runMutation(internal.marketSources.updateCrawlStatus, {
        id: args.sourceId,
        status: "error",
        error: errMsg,
      });
      throw error;
    }

    // Step 2: Extract content via cheerio
    const { text, title: pageTitle } = extractContentFromHtml(
      html,
      source.contentSelector ?? undefined
    );

    if (!text || text.length < 50) {
      await ctx.runMutation(internal.marketSources.updateCrawlStatus, {
        id: args.sourceId,
        status: "no_events",
      });
      return [];
    }

    // Step 3: Build prompt and call OpenAI
    const { systemPrompt, userPrompt } = buildCrawlExtractionPrompt({
      pageText: text,
      pageTitle,
      sourceUrl: source.url,
      marketName: market.name,
      marketRegion: market.regionDescription,
      latitude: market.latitude,
      longitude: market.longitude,
      radiusMiles: market.radiusMiles,
      dateRangeStart: args.dateRangeStart,
      dateRangeEnd: args.dateRangeEnd,
    });

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const startTime = Date.now();
    let responseBody = "";

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.1,
            max_tokens: 4000,
            response_format: { type: "json_object" },
          }),
        }
      );

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const err = await response.text();
        responseBody = err;

        await ctx.runMutation(internal.llmLogs.create, {
          provider: "openai",
          model: "gpt-4o-mini",
          action: "crawl_extraction",
          prompt: JSON.stringify(messages).slice(0, 10000),
          response: err,
          durationMs,
          status: "error",
          errorMessage: `OpenAI API error ${response.status}: ${err}`,
          marketId: args.marketId,
          discoveryJobId: args.jobId,
        });

        await ctx.runMutation(internal.marketSources.updateCrawlStatus, {
          id: args.sourceId,
          status: "error",
          error: `OpenAI API error ${response.status}`,
        });

        throw new Error(`OpenAI API error ${response.status}`);
      }

      const data = await response.json();
      responseBody = JSON.stringify(data);
      const content = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens;

      await ctx.runMutation(internal.llmLogs.create, {
        provider: "openai",
        model: "gpt-4o-mini",
        action: "crawl_extraction",
        prompt: JSON.stringify(messages).slice(0, 10000),
        response: responseBody.slice(0, 10000),
        durationMs,
        tokensUsed,
        status: "success",
        marketId: args.marketId,
        discoveryJobId: args.jobId,
      });

      // Parse extracted events
      const parsed = JSON.parse(content);
      const events: RawEventCandidate[] = Array.isArray(parsed.events)
        ? parsed.events
        : Array.isArray(parsed)
          ? parsed
          : [];

      // Filter: must have title, filter out past events
      const validEvents = events.filter((e) => {
        if (!e.title || typeof e.title !== "string" || !e.title.trim())
          return false;
        const dateStr = e.dateStart || e.dateRaw;
        if (!dateStr) return true;
        const dateMatch = dateStr.match(/\d{4}-\d{2}-\d{2}/);
        if (!dateMatch) return true;
        return dateMatch[0] >= args.dateRangeStart;
      });

      // Set sourceUrl on each event if not present
      for (const event of validEvents) {
        if (!event.sourceUrl) {
          event.sourceUrl = source.url;
        }
      }

      // Update crawl status
      await ctx.runMutation(internal.marketSources.updateCrawlStatus, {
        id: args.sourceId,
        status: validEvents.length > 0 ? "success" : "no_events",
        eventsFound: validEvents.length,
      });

      // Save raw response on job
      await ctx.runMutation(internal.eventDiscoveryJobs.saveRawResponse, {
        jobId: args.jobId,
        rawResponse: content,
      });

      return validEvents;
    } catch (error) {
      if (responseBody) throw error; // Already logged

      const durationMs = Date.now() - startTime;
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.llmLogs.create, {
        provider: "openai",
        model: "gpt-4o-mini",
        action: "crawl_extraction",
        prompt: JSON.stringify(messages).slice(0, 10000),
        response: responseBody || "No response",
        durationMs,
        status: "error",
        errorMessage: errMsg,
        marketId: args.marketId,
        discoveryJobId: args.jobId,
      });

      await ctx.runMutation(internal.marketSources.updateCrawlStatus, {
        id: args.sourceId,
        status: "error",
        error: errMsg,
      });

      throw error;
    }
  },
});
