/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_classifyEvents from "../actions/classifyEvents.js";
import type * as actions_discoverEvents from "../actions/discoverEvents.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as classify from "../classify.js";
import type * as discoveryRuns from "../discoveryRuns.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as llmLogs from "../llmLogs.js";
import type * as markets from "../markets.js";
import type * as promptTemplates from "../promptTemplates.js";
import type * as queries from "../queries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/classifyEvents": typeof actions_classifyEvents;
  "actions/discoverEvents": typeof actions_discoverEvents;
  auth: typeof auth;
  categories: typeof categories;
  classify: typeof classify;
  discoveryRuns: typeof discoveryRuns;
  events: typeof events;
  http: typeof http;
  llmLogs: typeof llmLogs;
  markets: typeof markets;
  promptTemplates: typeof promptTemplates;
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
