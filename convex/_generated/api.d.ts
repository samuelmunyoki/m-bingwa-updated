/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_email from "../actions/email.js";
import type * as actions_fcm from "../actions/fcm.js";
import type * as actions_notifications from "../actions/notifications.js";
import type * as actions_phoneVerification from "../actions/phoneVerification.js";
import type * as actions_scheduled_events from "../actions/scheduled_events.js";
import type * as actions_sms from "../actions/sms.js";
import type * as actions_subscriptions from "../actions/subscriptions.js";
import type * as actions_transactions from "../actions/transactions.js";
import type * as client from "../client.js";
import type * as crons from "../crons.js";
import type * as features_airtime_transactions from "../features/airtime_transactions.js";
import type * as features_analytics from "../features/analytics.js";
import type * as features_appConfig from "../features/appConfig.js";
import type * as features_appLogs from "../features/appLogs.js";
import type * as features_autoTopup from "../features/autoTopup.js";
import type * as features_balanceRequests from "../features/balanceRequests.js";
import type * as features_blacklist from "../features/blacklist.js";
import type * as features_bridge from "../features/bridge.js";
import type * as features_bundles from "../features/bundles.js";
import type * as features_cooldown from "../features/cooldown.js";
import type * as features_emailTokens from "../features/emailTokens.js";
import type * as features_messageDailyStats from "../features/messageDailyStats.js";
import type * as features_migration from "../features/migration.js";
import type * as features_mpesaMessages from "../features/mpesaMessages.js";
import type * as features_mpesa_transactions from "../features/mpesa_transactions.js";
import type * as features_notifications from "../features/notifications.js";
import type * as features_onlineBridge from "../features/onlineBridge.js";
import type * as features_otps from "../features/otps.js";
import type * as features_phoneProfiles from "../features/phoneProfiles.js";
import type * as features_promo_codes from "../features/promo_codes.js";
import type * as features_retryConfigs from "../features/retryConfigs.js";
import type * as features_revenue from "../features/revenue.js";
import type * as features_scheduled_events from "../features/scheduled_events.js";
import type * as features_serverPatternOffers from "../features/serverPatternOffers.js";
import type * as features_serviceStatus from "../features/serviceStatus.js";
import type * as features_sms from "../features/sms.js";
import type * as features_statistics from "../features/statistics.js";
import type * as features_stores from "../features/stores.js";
import type * as features_subscription_price from "../features/subscription_price.js";
import type * as features_totalCommission from "../features/totalCommission.js";
import type * as features_transactions from "../features/transactions.js";
import type * as features_userModeSettings from "../features/userModeSettings.js";
import type * as features_userSenderRelations from "../features/userSenderRelations.js";
import type * as features_ussdCodes from "../features/ussdCodes.js";
import type * as features_ussdHistory from "../features/ussdHistory.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as http_handlers from "../http_handlers.js";
import type * as internalAdmin from "../internalAdmin.js";
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

declare const fullApi: ApiFromModules<{
  "actions/email": typeof actions_email;
  "actions/fcm": typeof actions_fcm;
  "actions/notifications": typeof actions_notifications;
  "actions/phoneVerification": typeof actions_phoneVerification;
  "actions/scheduled_events": typeof actions_scheduled_events;
  "actions/sms": typeof actions_sms;
  "actions/subscriptions": typeof actions_subscriptions;
  "actions/transactions": typeof actions_transactions;
  client: typeof client;
  crons: typeof crons;
  "features/airtime_transactions": typeof features_airtime_transactions;
  "features/analytics": typeof features_analytics;
  "features/appConfig": typeof features_appConfig;
  "features/appLogs": typeof features_appLogs;
  "features/autoTopup": typeof features_autoTopup;
  "features/balanceRequests": typeof features_balanceRequests;
  "features/blacklist": typeof features_blacklist;
  "features/bridge": typeof features_bridge;
  "features/bundles": typeof features_bundles;
  "features/cooldown": typeof features_cooldown;
  "features/emailTokens": typeof features_emailTokens;
  "features/messageDailyStats": typeof features_messageDailyStats;
  "features/migration": typeof features_migration;
  "features/mpesaMessages": typeof features_mpesaMessages;
  "features/mpesa_transactions": typeof features_mpesa_transactions;
  "features/notifications": typeof features_notifications;
  "features/onlineBridge": typeof features_onlineBridge;
  "features/otps": typeof features_otps;
  "features/phoneProfiles": typeof features_phoneProfiles;
  "features/promo_codes": typeof features_promo_codes;
  "features/retryConfigs": typeof features_retryConfigs;
  "features/revenue": typeof features_revenue;
  "features/scheduled_events": typeof features_scheduled_events;
  "features/serverPatternOffers": typeof features_serverPatternOffers;
  "features/serviceStatus": typeof features_serviceStatus;
  "features/sms": typeof features_sms;
  "features/statistics": typeof features_statistics;
  "features/stores": typeof features_stores;
  "features/subscription_price": typeof features_subscription_price;
  "features/totalCommission": typeof features_totalCommission;
  "features/transactions": typeof features_transactions;
  "features/userModeSettings": typeof features_userModeSettings;
  "features/userSenderRelations": typeof features_userSenderRelations;
  "features/ussdCodes": typeof features_ussdCodes;
  "features/ussdHistory": typeof features_ussdHistory;
  functions: typeof functions;
  http: typeof http;
  http_handlers: typeof http_handlers;
  internalAdmin: typeof internalAdmin;
  "m_pesa/initializer": typeof m_pesa_initializer;
  "m_pesa/types": typeof m_pesa_types;
  "m_pesa/utils": typeof m_pesa_utils;
  migrations: typeof migrations;
  "mobile/actions/update_user_data": typeof mobile_actions_update_user_data;
  "mobile/http/handlers": typeof mobile_http_handlers;
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

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
