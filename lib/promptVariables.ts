export const PROMPT_VARIABLES = [
  {
    name: "categoryNames",
    description: "Comma-separated list of category names for this batch",
    example: "Hiking, Yoga/Stretching, Walking Groups",
  },
  {
    name: "radiusMiles",
    description: "Search radius in miles",
    example: "25",
  },
  {
    name: "marketName",
    description: "Name of the market",
    example: "Denver Metro",
  },
  {
    name: "regionDescription",
    description: "Region description of the market",
    example: "Front Range Colorado",
  },
  {
    name: "latitude",
    description: "Market center latitude",
    example: "39.7392",
  },
  {
    name: "longitude",
    description: "Market center longitude",
    example: "-104.9903",
  },
  {
    name: "timeRange",
    description: "Time range for the search (e.g. 'next 90 days')",
    example: "next 90 days",
  },
  {
    name: "todaysDate",
    description: "Today's date in YYYY-MM-DD format",
    example: "2026-02-12",
  },
] as const;

export function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => vars[key] ?? match
  );
}

export const DEFAULT_SYSTEM_PROMPT =
  "You are a local events researcher. Find specific, upcoming future events, classes, and activities suitable for active adults aged 60+. Only include events that have NOT yet occurred — every event must have a date on or after today's date. Never include past events. Always return your findings as a JSON array.";

export const DEFAULT_USER_PROMPT_TEMPLATE = `Today's date is {{todaysDate}}. Search for FUTURE {{categoryNames}} events and activities for adults within {{radiusMiles}} miles of {{marketName}} ({{regionDescription}}, coordinates: {{latitude}}, {{longitude}}).

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
