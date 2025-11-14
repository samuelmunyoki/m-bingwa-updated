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
  debugPhoneTest, createOrUpdateUserSenderRelation, getUserSenderRelationsByUserId,
  updateLastUpdateTimeStamp, deleteUserSenderRelation, deleteAllMpesaMessages, deleteMpesaMessagesByPhoneNumber,
  migrateMpesaMessages} from "./mobile/http/handlers";

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


export default http;
