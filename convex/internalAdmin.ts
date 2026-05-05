import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const ALL_TABLES = [
  "users", /**"bundles", "subscri
  ption_price", "mpesa_transactions",
  "sms", "scheduled_events", "stores", "notifications", "blacklist",
  "otps", "cooldownTimers", "system", "transactions", "mpesaMessages",
  "userSenderRelations", "promoCodes", "promoUsers", "airtimeTransactions",
  "deviceSessions", "bridgeOffers", "bridgeDevices", "bridgeWhitelist",
  "bridgeTransactions", "totalCommission", "onlineBridgeOffers",
  "onlineBridgeDevices", "onlineBridgeWhitelist", "onlineBridgeTransactions",
  "serviceStatus", "deviceHeartbeats", "onlineServiceStatus", "ussdHistory",
  "retryConfigs", "ussdCodes", "userModeSettings", "appLogs",**/
] as const;

// Deletes up to 500 docs from a single table. Returns how many were deleted.
export const clearTableBatch = internalMutation({
  args: { table: v.string() },
  handler: async ({ db }, { table }) => {
    const docs = await (db.query(table as any)).take(500);
    await Promise.all(docs.map((doc: any) => db.delete(doc._id)));
    return docs.length;
  },
});
