import { httpRouter } from "convex/server";
import {
  httpGetHome,
  postSMSCallback,
  postStKPushCallback,
} from "./http_handlers";
import { getAllBundles, createBundle, deleteBundle, downloadUserData, updateBundle, toggleBundleStatus,
  verifyOtpCode, getAllUsers, getStoreOwnerTransactions, createStoreOwnerTransaction, updateStoreOwnerTransaction,
  deleteAllStoreOwnerTransactions, getStoreOwnerTransactionCount, createStore, getStoreByStoreName, updateStore, deleteStore,
  getStoreByUserId, createUserIfNotExists, getUserIdByPhone, getUserByPhoneNormalized, createMpesaMessage,
  getMpesaMessagesByUserId, updateMpesaMessage, updateMpesaMessageProcessedStatus, getSubscriptionPrice,
  updateSubscription, getUserSubscription, getUserSubscriptionByPhone, handleSubscriptionOptions,
  createScheduledEvent, getScheduledEvents, updateScheduledEvent, getPendingScheduledEvents, getScheduledEventsByMessageID,
  updateEventStatus, checkScheduledEvents, deleteScheduledEvent,
  debugPhoneTest, createOrUpdateUserSenderRelation, getUserSenderRelationsByUserId,deleteMpesaMessage,
  updateLastUpdateTimeStamp, deleteUserSenderRelation, deleteAllMpesaMessages, deleteMpesaMessagesByPhoneNumber,
  migrateMpesaMessages, 
  createPromoCode,
  recordPromoCodeUsage,
  validatePromoCode,
  getAllPromoCodes,
  getPromoCodeByCode,
  getPromoCodeStats,
  applyPromoCodeStandalone,
  createAirtimeTransaction,
  getUserAirtimeTransactions,
  handlePromoCodeOptions,
  registerDeviceSession,
  validateDeviceSession,
  logoutDevice,
  clearDeviceSession,
  createBridgeOffer,
  getBridgeOffers,
  updateBridgeOffer,
  deleteBridgeOffer,
  createBridgeDevice,
  getBridgeDevices,
  updateBridgeDevice,
  updateDeviceOffers,
  deleteBridgeDevice,
  addToWhitelist,
  getWhitelist,
  isWhitelisted,
  removeFromWhitelist,
  createBridgeTransaction,
  getBridgeTransactions,
  updateTransactionStatus,
  getTransactionStatusCounts,
  deleteBridgeTransaction,
  deleteAllTransactionsForDevice,
  createOnlineBridgeOffer,
  getOnlineBridgeOffers,
  updateOnlineBridgeOffer,
  deleteOnlineBridgeOffer,
  createOnlineBridgeDevice,
  getOnlineBridgeDevices,
  updateOnlineBridgeDevice,
  updateOnlineDeviceOffers,
  deleteOnlineBridgeDevice,
  addToOnlineWhitelist,
  getOnlineWhitelist,
  isOnlineWhitelisted,
  removeFromOnlineWhitelist,
  handleAirtimeTransactionOptions,
  getTotalCommission,
  getTotalCommissionByUser,
  getTotalCommissionByUserRange,
  getTotalCommissionByDay,
  upsertTotalCommission,
  incrementTotalCommission,
  deleteTotalCommission,
  createOnlineBridgeTransaction,
  getOnlineBridgeTransactions,
  getPendingOnlineBridgeTransactions,
  updateOnlineBridgeTransactionStatus,
  deleteOnlineBridgeTransaction,
  getOnlineBridgeTransactionStats,
  updateServiceStatus,
  getServiceStatus,
  getMultipleServiceStatuses,
  updateDeviceHeartbeat,
  getBatchDeviceOnlineStatus,
  setDeviceHeartbeatTestHandler,
  updateOnlineServiceStatus,
  getOnlineServiceStatus,
  getOnlineBatchServiceStatus,
  batchCreateOnlineBridgeTransactions,
  batchUpdateOnlineBridgeTransactionStatuses,
  getPhoneByUserId,
  clearUserSubscriptionHttp,
  deleteUserByPhoneHttp,
  createUSSDHistory,
  getUSSDHistory,
  getAvailableStatuses,
  deleteUSSDHistory,
  clearUSSDHistory,
  getAllRetryConfigs,
  createRetryConfig,
  updateRetryConfig,
  deleteRetryConfig,
  getUssdCodesHttp,
  updateUssdCodesHttp,
  getModeSettings,
  updateModeSettings,
  insertLogsHttp,
  getLogsHttp,
  deleteLogsHandler,
  countLogsHttp,
  clearAllDataHandler,
  setAdminByEmailHttp,
  updateUserProfile,
  sendEmailTokenHttp,
  verifyEmailTokenHttp,
  getUserByEmailHttp,
  ensureClerkUser,
  upsertCommissionByTypeHttp,
  upsertAutoSaverStatsHttp,
  registerWebSessionHttp,
  registerFcmTokenHttp,
  submitBalanceResultHttp,
  getBlacklistHttp,
  addToBlacklistHttp,
  removeFromBlacklistHttp,
} from "./mobile/http/handlers";

const http = httpRouter();

http.route({
  pathPrefix: "/home/",
  method: "GET",
  handler: httpGetHome,
});

http.route({
  pathPrefix: "/api/download-user-data/",
  method: "GET",
  handler: downloadUserData,
});

http.route({
  pathPrefix: "/api/verify-otp/",
  method: "POST",
  handler: verifyOtpCode,
});

// API Route to get all bundles
http.route({
  pathPrefix: "/api/bundles/",
  method: "GET",
  handler: getAllBundles,
});

// API Route to delete a bundle
http.route({
  pathPrefix: "/api/bundles/delete/",
  method: "DELETE",
  handler: deleteBundle,
});

// API Route to create a bundle
http.route({
  pathPrefix: "/api/bundles/create/",
  method: "POST",
  handler: createBundle,
});

//API Route to update a bundle
http.route({
  pathPrefix: "/api/bundles/update/",
  method: "PATCH",
  handler: updateBundle,
});

//API route to toggle bundle active status
http.route({
  pathPrefix: "/api/bundles/toggleBundleStatus/",
  method: "PATCH",
  handler: toggleBundleStatus,
});

// API Route to get all users
http.route({
  pathPrefix: "/api/all-users/",
  method: "GET",
  handler: getAllUsers,
});

// API Route to get store owner transactions
http.route({
  pathPrefix: "/api/store-owner-transactions/",
  method: "GET",
  handler: getStoreOwnerTransactions,
});

// API Route to create a store owner transaction
http.route({
  pathPrefix: "/api/store-owner-transactions/create/",
  method: "POST",
  handler: createStoreOwnerTransaction,
});

// API Route to update a store owner transaction
http.route({
  pathPrefix: "/api/store-owner-transactions/update/",
  method: "PATCH",
  handler: updateStoreOwnerTransaction,
});

// API Route to delete all store owner transactions by storeOwnerId
http.route({
  pathPrefix: "/api/store-owner-transactions/delete-all/",
  method: "DELETE",
  handler: deleteAllStoreOwnerTransactions,
});

// API Route to get store owner transaction count
http.route({
  pathPrefix: "/api/store-owner-transactions/count/",
  method: "GET",
  handler: getStoreOwnerTransactionCount,
});

//API Route to create a store
http.route({
  pathPrefix: "/api/stores/create/",
  method: "POST",
  handler: createStore,
});

//API Route to get store by store name
http.route({
  pathPrefix: "/api/stores/",
  method: "GET",
  handler: getStoreByStoreName,
});

//API Route to get store by user ID
http.route({
  pathPrefix: "/api/stores/user/",
  method: "GET",
  handler: getStoreByUserId,
});

//API Route to update a store
http.route({
  pathPrefix: "/api/stores/update/",
  method: "PATCH",
  handler: updateStore,
});

//API Route to delete a store
http.route({
  pathPrefix: "/api/stores/delete/",
  method: "DELETE",
  handler: deleteStore,
});

//API Route to create user if not exists
http.route({
  pathPrefix: "/api/users/create-if-not-exists/",
  method: "POST",
  handler: createUserIfNotExists,
});

//API Route to get user ID by phone number
http.route({
  pathPrefix: "/api/users/get-id-by-phone/",
  method: "GET",
  handler: getUserIdByPhone,
});

//API Route to get user by phone number (normalized - handles any phone format)
http.route({
  pathPrefix: "/api/users/get-by-phone/",
  method: "GET",
  handler: getUserByPhoneNormalized,
});

// API Route to create mpesa message
http.route({
  pathPrefix: "/api/mpesa-messages/create/",
  method: "POST",
  handler: createMpesaMessage,
});

// API Route to get mpesa messages by userId
http.route({
  pathPrefix: "/api/mpesa-messages/user/",
  method: "GET",
  handler: getMpesaMessagesByUserId,
});

// API Route to update mpesa message
http.route({
  pathPrefix: "/api/mpesa-messages/update/",
  method: "PATCH",
  handler: updateMpesaMessage,
});

// API Route to update mpesa message processed status
http.route({
  pathPrefix: "/api/mpesa-messages/update-processed/",
  method: "PATCH",
  handler: updateMpesaMessageProcessedStatus,
});

// API Route to delete mpesa message by ID
http.route({
  pathPrefix: "/api/mpesa-messages/delete/",
  method: "DELETE",
  handler: deleteMpesaMessage,
});

// API Route to delete all mpesa messages for a specific user
http.route({
  pathPrefix: "/api/mpesa-messages/delete-all/",
  method: "DELETE",
  handler: deleteAllMpesaMessages,
});

// API Route to delete all mpesa messages for a specific phone number
http.route({
  pathPrefix: "/api/mpesa-messages/delete-by-phone/",
  method: "DELETE",
  handler: deleteMpesaMessagesByPhoneNumber,
});

// API Route to run mpesa messages migration
http.route({
  pathPrefix: "/api/mpesa-messages/migrate/",
  method: "POST",
  handler: migrateMpesaMessages,
});

//API Route to get subscription price
http.route({
  pathPrefix: "/api/subscription-price/",
  method: "GET",
  handler: getSubscriptionPrice,
});

//API Route to update subscription
http.route({
  pathPrefix: "/api/subscriptions/update/",
  method: "POST",
  handler: updateSubscription,
});

// Route to get user subscription status
http.route({
  pathPrefix: "/api/users/",
  method: "GET", 
  handler: getUserSubscription,
});

// Route to get user subscription by phone number
http.route({
  pathPrefix: "/api/subscription/by-phone/",
  method: "GET",
  handler: getUserSubscriptionByPhone,
});

// Route to handle subscription options (CORS preflight)
http.route({
  pathPrefix: "/api/subscription/",
  method: "OPTIONS", 
  handler: handleSubscriptionOptions,
});

// Route to create a scheduled event
http.route({
  pathPrefix: "/api/scheduled-events/create/",
  method: "POST",
  handler: createScheduledEvent,
});

// Route to get scheduled events by user ID
http.route({
  pathPrefix: "/api/scheduled-events/",
  method: "GET",
  handler: getScheduledEvents,
});

// Route to get all pending scheduled events
http.route({
  pathPrefix: "/api/scheduled-events/pending/",
  method: "GET",
  handler: getPendingScheduledEvents,
});

// Route to get scheduled events by message ID
http.route({
  pathPrefix: "/api/scheduled-events/messageid/",
  method: "GET",
  handler: getScheduledEventsByMessageID,
});

http.route({
  pathPrefix: "/api/scheduled-events/update/",
  method: "PUT",
  handler: updateScheduledEvent,
});

// Route to update the status of a scheduled event
http.route({
  pathPrefix: "/api/scheduled-events/update-status/",
  method: "PATCH",
  handler: updateEventStatus,
});

// Route to check scheduled events
http.route({
  pathPrefix: "/api/scheduled-events/check/",
  method: "GET",
  handler: checkScheduledEvents,
});

// Route to delete a scheduled event
http.route({
  pathPrefix: "/api/scheduled-events/delete/",
  method: "DELETE",
  handler: deleteScheduledEvent,
});

http.route({
  pathPrefix: "/api/debug/phone-test/",
  method: "GET",
  handler: debugPhoneTest,
});

// API Route to create or update user-sender relation
http.route({
  pathPrefix: "/api/user-sender-relations/create/",
  method: "POST",
  handler: createOrUpdateUserSenderRelation,
});

// API Route to get user-sender relations by userId
http.route({
  pathPrefix: "/api/user-sender-relations/user/",
  method: "GET",
  handler: getUserSenderRelationsByUserId,
});

// API Route to update lastUpdateTimeStamp
http.route({
  pathPrefix: "/api/user-sender-relations/update-timestamp/",
  method: "PATCH",
  handler: updateLastUpdateTimeStamp,
});

// API Route to delete user-sender relation
http.route({
  pathPrefix: "/api/user-sender-relations/delete/",
  method: "DELETE",
  handler: deleteUserSenderRelation,
});

http.route({
  path: "/stkpush/callback",
  method: "POST",
  handler: postStKPushCallback,
});

http.route({
  path: "/sms/callback",
  method: "POST",
  handler: postSMSCallback,
});


// Route to validate promo code
http.route({
  pathPrefix: "/api/promo-codes/validate/",
  method: "GET",
  handler: validatePromoCode,
});

// CORS preflight for promo codes
http.route({
  pathPrefix: "/api/promo-codes/",
  method: "OPTIONS",
  handler: handlePromoCodeOptions,
});

http.route({
  pathPrefix: "/api/promo-codes/create/",
  method: "POST",
  handler: createPromoCode,
});

http.route({
  pathPrefix: "/api/promo-codes/record-usage/",
  method: "POST",
  handler: recordPromoCodeUsage,
});

http.route({
  pathPrefix: "/api/promo-codes/all/",
  method: "GET",
  handler: getAllPromoCodes,
});

// Get specific promo code
http.route({
  pathPrefix: "/api/promo-codes/get/",
  method: "GET",
  handler: getPromoCodeByCode,
});

// Get promo code statistics
http.route({
  pathPrefix: "/api/promo-codes/stats/",
  method: "GET",
  handler: getPromoCodeStats,
});

// Route to apply promo code in standalone mode
http.route({
  pathPrefix: "/api/promo-codes/apply-standalone/",
  method: "POST",
  handler: applyPromoCodeStandalone,
});

// Route to create airtime transaction
http.route({
  pathPrefix: "/api/airtime-transactions/create/",
  method: "POST",
  handler: createAirtimeTransaction,
});

// Route to get user's airtime transactions
http.route({
  pathPrefix: "/api/airtime-transactions/user/",
  method: "GET",
  handler: getUserAirtimeTransactions,
});

// CORS preflight for airtime transactions
http.route({
  pathPrefix: "/api/airtime-transactions/",
  method: "OPTIONS",
  handler: handleAirtimeTransactionOptions,
});

//register device session
http.route({
  path: "/api/register-device-session/",
  method: "POST",
  handler: registerDeviceSession,
});

//validate device session
http.route({
  path: "/api/validate-device-session/",
  method: "POST",
  handler: validateDeviceSession,
});

//logout device session
http.route({
  path: "/api/logout-device/",
  method: "POST",
  handler: logoutDevice,
});

//clear session
http.route({
  path: "/api/clear-session/",
  method: "POST",
  handler: clearDeviceSession,
});

// ============= BRIDGE OFFERS ROUTES =============

http.route({
  pathPrefix: "/api/bridge/offers/create/",
  method: "POST",
  handler: createBridgeOffer,
});

http.route({
  pathPrefix: "/api/bridge/offers/",
  method: "GET",
  handler: getBridgeOffers,
});

http.route({
  pathPrefix: "/api/bridge/offers/update/",
  method: "PATCH",
  handler: updateBridgeOffer,
});

http.route({
  pathPrefix: "/api/bridge/offers/delete/",
  method: "DELETE",
  handler: deleteBridgeOffer,
});


// ============= BRIDGE DEVICES ROUTES =============

http.route({
  pathPrefix: "/api/bridge/devices/create/",
  method: "POST",
  handler: createBridgeDevice,
});

http.route({
  pathPrefix: "/api/bridge/devices/",
  method: "GET",
  handler: getBridgeDevices,
});

http.route({
  pathPrefix: "/api/bridge/devices/update/",
  method: "PATCH",
  handler: updateBridgeDevice,
});

http.route({
  pathPrefix: "/api/bridge/devices/update-offers/",
  method: "PATCH",
  handler: updateDeviceOffers,
});

http.route({
  pathPrefix: "/api/bridge/devices/delete/",
  method: "DELETE",
  handler: deleteBridgeDevice,
});

// ============= BRIDGE WHITELIST ROUTES =============

http.route({
  pathPrefix: "/api/bridge/whitelist/add/",
  method: "POST",
  handler: addToWhitelist,
});

http.route({
  pathPrefix: "/api/bridge/whitelist/",
  method: "GET",
  handler: getWhitelist,
});

http.route({
  pathPrefix: "/api/bridge/whitelist/check/",
  method: "GET",
  handler: isWhitelisted,
});

http.route({
  pathPrefix: "/api/bridge/whitelist/remove/",
  method: "DELETE",
  handler: removeFromWhitelist,
});

// ============= BRIDGE TRANSACTIONS ROUTES =============

http.route({
  pathPrefix: "/api/bridge/transactions/create/",
  method: "POST",
  handler: createBridgeTransaction,
});

http.route({
  pathPrefix: "/api/bridge/transactions/",
  method: "GET",
  handler: getBridgeTransactions,
});

http.route({
  pathPrefix: "/api/bridge/transactions/update-status/",
  method: "PATCH",
  handler: updateTransactionStatus,
});

http.route({
  pathPrefix: "/api/bridge/transactions/counts/",
  method: "GET",
  handler: getTransactionStatusCounts,
});

// ============= ONLINE BRIDGE OFFERS ROUTES =============

http.route({
  pathPrefix: "/api/online-bridge/offers/create/",
  method: "POST",
  handler: createOnlineBridgeOffer,
});

http.route({
  pathPrefix: "/api/online-bridge/offers/",
  method: "GET",
  handler: getOnlineBridgeOffers,
});

http.route({
  pathPrefix: "/api/online-bridge/offers/update/",
  method: "PATCH",
  handler: updateOnlineBridgeOffer,
});

http.route({
  pathPrefix: "/api/online-bridge/offers/delete/",
  method: "DELETE",
  handler: deleteOnlineBridgeOffer,
});

// ============= ONLINE BRIDGE DEVICES ROUTES =============

http.route({
  pathPrefix: "/api/online-bridge/devices/create/",
  method: "POST",
  handler: createOnlineBridgeDevice,
});

http.route({
  pathPrefix: "/api/online-bridge/devices/",
  method: "GET",
  handler: getOnlineBridgeDevices,
});

http.route({
  pathPrefix: "/api/online-bridge/devices/update/",
  method: "PATCH",
  handler: updateOnlineBridgeDevice,
});

http.route({
  pathPrefix: "/api/online-bridge/devices/update-offers/",
  method: "PATCH",
  handler: updateOnlineDeviceOffers,
});

http.route({
  pathPrefix: "/api/online-bridge/devices/delete/",
  method: "DELETE",
  handler: deleteOnlineBridgeDevice,
});

// ============= ONLINE BRIDGE WHITELIST ROUTES =============

http.route({
  pathPrefix: "/api/online-bridge/whitelist/add/",
  method: "POST",
  handler: addToOnlineWhitelist,
});

http.route({
  pathPrefix: "/api/online-bridge/whitelist/",
  method: "GET",
  handler: getOnlineWhitelist,
});

http.route({
  pathPrefix: "/api/online-bridge/whitelist/is-whitelisted/",
  method: "GET",
  handler: isOnlineWhitelisted,
});

http.route({
  pathPrefix: "/api/online-bridge/whitelist/remove/",
  method: "DELETE",
  handler: removeFromOnlineWhitelist,
});

http.route({
  pathPrefix: "/api/bridge/transactions/delete/",
  method: "DELETE",
  handler: deleteBridgeTransaction,
});

http.route({
  pathPrefix: "/api/bridge/transactions/delete-all/",
  method: "DELETE",
  handler: deleteAllTransactionsForDevice,
});

// ============================================
// TOTAL COMMISSION ROUTES
// ============================================

// Get total commission by userId and day
http.route({
  pathPrefix: "/api/total-commission/",
  method: "GET",
  handler: getTotalCommission,
});

// Get all commissions for a user
http.route({
  pathPrefix: "/api/total-commission/user/",
  method: "GET",
  handler: getTotalCommissionByUser,
});

// Get commissions for a user within a date range
http.route({
  pathPrefix: "/api/total-commission/user/range/",
  method: "GET",
  handler: getTotalCommissionByUserRange,
});

// Get all commissions for a specific day
http.route({
  pathPrefix: "/api/total-commission/day/",
  method: "GET",
  handler: getTotalCommissionByDay,
});

// Create or update total commission
http.route({
  pathPrefix: "/api/total-commission/upsert/",
  method: "POST",
  handler: upsertTotalCommission,
});

// Increment total commission
http.route({
  pathPrefix: "/api/total-commission/increment/",
  method: "POST",
  handler: incrementTotalCommission,
});

// Delete total commission
http.route({
  pathPrefix: "/api/total-commission/delete/",
  method: "DELETE",
  handler: deleteTotalCommission,
});

/**
 * POST /api/online-bridge/transactions/create/
 * Create a new Online Bridge transaction
 */
http.route({
  path: "/api/online-bridge/transactions/create/",
  method: "POST",
  handler: createOnlineBridgeTransaction,
});

/**
 * GET /api/online-bridge/transactions/
 * Get all Online Bridge transactions for a user
 */
http.route({
  path: "/api/online-bridge/transactions/",
  method: "GET",
  handler: getOnlineBridgeTransactions,
});

/**
 * GET /api/online-bridge/transactions/pending/
 * Get pending Online Bridge transactions for a receiver
 */
http.route({
  path: "/api/online-bridge/transactions/pending/",
  method: "GET",
  handler: getPendingOnlineBridgeTransactions,
});

/**
 * PATCH /api/online-bridge/transactions/update-status/
 * Update Online Bridge transaction status
 */
http.route({
  path: "/api/online-bridge/transactions/update-status/",
  method: "PATCH",
  handler: updateOnlineBridgeTransactionStatus,
});

/**
 * DELETE /api/online-bridge/transactions/delete/
 * Delete Online Bridge transaction
 */
http.route({
  path: "/api/online-bridge/transactions/delete/",
  method: "DELETE",
  handler: deleteOnlineBridgeTransaction,
});

/**
 * GET /api/online-bridge/transactions/stats/
 * Get Online Bridge transaction status counts
 */
http.route({
  path: "/api/online-bridge/transactions/stats/",
  method: "GET",
  handler: getOnlineBridgeTransactionStats,
});

http.route({
  path: "/api/online-bridge/transactions/batch-create/",
  method: "POST",
  handler: batchCreateOnlineBridgeTransactions,
});


http.route({
  pathPrefix: "/api/service-status/update/",
  method: "POST",
  handler: updateServiceStatus,
});

http.route({
  pathPrefix: "/api/service-status/",
  method: "GET",
  handler: getServiceStatus,
});

http.route({
  pathPrefix: "/api/service-status/batch/",
  method: "POST",
  handler: getMultipleServiceStatuses,
});

http.route({
  pathPrefix: "/api/device-heartbeat/",
  method: "POST",
  handler: updateDeviceHeartbeat,
});

http.route({
  pathPrefix: "/api/device-online-status/batch/",
  method: "POST",
  handler: getBatchDeviceOnlineStatus,
});

http.route({
  pathPrefix: "/api/device-heartbeat/test/",
  method: "POST",
  handler: setDeviceHeartbeatTestHandler,
});


http.route({
  pathPrefix: "/api/online-service-status/update/",
  method: "POST",
  handler: updateOnlineServiceStatus,
});

http.route({
  pathPrefix: "/api/online-service-status/get/",
  method: "GET",
  handler: getOnlineServiceStatus,
});

http.route({
  pathPrefix: "/api/online-service-status/batch/",
  method: "POST",
  handler: getOnlineBatchServiceStatus,
});

http.route({
  path: "/api/online-bridge/transactions/batch-update-status/",
  method: "PATCH",
  handler: batchUpdateOnlineBridgeTransactionStatuses,
});

http.route({
  pathPrefix: "/api/get-phone/",
  method: "GET",
  handler: getPhoneByUserId,
});


http.route({
  pathPrefix: "/api/clear-subscription/",
  method: "POST",
  handler: clearUserSubscriptionHttp,
});

http.route({
  pathPrefix: "/api/delete-user/",
  method: "DELETE",
  handler: deleteUserByPhoneHttp,
});

// ============= USSD HISTORY ROUTES =============

http.route({
  pathPrefix: "/api/ussd-history/create/",
  method: "POST",
  handler: createUSSDHistory,
});

http.route({
  pathPrefix: "/api/ussd-history/",
  method: "GET",
  handler: getUSSDHistory,
});

http.route({
  pathPrefix: "/api/ussd-history/statuses/",
  method: "GET",
  handler: getAvailableStatuses,
});

http.route({
  pathPrefix: "/api/ussd-history/delete/",
  method: "DELETE",
  handler: deleteUSSDHistory,
});

http.route({
  pathPrefix: "/api/ussd-history/clear/",
  method: "DELETE",
  handler: clearUSSDHistory,
});

// GET all retry configs for a user
http.route({
  pathPrefix: "/api/retry-configs/",
  method: "GET",
  handler: getAllRetryConfigs,
});

// POST create retry config
http.route({
  pathPrefix: "/api/retry-configs/create/",
  method: "POST",
  handler: createRetryConfig,
});

// PATCH update retry config
http.route({
  pathPrefix: "/api/retry-configs/update/",
  method: "PATCH",
  handler: updateRetryConfig,
});

// DELETE retry config
http.route({
  pathPrefix: "/api/retry-configs/delete/",
  method: "DELETE",
  handler: deleteRetryConfig,
});

http.route({
  path: "/api/ussd-codes/",
  method: "GET",
  handler: getUssdCodesHttp,
});

http.route({
  path: "/api/ussd-codes/update/",
  method: "POST",
  handler: updateUssdCodesHttp,
});

http.route({
  path: "/api/mode-settings/",
  method: "GET",
  handler: getModeSettings,
});

http.route({
  path: "/api/mode-settings/update/",
  method: "POST",
  handler: updateModeSettings,
});

http.route({
  path: "/api/logs",
  method: "POST",
  handler: insertLogsHttp,
});
 
http.route({
  path: "/api/logs",
  method: "GET",
  handler: getLogsHttp,
});

http.route({
  path: "/api/logs",
  method: "DELETE",
  handler: deleteLogsHandler,
});

http.route({
  path: "/api/logs/count",
  method: "GET",
  handler: countLogsHttp,
});

http.route({
  path: "/api/admin/clear-all-data",
  method: "POST",
  handler: clearAllDataHandler,
});

http.route({
  path: "/api/admin/set-admin-by-email",
  method: "POST",
  handler: setAdminByEmailHttp,
});

http.route({
  pathPrefix: "/api/users/update-profile/",
  method: "PATCH",
  handler: updateUserProfile,
});

http.route({
  pathPrefix: "/api/users/get-by-email/",
  method: "GET",
  handler: getUserByEmailHttp,
});

http.route({
  path: "/api/email-token/send/",
  method: "POST",
  handler: sendEmailTokenHttp,
});

http.route({
  path: "/api/email-token/verify/",
  method: "POST",
  handler: verifyEmailTokenHttp,
});

http.route({
  path: "/api/users/ensure-clerk/",
  method: "POST",
  handler: ensureClerkUser,
});

// ============= STATS SYNC ROUTES =============

http.route({
  path: "/api/stats/commission-by-type/upsert/",
  method: "POST",
  handler: upsertCommissionByTypeHttp,
});

http.route({
  path: "/api/stats/autosaver/upsert/",
  method: "POST",
  handler: upsertAutoSaverStatsHttp,
});

http.route({
  path: "/api/web-session/register/",
  method: "POST",
  handler: registerWebSessionHttp,
});

http.route({
  path: "/api/fcm-token/register/",
  method: "POST",
  handler: registerFcmTokenHttp,
});

http.route({
  path: "/api/balance/result/",
  method: "POST",
  handler: submitBalanceResultHttp,
});

http.route({
  pathPrefix: "/api/blacklist/",
  method: "GET",
  handler: getBlacklistHttp,
});

http.route({
  pathPrefix: "/api/blacklist/create/",
  method: "POST",
  handler: addToBlacklistHttp,
});

http.route({
  pathPrefix: "/api/blacklist/delete/",
  method: "DELETE",
  handler: removeFromBlacklistHttp,
});

export default http;
