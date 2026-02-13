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
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  categories: defineTable({
    name: v.string(),
    pillar: v.string(), // "Move" | "Discover" | "Connect"
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_pillar", ["pillar"])
    .index("by_active", ["isActive"]),

  events: defineTable({
    title: v.string(),
    description: v.string(),
    source: v.string(), // "perplexity_discovery" | "manual"
    sourceUrl: v.optional(v.string()),
    marketId: v.id("markets"),
    categoryId: v.optional(v.id("categories")),
    pillar: v.optional(v.string()), // "Move" | "Discover" | "Connect"
    status: v.string(), // "raw" | "classified" | "approved" | "rejected" | "archived"
    rawData: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationAddress: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    price: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()), // "Easy" | "Moderate" | "Challenging"
    ageAppropriate: v.optional(v.boolean()),
    tags: v.array(v.string()),
    classificationConfidence: v.optional(v.number()),
    classificationNotes: v.optional(v.string()),
    discoveredAt: v.number(),
    lastUpdatedAt: v.number(),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    discoveryRunId: v.optional(v.id("discoveryRuns")),
  })
    .index("by_market", ["marketId"])
    .index("by_status", ["status"])
    .index("by_market_status", ["marketId", "status"])
    .index("by_category", ["categoryId"])
    .index("by_pillar", ["pillar"])
    .index("by_discoveryRun", ["discoveryRunId"]),

  discoveryRuns: defineTable({
    marketId: v.id("markets"),
    status: v.string(), // "pending" | "running" | "completed" | "failed"
    categoriesSearched: v.array(v.string()),
    eventsFound: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    rawResponses: v.optional(v.array(v.string())),
    // Run configuration snapshot
    config: v.optional(v.object({
      categoryIds: v.array(v.id("categories")),
      radiusMiles: v.number(),
      timeRangeDays: v.number(),
      batchSize: v.number(),
      temperature: v.number(),
      searchRecencyFilter: v.string(),
      model: v.string(),
      promptTemplateId: v.optional(v.id("promptTemplates")),
      systemPromptUsed: v.string(),
      userPromptTemplateUsed: v.string(),
    })),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_market", ["marketId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),

  promptTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.string(),
    userPromptTemplate: v.string(),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_default", ["isDefault"]),

  llmLogs: defineTable({
    provider: v.string(), // "perplexity" | "openai"
    model: v.string(), // "sonar" | "gpt-4o-mini"
    action: v.string(), // "discovery" | "classification"
    prompt: v.string(), // Full prompt sent (system + user messages as JSON)
    response: v.string(), // Full raw response body
    durationMs: v.number(),
    tokensUsed: v.optional(v.number()),
    status: v.string(), // "success" | "error"
    errorMessage: v.optional(v.string()),
    marketId: v.optional(v.id("markets")),
    discoveryRunId: v.optional(v.id("discoveryRuns")),
    eventId: v.optional(v.id("events")),
    createdAt: v.number(),
  })
    .index("by_provider", ["provider"])
    .index("by_action", ["action"])
    .index("by_createdAt", ["createdAt"])
    .index("by_discoveryRun", ["discoveryRunId"]),
});
