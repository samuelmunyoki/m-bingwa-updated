import { httpRouter } from "convex/server";
import {
  httpGetHome,
  postSMSCallback,
  postStKPushCallback,
} from "./http_handlers";
import { getAllBundles, createBundle, deleteBundle, downloadUserData, updateBundle, 
  verifyOtpCode, getAllUsers, getStoreOwnerTransactions,
  createStore, getStoreByStoreName, updateStore, deleteStore, 
  getStoreByUserId} from "./mobile/http/handlers";

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
  pathPrefix: "/api/bundle/",
  method: "DELETE",
  handler: deleteBundle,
});

// API Route to create a bundle
http.route({
  pathPrefix: "/api/bundle/create/",
  method: "POST",
  handler: createBundle,
});

//API Route to update a bundle
http.route({
  pathPrefix: "/api/bundle/",
  method: "PATCH",
  handler: updateBundle,
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

//API Route to create a store
http.route({
  pathPrefix: "/api/store/",
  method: "POST",
  handler: createStore,
});

//API Route to get store by store name
http.route({
  pathPrefix: "/api/store/",
  method: "GET",
  handler: getStoreByStoreName,
});

//API Route to get store by user ID
http.route({
  pathPrefix: "/api/store/user/",
  method: "GET",
  handler: getStoreByUserId,
});

//API Route to update a store
http.route({
  pathPrefix: "/api/store/",
  method: "PUT",
  handler: updateStore,
});

//API Route to delete a store
http.route({
  pathPrefix: "/api/store/",
  method: "DELETE",
  handler: deleteStore,
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
