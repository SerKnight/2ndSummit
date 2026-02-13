"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { BRAND_CONTEXT } from "../lib/brandContext";

export const run = internalAction({
  args: {
    categoryId: v.id("eventCategories"),
  },
  handler: async (ctx, args): Promise<void> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    // Get category details
    const category = await ctx.runQuery(internal.queries.getEventCategory, {
      id: args.categoryId,
    });
    if (!category) throw new Error("Category not found");

    const messages = [
      {
        role: "system",
        content: `You are helping build search prompts for an event discovery platform. Generate an optimized search sub-prompt that will be used to find events in a specific category.

${BRAND_CONTEXT}

The sub-prompt should be 3-6 sentences that:
1. Describe what types of events to search for in this category
2. Include specific keywords and event types that would appear on local event listing sites
3. Mention the type of venues or organizations that typically host these events
4. Note any seasonal or recurring patterns
5. Align with the brand voice — warm, inclusive, approachable

Return ONLY the sub-prompt text, no JSON wrapping or quotes.`,
      },
      {
        role: "user",
        content: `Generate a search sub-prompt for the category "${category.name}" under the "${category.pillar}" pillar.${category.description ? ` Category description: ${category.description}` : ""}`,
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
            temperature: 0.7,
            max_tokens: 500,
          }),
        }
      );

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const err = await response.text();
        await ctx.runMutation(internal.llmLogs.create, {
          provider: "openai",
          model: "gpt-4o-mini",
          action: "category_prompt",
          prompt: JSON.stringify(messages),
          response: err,
          durationMs,
          status: "error",
          errorMessage: `OpenAI API error ${response.status}: ${err}`,
        });
        throw new Error(`OpenAI API error: ${err}`);
      }

      const data = await response.json();
      const responseBody = JSON.stringify(data);
      const searchSubPrompt = data.choices[0].message.content.trim();
      const tokensUsed = data.usage?.total_tokens;

      // Log successful call
      await ctx.runMutation(internal.llmLogs.create, {
        provider: "openai",
        model: "gpt-4o-mini",
        action: "category_prompt",
        prompt: JSON.stringify(messages),
        response: responseBody,
        durationMs,
        tokensUsed,
        status: "success",
      });

      // Update category with generated prompt
      await ctx.runMutation(internal.eventCategories.updateSearchSubPrompt, {
        id: args.categoryId,
        searchSubPrompt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `Failed to generate prompt for category ${args.categoryId}:`,
        message
      );
    }
  },
});
