/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_discoverEvents from "../actions/discoverEvents.js";
import type * as actions_generateCategoryPrompt from "../actions/generateCategoryPrompt.js";
import type * as actions_generateMarketSources from "../actions/generateMarketSources.js";
import type * as actions_runEventDiscovery from "../actions/runEventDiscovery.js";
import type * as actions_validateEvents from "../actions/validateEvents.js";
import type * as auth from "../auth.js";
import type * as eventCategories from "../eventCategories.js";
import type * as eventDiscoveryJobs from "../eventDiscoveryJobs.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as lib_brandContext from "../lib/brandContext.js";
import type * as lib_dedup from "../lib/dedup.js";
import type * as lib_promptAssembly from "../lib/promptAssembly.js";
import type * as llmLogs from "../llmLogs.js";
import type * as markets from "../markets.js";
import type * as queries from "../queries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/discoverEvents": typeof actions_discoverEvents;
  "actions/generateCategoryPrompt": typeof actions_generateCategoryPrompt;
  "actions/generateMarketSources": typeof actions_generateMarketSources;
  "actions/runEventDiscovery": typeof actions_runEventDiscovery;
  "actions/validateEvents": typeof actions_validateEvents;
  auth: typeof auth;
  eventCategories: typeof eventCategories;
  eventDiscoveryJobs: typeof eventDiscoveryJobs;
  events: typeof events;
  http: typeof http;
  "lib/brandContext": typeof lib_brandContext;
  "lib/dedup": typeof lib_dedup;
  "lib/promptAssembly": typeof lib_promptAssembly;
  llmLogs: typeof llmLogs;
  markets: typeof markets;
  queries: typeof queries;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
