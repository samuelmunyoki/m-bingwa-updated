/* eslint-disable no-restricted-imports */
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
} from "./_generated/server";
/* eslint-enable no-restricted-imports */
import type { DataModel } from "./_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { api } from "./_generated/api";

// Initialize Triggers instance with DataModel type
const triggers = new Triggers<DataModel>();

// Register trigger for user creation notification
triggers.register("users", async (ctx, change) => {
  if (change.operation === "insert") {
    const notificationBody = `New User Registered: User with ${change.newDoc.email} was created.`;
    await ctx.runMutation(api.features.notifications.createNotification, {
      notificationBody,
    });
  }
});

// Register trigger for sending SMS when a transaction is confirmed
triggers.register("transactions", async (ctx, change) => {
  if (
    change.operation === "update" &&
    change.newDoc?.paymentStatus === "CONFIRMED" &&
    change.oldDoc?.paymentStatus !== "CONFIRMED"
  ) {
    // Fetch user details
    const user = await ctx.runQuery(api.users.getUserById, {
      userId: change.newDoc.storeOwnerId,
    });

    // Log if user or phone number is missing
    if (!user || user.phoneNumber === undefined) {
      console.log(
        `User not found or phone number missing for userId: ${change.newDoc.storeOwnerId}`
      );
      return;
    }

    // Retrieve bundle data to prepare USSD SMS
    const ussdData = await ctx.runQuery(
      api.features.bundles.getBundleByBundleID,
      {
        bundleId: change.newDoc.bundlesID,
      }
    );

    // Schedule SMS if bundle data exists
    if (ussdData) {
      const ussdSMS = ussdData.bundlesUSSD.replace(
        "NUM",
        change.newDoc.receivingNumber
      );
      const timestamp = Math.floor(new Date().getTime() / 1000);
      await ctx.scheduler.runAfter(0, api.actions.sms.sendSMS, {
        smsNumber: user.phoneNumber,
        smsContent: `SP|${ussdSMS}|${timestamp}`,
        smsId: change.newDoc._id,
        service: "STORE",
      });
    }
  }
});

// Register trigger for store notifications
triggers.register("stores", async (ctx, change) => {
  let notificationBody = "";
  if (change.operation === "insert") {
    notificationBody = `New Store created: ${change.newDoc.storeName}.m-bingwa.com created.`;
  } else if (
    change.operation === "update" &&
    change.newDoc.storeName !== change.oldDoc.storeName
  ) {
    notificationBody = `Store Updated: ${change.oldDoc.storeName}.m-bingwa.com moved to ${change.newDoc.storeName}.m-bingwa.com`;
  } else if (change.operation === "delete") {
    notificationBody = `Store Deleted: ${change.oldDoc.storeName}.m-bingwa.com deleted.`;
  }

  if (notificationBody) {
    await ctx.runMutation(api.features.notifications.createNotification, {
      notificationBody,
    });
  }
});

// Register trigger for SMS-related notifications
triggers.register("sms", async (ctx, change) => {
  if (change.operation === "insert" && change.newDoc.service === "USSD") {
    const userId = change.newDoc.userId;
    const smsContent = change.newDoc.smsContent;
    let notificationBody = `Remote Dial: User ${userId} dialed ${smsContent}.`;
    await ctx.runMutation(api.features.notifications.createNotification, {
      notificationBody,
    });

    // Fetch user details to send SMS
    const user = await ctx.runQuery(api.users.getUserById, { userId });
    if (!user) {
      notificationBody = `Remote Dial Error: User ${userId} does not exist.`;
      await ctx.runMutation(api.features.notifications.createNotification, {
        notificationBody,
      });
    } else if (user.phoneNumber !== undefined) {
      await ctx.scheduler.runAfter(0, api.actions.sms.sendSMS, {
        smsNumber: user.phoneNumber,
        smsContent: smsContent,
        smsId: change.newDoc._id,
        service: "USSD",
      });
    }
  }
});

triggers.register("otps", async (ctx, change) => {
  if (change.operation === "insert") {
    const userId = change.newDoc.userId;
    const user = await ctx.runQuery(api.users.getUserById, { userId });
    if (user && user.phoneNumber !== undefined) {
      await ctx.scheduler.runAfter(0, api.actions.sms.sendSMS, {
        smsNumber: user.phoneNumber,
        smsContent: `Your M-Bingwa OTP code is ${change.newDoc.otpCode}. Do not share this code with anyone. \nk3rKgST5x83`,
        smsId: change.newDoc._id,
        service: "NOTIFICATION",
      });
    }
  }
});

// Wrap `mutation` and `internalMutation` to support triggers
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB)
);
