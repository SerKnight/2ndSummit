import { BRAND_CONTEXT } from "./brandContext";

interface MarketConfig {
  name: string;
  regionDescription: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  searchSources?: string[];
  sourcePromptContext?: string;
}

interface CategoryConfig {
  name: string;
  pillar: string;
  searchSubPrompt?: string;
  exclusionRules?: string;
}

interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/**
 * Assembles a complete search prompt from composable parts:
 * brand context + market sources + category sub-prompt + date window + output schema + exclusion rules
 */
export function assembleSearchPrompt(
  market: MarketConfig,
  category: CategoryConfig,
  dateRange: DateRange
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(market, category, dateRange);
  return { systemPrompt, userPrompt };
}

function buildSystemPrompt(): string {
  return `You are a local events researcher for 2nd Summit, a community platform that curates experiences for people in their next chapter of life.

${BRAND_CONTEXT}

Your job is to find real, specific, upcoming events. Every event MUST have a date on or after today. Never fabricate events — only return events you can verify from real sources. Always return your findings as a valid JSON array matching the output schema provided.`;
}

function buildUserPrompt(
  market: MarketConfig,
  category: CategoryConfig,
  dateRange: DateRange
): string {
  const parts: string[] = [];

  // Date context
  parts.push(`Today's date is ${dateRange.start}. Only include events happening between ${dateRange.start} and ${dateRange.end}.`);

  // Market context
  parts.push(`\n## Search Area\nSearch for events within ${market.radiusMiles} miles of ${market.name} (${market.regionDescription}, coordinates: ${market.latitude}, ${market.longitude}).`);

  // Market sources
  if (market.searchSources && market.searchSources.length > 0) {
    parts.push(`\n## Recommended Sources\nPrioritize these local event sources:\n${market.searchSources.map((s) => `- ${s}`).join("\n")}`);
  }
  if (market.sourcePromptContext) {
    parts.push(`\n## Local Context\n${market.sourcePromptContext}`);
  }

  // Category sub-prompt
  parts.push(`\n## Category: ${category.name} (${category.pillar} pillar)`);
  if (category.searchSubPrompt) {
    parts.push(category.searchSubPrompt);
  } else {
    parts.push(`Search for ${category.name} events and activities suitable for active adults in the ${market.name} area.`);
  }

  // Exclusion rules
  const exclusions = buildExclusionRules(category);
  if (exclusions) {
    parts.push(`\n## Exclusion Rules\n${exclusions}`);
  }

  // Output schema
  parts.push(`\n## Output Format\nReturn results as a JSON array with this exact structure:\n${buildOutputSchema()}`);

  parts.push(`\nBe specific — include real event names, real venues, and real dates. Aim for 5-10 high-quality results. If you find fewer than 3 events, note that.`);

  return parts.join("\n");
}

/**
 * Builds exclusion rules string for a category
 */
export function buildExclusionRules(category: CategoryConfig): string {
  const rules: string[] = [];

  // Category-specific exclusion rules
  if (category.exclusionRules) {
    rules.push(category.exclusionRules);
  }

  // Universal exclusion rules
  rules.push("Do NOT include events that:");
  rules.push("- Have already occurred (dates before today)");
  rules.push("- Are specifically marketed as \"senior\" or \"elderly\" activities");
  rules.push("- Require advanced athletic ability unless clearly noted");
  rules.push("- Are primarily children's or youth events");
  rules.push("- Are multi-day conferences or trade shows (unless a single session is relevant)");

  return rules.join("\n");
}

/**
 * Returns the JSON schema string that instructs the LLM how to format event data
 */
export function buildOutputSchema(): string {
  return `[
  {
    "title": "Event Name",
    "description": "2-3 sentence description of the event",
    "briefSummary": "One-line summary (max 120 chars)",
    "dateRaw": "Original date text from source",
    "dateStart": "YYYY-MM-DD",
    "dateEnd": "YYYY-MM-DD or null if single-day",
    "timeStart": "HH:MM AM/PM or null",
    "timeEnd": "HH:MM AM/PM or null",
    "isRecurring": false,
    "recurrencePattern": "e.g. 'Every Tuesday' or null",
    "locationName": "Venue Name",
    "locationAddress": "Full street address",
    "locationCity": "City",
    "locationState": "State abbreviation",
    "isVirtual": false,
    "virtualUrl": "URL if virtual, null otherwise",
    "costRaw": "Original price text (e.g. 'Free', '$25', '$10-$30')",
    "costType": "free | paid | donation | varies",
    "costMin": 0,
    "costMax": 0,
    "sourceUrl": "https://... direct link to event page",
    "tags": ["tag1", "tag2", "tag3"]
  }
]`;
}
