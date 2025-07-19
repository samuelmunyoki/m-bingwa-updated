import { httpRouter } from "convex/server";
import {
  httpGetHome,
  postSMSCallback,
  postStKPushCallback,
} from "./http_handlers";
import { createBundle, deleteBundle, downloadUserData, updateBundle, verifyOtpCode, getAllUsers, getStoreOwnerTransactions } from "./mobile/http/handlers";

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
