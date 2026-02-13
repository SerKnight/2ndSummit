# 2nd Summit MVP

A community platform admin tool that aggregates, curates, and recommends local experiences (events, activities, classes) for active adults 60+. Built around three pillars: **Move, Discover, Connect**.

This MVP provides an admin interface for discovering events via AI-powered web search (Perplexity), classifying them with OpenAI, and curating them for the 2nd Summit community.

## Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account
- [Perplexity API key](https://docs.perplexity.ai/) (for event discovery)
- [OpenAI API key](https://platform.openai.com/) (for event classification)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will:
- Prompt you to log in to Convex (or create an account)
- Create a new Convex project
- Deploy the schema and functions
- Generate TypeScript types
- Start the Convex dev server

### 3. Set environment variables

Convex environment variables (for backend functions):

```bash
npx convex env set PERPLEXITY_API_KEY your-perplexity-key
npx convex env set OPENAI_API_KEY your-openai-key
```

Local environment (auto-configured by `npx convex dev`):
- `.env.local` will be created with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`

### 4. Start the app

```bash
npm run dev
```

This runs both the Next.js frontend and Convex backend in parallel.

### 5. First-time setup

1. Open http://localhost:3000
2. Sign up for an account (email + password)
3. Go to **Categories** and click **Seed Defaults** to populate the 21 default categories
4. Go to **Markets** and create your first market (e.g., "Denver Metro", lat 39.7392, lng -104.9903, radius 15)
5. Go to **Discovery**, select your market, and click **Run Discovery**
6. Watch events appear in real-time as they are discovered
7. Go to **Events** to classify raw events, then approve/reject

## Architecture

- **Frontend**: Next.js (App Router) with Tailwind CSS + shadcn/ui
- **Backend**: Convex (database, server functions, real-time subscriptions, auth)
- **Auth**: Convex Auth with email/password (Password provider)
- **Event Discovery**: Perplexity API (sonar model) for web search
- **Event Classification**: OpenAI API (gpt-4o-mini) for structured classification

### Data Flow

1. Admin creates a **Market** (geographic area)
2. Admin triggers **Discovery** — Perplexity searches for events in batches by category
3. Raw events appear in the **Events** table in real-time
4. Admin triggers **Classification** — OpenAI classifies events by pillar/category/difficulty
5. Admin reviews and **approves/rejects** events

### Key Files

```
convex/
  schema.ts              # Data model (markets, categories, events, discoveryRuns)
  auth.ts                # Auth config (email/password)
  markets.ts             # Market CRUD
  categories.ts          # Category CRUD + seeding
  events.ts              # Event CRUD + classification updates
  discoveryRuns.ts       # Discovery run management
  classify.ts            # Classification trigger
  queries.ts             # Internal queries for actions
  actions/
    discoverEvents.ts    # Perplexity API integration
    classifyEvents.ts    # OpenAI classification
app/
  (dashboard)/           # Authenticated admin pages
    page.tsx             # Dashboard
    markets/page.tsx     # Market management
    events/page.tsx      # Event management
    categories/page.tsx  # Category management
    discovery/page.tsx   # Discovery runs
  auth/page.tsx          # Sign in / sign up
```
