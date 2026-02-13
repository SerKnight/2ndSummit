import { BRAND_CONTEXT } from "./brandContext";
import { buildOutputSchema, buildExclusionRules } from "./promptAssembly";

interface CrawlPromptArgs {
  pageText: string;
  pageTitle: string;
  sourceUrl: string;
  marketName: string;
  marketRegion: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  dateRangeStart: string;
  dateRangeEnd: string;
}

/**
 * Builds the OpenAI prompt for extracting events from crawled page text.
 */
export function buildCrawlExtractionPrompt(args: CrawlPromptArgs): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are an event extraction specialist for 2nd Summit, a community platform that curates experiences for people in their next chapter of life.

${BRAND_CONTEXT}

Your job is to extract structured event data from raw web page text. Follow these rules strictly:
- Only extract events that are explicitly present in the text. NEVER fabricate or infer events.
- Only include events with dates on or after ${args.dateRangeStart} and before ${args.dateRangeEnd}.
- If no events are found in the text, return an empty JSON array: []
- Extract as many qualifying events as you can find.
- Each event must have at minimum a title and some date information.

Return your findings as a valid JSON object with this structure:
{ "events": [...] }

Where each event in the array matches this schema:
${buildOutputSchema()}

${buildExclusionRules({ name: "General", pillar: "Discover" })}`;

  const userPrompt = `Extract events from this web page.

**Source URL**: ${args.sourceUrl}
**Page Title**: ${args.pageTitle}
**Market**: ${args.marketName} (${args.marketRegion}) — within ${args.radiusMiles} miles of ${args.latitude}, ${args.longitude}
**Date Window**: ${args.dateRangeStart} to ${args.dateRangeEnd}

---
PAGE CONTENT:
${args.pageText}
---

Extract all qualifying events from the above content. Return {"events": []} if no events are found.`;

  return { systemPrompt, userPrompt };
}
