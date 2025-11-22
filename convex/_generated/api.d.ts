/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_notifications from "../actions/notifications.js";
import type * as actions_scheduled_events from "../actions/scheduled_events.js";
import type * as actions_sms from "../actions/sms.js";
import type * as actions_subscriptions from "../actions/subscriptions.js";
import type * as actions_transactions from "../actions/transactions.js";
import type * as client from "../client.js";
import type * as crons from "../crons.js";
import type * as features_airtime_transactions from "../features/airtime_transactions.js";
import type * as features_analytics from "../features/analytics.js";
import type * as features_blacklist from "../features/blacklist.js";
import type * as features_bundles from "../features/bundles.js";
import type * as features_cooldown from "../features/cooldown.js";
import type * as features_migration from "../features/migration.js";
import type * as features_mpesaMessages from "../features/mpesaMessages.js";
import type * as features_mpesa_transactions from "../features/mpesa_transactions.js";
import type * as features_notifications from "../features/notifications.js";
import type * as features_otps from "../features/otps.js";
import type * as features_promo_codes from "../features/promo_codes.js";
import type * as features_scheduled_events from "../features/scheduled_events.js";
import type * as features_sms from "../features/sms.js";
import type * as features_stores from "../features/stores.js";
import type * as features_subscription_price from "../features/subscription_price.js";
import type * as features_transactions from "../features/transactions.js";
import type * as features_userSenderRelations from "../features/userSenderRelations.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as http_handlers from "../http_handlers.js";
import type * as m_pesa_initializer from "../m_pesa/initializer.js";
import type * as m_pesa_types from "../m_pesa/types.js";
import type * as m_pesa_utils from "../m_pesa/utils.js";
import type * as migrations from "../migrations.js";
import type * as mobile_actions_update_user_data from "../mobile/actions/update_user_data.js";
import type * as mobile_http_handlers from "../mobile/http/handlers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/notifications": typeof actions_notifications;
  "actions/scheduled_events": typeof actions_scheduled_events;
  "actions/sms": typeof actions_sms;
  "actions/subscriptions": typeof actions_subscriptions;
  "actions/transactions": typeof actions_transactions;
  client: typeof client;
  crons: typeof crons;
  "features/airtime_transactions": typeof features_airtime_transactions;
  "features/analytics": typeof features_analytics;
  "features/blacklist": typeof features_blacklist;
  "features/bundles": typeof features_bundles;
  "features/cooldown": typeof features_cooldown;
  "features/migration": typeof features_migration;
  "features/mpesaMessages": typeof features_mpesaMessages;
  "features/mpesa_transactions": typeof features_mpesa_transactions;
  "features/notifications": typeof features_notifications;
  "features/otps": typeof features_otps;
  "features/promo_codes": typeof features_promo_codes;
  "features/scheduled_events": typeof features_scheduled_events;
  "features/sms": typeof features_sms;
  "features/stores": typeof features_stores;
  "features/subscription_price": typeof features_subscription_price;
  "features/transactions": typeof features_transactions;
  "features/userSenderRelations": typeof features_userSenderRelations;
  functions: typeof functions;
  http: typeof http;
  http_handlers: typeof http_handlers;
  "m_pesa/initializer": typeof m_pesa_initializer;
  "m_pesa/types": typeof m_pesa_types;
  "m_pesa/utils": typeof m_pesa_utils;
  migrations: typeof migrations;
  "mobile/actions/update_user_data": typeof mobile_actions_update_user_data;
  "mobile/http/handlers": typeof mobile_http_handlers;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
    public: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; migrationNames?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      runMigration: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
