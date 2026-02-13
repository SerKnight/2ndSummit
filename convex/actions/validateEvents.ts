"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { BRAND_CONTEXT } from "../lib/brandContext";
import { VALIDATION_DELAY_MS } from "../lib/rateLimits";

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

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  corrections: Record<string, unknown>;
  recommendation: "accept" | "reject" | "needs_review";
  correctedEvent: RawEventCandidate;
}

/**
 * Layer 2 — Validation action using OpenAI.
 * Takes an array of raw event candidates and validates each one.
 * Returns validation results with corrections applied.
 */
export const run = internalAction({
  args: {
    jobId: v.id("eventDiscoveryJobs"),
    marketId: v.id("markets"),
    categoryName: v.string(),
    pillar: v.string(),
    events: v.string(), // JSON-stringified array of RawEventCandidate
    marketName: v.optional(v.string()),
    marketRegion: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ValidationResult[]> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const candidates: RawEventCandidate[] = JSON.parse(args.events);
    const results: ValidationResult[] = [];

    for (const candidate of candidates) {
      try {
        const marketContext = args.marketName
          ? `\n\n## Target Market\nThis event is being validated for the **${args.marketName}** market (${args.marketRegion ?? ""}). Events should be located in or near this market area. Do NOT reject events simply because they are not in Denver — 2nd Summit operates in multiple markets. The "Location: Denver, CO" in the brand context refers to company headquarters, not the only valid event location.`
          : "";

        const messages = [
          {
            role: "system",
            content: `You are validating event data for 2nd Summit, a community platform.

${BRAND_CONTEXT}${marketContext}

Today's date is ${new Date().toISOString().split("T")[0]}. Use this as your reference for determining whether dates are in the past or future.

Validate the event data and return a JSON object with:
{
  "isValid": boolean,
  "confidence": number (0.0-1.0),
  "issues": ["list of issues found"],
  "corrections": {"field": "corrected_value"},
  "recommendation": "accept" | "reject" | "needs_review"
}

Check for:
1. Date validity — are dates properly formatted and in the future (on or after today's date)?
2. Location completeness — is there enough location info?
3. Cost parsing — can the cost info be structured?
4. URL validity — does the source URL look legitimate?
5. Content quality — is the description meaningful and not generic?
6. Brand alignment — does this fit 2nd Summit's audience (active adults, not seniors/elderly)?
7. Category relevance — does the event match "${args.categoryName}" in the "${args.pillar}" pillar?
8. Location relevance — is the event located in or near the ${args.marketName ?? "target"} market area?

Apply corrections where possible (e.g., parse "Free" into costType: "free", format dates properly).
Recommend "reject" for clearly invalid events, "needs_review" for uncertain ones.`,
          },
          {
            role: "user",
            content: `Validate this event:
${JSON.stringify(candidate, null, 2)}`,
          },
        ];

        const startTime = Date.now();

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
              max_tokens: 800,
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
            action: "validation",
            prompt: JSON.stringify(messages),
            response: err,
            durationMs,
            status: "error",
            errorMessage: `OpenAI API error ${response.status}: ${err}`,
            marketId: args.marketId,
            discoveryJobId: args.jobId,
          });

          // On API error, pass through as needs_review
          results.push({
            isValid: true,
            confidence: 0.5,
            issues: ["Validation API error — needs manual review"],
            corrections: {},
            recommendation: "needs_review",
            correctedEvent: candidate,
          });
          continue;
        }

        const data = await response.json();
        const responseBody = JSON.stringify(data);
        const validation = JSON.parse(data.choices[0].message.content);
        const tokensUsed = data.usage?.total_tokens;

        await ctx.runMutation(internal.llmLogs.create, {
          provider: "openai",
          model: "gpt-4o-mini",
          action: "validation",
          prompt: JSON.stringify(messages),
          response: responseBody,
          durationMs,
          tokensUsed,
          status: "success",
          marketId: args.marketId,
          discoveryJobId: args.jobId,
        });

        // Apply corrections to the event
        const correctedEvent = {
          ...candidate,
          ...(validation.corrections || {}),
        };

        results.push({
          isValid: validation.isValid ?? true,
          confidence: validation.confidence ?? 0.5,
          issues: validation.issues ?? [],
          corrections: validation.corrections ?? {},
          recommendation: validation.recommendation ?? "needs_review",
          correctedEvent,
        });

        // Rate limit delay
        await new Promise((resolve) => setTimeout(resolve, VALIDATION_DELAY_MS));
      } catch (error) {
        console.error(
          `Failed to validate event "${candidate.title}":`,
          error instanceof Error ? error.message : error
        );
        // Pass through on error
        results.push({
          isValid: true,
          confidence: 0.3,
          issues: ["Validation failed — needs manual review"],
          corrections: {},
          recommendation: "needs_review",
          correctedEvent: candidate,
        });
      }
    }

    return results;
  },
});
