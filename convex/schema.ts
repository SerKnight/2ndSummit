import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Override users table to add custom fields (keep all default auth fields)
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    role: v.optional(v.string()), // "member" | "admin"
  }).index("email", ["email"]),

  markets: defineTable({
    name: v.string(),
    regionDescription: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    radiusMiles: v.number(),
    zipCodes: v.optional(v.array(v.string())),
    zipCode: v.optional(v.string()),
    searchSources: v.optional(v.array(v.string())),
    sourcePromptContext: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_active", ["isActive"]),

  eventCategories: defineTable({
    name: v.string(),
    pillar: v.string(), // "Move" | "Discover" | "Connect"
    description: v.optional(v.string()),
    searchSubPrompt: v.optional(v.string()),
    exclusionRules: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_pillar", ["pillar"])
    .index("by_active", ["isActive"]),

  events: defineTable({
    title: v.string(),
    description: v.string(),
    briefSummary: v.optional(v.string()),
    source: v.string(), // "perplexity_discovery" | "manual"
    sourceUrl: v.optional(v.string()),
    sourceDomain: v.optional(v.string()),
    sourceExtractedAt: v.optional(v.number()),
    marketId: v.id("markets"),
    categoryId: v.optional(v.id("eventCategories")),
    pillar: v.optional(v.string()), // "Move" | "Discover" | "Connect"

    // Structured dates
    dateRaw: v.optional(v.string()),
    dateStart: v.optional(v.string()),
    dateEnd: v.optional(v.string()),
    timeStart: v.optional(v.string()),
    timeEnd: v.optional(v.string()),
    timezone: v.optional(v.string()),

    // Recurring
    isRecurring: v.optional(v.boolean()),
    recurrencePattern: v.optional(v.string()),

    // Location
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    locationCity: v.optional(v.string()),
    locationState: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isVirtual: v.optional(v.boolean()),
    virtualUrl: v.optional(v.string()),

    // Cost
    costRaw: v.optional(v.string()),
    costType: v.optional(v.string()), // "free" | "paid" | "donation" | "varies"
    costMin: v.optional(v.number()),
    costMax: v.optional(v.number()),

    // Classification / legacy
    rawData: v.optional(v.string()),
    originalPayload: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()), // "Easy" | "Moderate" | "Challenging"
    ageAppropriate: v.optional(v.boolean()),
    tags: v.array(v.string()),
    classificationConfidence: v.optional(v.number()),
    classificationNotes: v.optional(v.string()),

    // Validation
    validationStatus: v.string(), // "pending" | "validated" | "rejected" | "needs_review"
    validationConfidence: v.optional(v.number()),
    validationNotes: v.optional(v.string()),

    // Admin review
    adminReviewed: v.optional(v.boolean()),
    adminNotes: v.optional(v.string()),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),

    // Dedup
    dedupHash: v.optional(v.string()),
    isDuplicate: v.optional(v.boolean()),

    // Timestamps
    discoveredAt: v.number(),
    lastUpdatedAt: v.number(),
    discoveryJobId: v.optional(v.id("eventDiscoveryJobs")),
  })
    .index("by_market", ["marketId"])
    .index("by_validationStatus", ["validationStatus"])
    .index("by_market_validationStatus", ["marketId", "validationStatus"])
    .index("by_category", ["categoryId"])
    .index("by_pillar", ["pillar"])
    .index("by_discoveryJob", ["discoveryJobId"])
    .index("by_dedupHash", ["dedupHash"]),

  marketSources: defineTable({
    marketId: v.id("markets"),
    url: v.string(),
    name: v.optional(v.string()),
    sourceType: v.string(), // "crawl" | "api_eventbrite" | "api_meetup"
    contentSelector: v.optional(v.string()),
    isActive: v.boolean(),
    crawlFrequency: v.string(), // "daily" | "twice_weekly" | "weekly"
    lastCrawledAt: v.optional(v.number()),
    lastCrawlStatus: v.optional(v.string()), // "success" | "error" | "no_events"
    lastCrawlError: v.optional(v.string()),
    totalEventsFound: v.number(),
    lastEventsFound: v.optional(v.number()),
    consecutiveFailures: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_market", ["marketId"])
    .index("by_market_active", ["marketId", "isActive"]),

  eventDiscoveryJobs: defineTable({
    marketId: v.id("markets"),
    categoryId: v.optional(v.id("eventCategories")),
    status: v.string(), // "pending" | "searching" | "validating" | "storing" | "completed" | "failed"
    dateRangeStart: v.optional(v.string()),
    dateRangeEnd: v.optional(v.string()),
    eventsFound: v.number(),
    eventsValidated: v.optional(v.number()),
    eventsStored: v.optional(v.number()),
    promptUsed: v.optional(v.string()),
    rawResponse: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    triggeredBy: v.optional(v.id("users")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    discoveryMethod: v.optional(v.string()), // "perplexity" | "crawl"
    sourceId: v.optional(v.id("marketSources")),
  })
    .index("by_market", ["marketId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),

  llmLogs: defineTable({
    provider: v.string(), // "perplexity" | "openai"
    model: v.string(),
    action: v.string(), // "discovery" | "validation" | "category_prompt" | "market_sources"
    prompt: v.string(),
    response: v.string(),
    durationMs: v.number(),
    tokensUsed: v.optional(v.number()),
    status: v.string(), // "success" | "error"
    errorMessage: v.optional(v.string()),
    marketId: v.optional(v.id("markets")),
    discoveryJobId: v.optional(v.id("eventDiscoveryJobs")),
    eventId: v.optional(v.id("events")),
    createdAt: v.number(),
  })
    .index("by_provider", ["provider"])
    .index("by_action", ["action"])
    .index("by_createdAt", ["createdAt"])
    .index("by_discoveryJob", ["discoveryJobId"]),
});
