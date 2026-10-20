/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_lineupMetadata from "../lib/lineupMetadata.js";
import type * as lib_preferences from "../lib/preferences.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lineups from "../lineups.js";
import type * as mapRoster from "../mapRoster.js";
import type * as maps from "../maps.js";
import type * as migration from "../migration.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/lineupMetadata": typeof lib_lineupMetadata;
  "lib/preferences": typeof lib_preferences;
  "lib/validators": typeof lib_validators;
  lineups: typeof lineups;
  mapRoster: typeof mapRoster;
  maps: typeof maps;
  migration: typeof migration;
  uploads: typeof uploads;
  users: typeof users;
  viewer: typeof viewer;
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
