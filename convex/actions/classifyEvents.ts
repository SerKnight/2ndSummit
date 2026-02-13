"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

interface CategoryRecord {
  _id: string;
  name: string;
  pillar: string;
}

interface EventRecord {
  _id: string;
  title: string;
  description: string;
  marketId: string;
  status: string;
  rawData?: string;
  locationName?: string;
  locationAddress?: string;
  date?: string;
  price?: string;
}

export const run = internalAction({
  args: {
    marketId: v.optional(v.id("markets")),
  },
  handler: async (ctx, args): Promise<{ classified: number; total: number }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    // Get uncategorized events (optionally filtered by market)
    const events = (await ctx.runQuery(internal.queries.getUncategorizedEvents, {
      marketId: args.marketId,
    })) as EventRecord[];

    // Get categories for classification context
    const categories = (await ctx.runQuery(
      internal.queries.getActiveCategories,
      {}
    )) as CategoryRecord[];
    const categoryList = categories
      .map((c: CategoryRecord) => `${c.name} (${c.pillar})`)
      .join("\n");
    const categoryMap = new Map(
      categories.map((c: CategoryRecord) => [c.name, c])
    );

    let classified = 0;

    for (const event of events) {
      try {
        const messages = [
          {
            role: "system",
            content: `You are classifying events for a platform serving active adults 60+.

Available categories (with their pillar):
${categoryList}

Classify each event into the best matching category.`,
          },
          {
            role: "user",
            content: `Classify this event:
Title: ${event.title}
Description: ${event.description}
Raw source data: ${event.rawData || "N/A"}
Location: ${event.locationName || "N/A"} - ${event.locationAddress || "N/A"}
Date: ${event.date || "N/A"}
Price: ${event.price || "N/A"}`,
          },
        ];

        const requestBody = {
          model: "gpt-4o-mini",
          messages,
          temperature: 0.1,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "event_classification",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  categoryName: {
                    type: "string",
                    description:
                      "Best matching category name from the available list",
                  },
                  pillar: {
                    type: "string",
                    enum: ["Move", "Discover", "Connect"],
                  },
                  difficultyLevel: {
                    type: "string",
                    enum: ["Easy", "Moderate", "Challenging"],
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 descriptive tags",
                  },
                  ageAppropriate: {
                    type: "boolean",
                    description: "Is this appropriate for adults 60+",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score 0.0 to 1.0",
                  },
                  notes: {
                    type: "string",
                    description: "Brief explanation of classification",
                  },
                },
                required: [
                  "categoryName",
                  "pillar",
                  "difficultyLevel",
                  "tags",
                  "ageAppropriate",
                  "confidence",
                  "notes",
                ],
                additionalProperties: false,
              },
            },
          },
        };

        const startTime = Date.now();

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
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

          await ctx.runMutation(internal.llmLogs.create, {
            provider: "openai",
            model: "gpt-4o-mini",
            action: "classification",
            prompt: JSON.stringify(messages),
            response: err,
            durationMs,
            status: "error",
            errorMessage: `OpenAI API error ${response.status}: ${err}`,
            marketId: args.marketId,
            eventId: event._id as any,
          });

          console.error(`OpenAI error for event ${event._id}: ${err}`);
          continue;
        }

        const data = await response.json();
        const responseBody = JSON.stringify(data);
        const message = data.choices[0].message;

        // Extract token usage if available
        const tokensUsed = data.usage?.total_tokens;

        if (message.refusal) {
          await ctx.runMutation(internal.llmLogs.create, {
            provider: "openai",
            model: "gpt-4o-mini",
            action: "classification",
            prompt: JSON.stringify(messages),
            response: responseBody,
            durationMs,
            tokensUsed,
            status: "error",
            errorMessage: `Refused: ${message.refusal}`,
            marketId: args.marketId,
            eventId: event._id as any,
          });

          console.error(
            `OpenAI refused to classify event ${event._id}: ${message.refusal}`
          );
          continue;
        }

        // Log successful classification call
        await ctx.runMutation(internal.llmLogs.create, {
          provider: "openai",
          model: "gpt-4o-mini",
          action: "classification",
          prompt: JSON.stringify(messages),
          response: responseBody,
          durationMs,
          tokensUsed,
          status: "success",
          marketId: args.marketId,
          eventId: event._id as any,
        });

        const classification = JSON.parse(message.content);

        // Look up category ID
        const matchedCategory = categoryMap.get(classification.categoryName);

        await ctx.runMutation(internal.events.updateClassification, {
          id: event._id as any,
          categoryId: matchedCategory ? (matchedCategory._id as any) : undefined,
          pillar: classification.pillar,
          difficultyLevel: classification.difficultyLevel,
          tags: classification.tags,
          ageAppropriate: classification.ageAppropriate,
          classificationConfidence: classification.confidence,
          classificationNotes: classification.notes,
          preserveStatus: event.status === "approved",
        });

        classified++;

        // Rate limit delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to classify event ${event._id}:`, error);
      }
    }

    return { classified, total: events.length };
  },
});
