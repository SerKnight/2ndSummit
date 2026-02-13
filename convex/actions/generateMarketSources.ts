"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const run = internalAction({
  args: {
    marketId: v.id("markets"),
  },
  handler: async (ctx, args): Promise<void> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    // Get market details
    const market = await ctx.runQuery(internal.queries.getMarket, {
      id: args.marketId,
    });
    if (!market) throw new Error("Market not found");

    const messages = [
      {
        role: "system",
        content: `You are a research assistant helping identify the best local event sources for a community platform. You need to find websites, organizations, and platforms that list local events in a specific geographic area.

Focus on sources that list:
- Community events, group activities, classes, workshops
- Outdoor recreation and fitness activities
- Cultural events, museum exhibits, lectures
- Social gatherings, dining events, meetups
- Arts and music performances
- Volunteer opportunities

Return your response as JSON with this exact structure:
{
  "sources": ["url1", "url2", ...],
  "context": "A 2-3 paragraph description of this market's event ecosystem, notable venues, seasonal patterns, and any unique characteristics."
}

Include 10-15 sources. Prefer local/regional event listing sites, community calendars, rec center sites, and local media event pages over generic national platforms.`,
      },
      {
        role: "user",
        content: `Research the best event sources for ${market.name} (${market.regionDescription}).${market.zipCode ? ` Primary zip code: ${market.zipCode}.` : ""} Coordinates: ${market.latitude}, ${market.longitude}. Radius: ${market.radiusMiles} miles.

Find the top local event sources — websites, community calendars, parks & rec departments, local media event listings, meetup groups, and cultural organizations that regularly list events in this area.`,
      },
    ];

    const startTime = Date.now();

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
            temperature: 0.5,
            max_tokens: 1500,
            response_format: { type: "json_object" },
          }),
        }
      );

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const err = await response.text();
        await ctx.runMutation(internal.llmLogs.create, {
          provider: "openai",
          model: "gpt-4o-mini",
          action: "market_sources",
          prompt: JSON.stringify(messages),
          response: err,
          durationMs,
          status: "error",
          errorMessage: `OpenAI API error ${response.status}: ${err}`,
          marketId: args.marketId,
        });
        throw new Error(`OpenAI API error: ${err}`);
      }

      const data = await response.json();
      const responseBody = JSON.stringify(data);
      const content = JSON.parse(data.choices[0].message.content);
      const tokensUsed = data.usage?.total_tokens;

      // Log successful call
      await ctx.runMutation(internal.llmLogs.create, {
        provider: "openai",
        model: "gpt-4o-mini",
        action: "market_sources",
        prompt: JSON.stringify(messages),
        response: responseBody,
        durationMs,
        tokensUsed,
        status: "success",
        marketId: args.marketId,
      });

      // Update market with generated sources
      const sources = Array.isArray(content.sources) ? content.sources : [];
      const context =
        typeof content.context === "string" ? content.context : "";

      await ctx.runMutation(internal.markets.updateSources, {
        id: args.marketId,
        searchSources: sources,
        sourcePromptContext: context,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to generate sources for market ${args.marketId}:`,
        message
      );
    }
  },
});
