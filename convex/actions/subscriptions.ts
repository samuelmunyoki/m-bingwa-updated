"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

/**export const updateSubscription = action({
  // Define the expected arguments for the action
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    amount: v.string(),
    subscriptionEnds: v.number(),
  },
  handler: async (ctx, args) => {
    // Query subscription settings from the database
    const subscriptionSettings = await ctx.runQuery(
      api.features.subscription_price.querySubscriptionSettings
    );

    // Check if subscription settings exist before proceeding
    if (!subscriptionSettings) {
      throw new Error("Subscription settings not found");
    }
      // Initiate an STK push request for payment
    const stkPushResponse = await ctx.runAction(
      api.m_pesa.initializer.initiateSTKPush,
      {
        phoneNumber: args.phoneNumber,
        amount: args.amount,
        accountReference: "Subscription",
        transactionDesc: "Payment for subscription",
        paymentmethod: subscriptionSettings.paymentMethod,
        paymentAccount: subscriptionSettings.paymentAccount,
      }
    );

      // Store the STK push transaction details in the database
    await ctx.runMutation(
      api.features.mpesa_transactions.createMpesaTransaction,
      {
        phoneNumber: args.phoneNumber,
        accountReference: "Subscription",
        transactionDesc: "Payment for subscription",
        paymentAccount: subscriptionSettings.paymentAccount,
        checkoutRequestID: stkPushResponse.CheckoutRequestID,
        merchantRequestID: stkPushResponse.MerchantRequestID,
        paymentFor: "SUBSCRIPTION",
        paymentMethod: subscriptionSettings.paymentMethod,
        resultCode: parseFloat(stkPushResponse.ResponseCode),
        resultDesc: stkPushResponse.ResponseDescription,
      }
    );
    return {
      success: stkPushResponse.ResponseCode === "0",
      checkoutRequestID: stkPushResponse.CheckoutRequestID,
      merchantRequestID: stkPushResponse.MerchantRequestID,
      responseCode: stkPushResponse.ResponseCode,
      responseDescription: stkPushResponse.ResponseDescription,
      customerMessage: stkPushResponse.CustomerMessage,
    };
      // Update the user's subscription details in the database
  },
});
**/

// Handles both Normal (days) and Token Subscription STK pushes through one shared path — pass
// subscriptionEnds+amount for a days purchase (unchanged from before Token Subscription existed),
// or tokenBundleId for a token purchase (amount is looked up server-side from the bundle's real
// price, never trusted from the caller). See project_token_subscription_feature — this replaces
// what used to be a separate parallel purchaseTokenBundle action; the only thing that actually
// differs between the two purchase kinds is which fields get set here and on the mpesa_transactions
// row, so one action handles both instead of duplicating the STK-push call site.
export const updateSubscription = action({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    amount: v.optional(v.string()),
    subscriptionEnds: v.optional(v.number()),
    tokenBundleId: v.optional(v.id("tokenBundles")),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    checkoutRequestID: string;
    merchantRequestID: string;
    responseCode: string;
    responseDescription: string;
    customerMessage: string;
  }> => {
    const subscriptionSettings = await ctx.runQuery(
      api.features.subscription_price.querySubscriptionSettings
    );

    if (!subscriptionSettings) {
      throw new Error("Subscription settings not found");
    }

    let amount: string;
    let accountReference: string;
    let transactionDesc: string;

    if (args.tokenBundleId) {
      const bundle = await ctx.runQuery(
        api.features.tokenBundles.getTokenBundleById,
        { tokenBundleId: args.tokenBundleId }
      );
      if (!bundle || !bundle.isActive) {
        throw new Error("Token bundle not found or no longer available");
      }
      amount = String(bundle.price);
      accountReference = "Token Bundle";
      transactionDesc = `Payment for ${bundle.name}`;
    } else {
      if (!args.amount || !args.subscriptionEnds) {
        throw new Error("amount and subscriptionEnds are required for a Normal subscription purchase");
      }
      amount = args.amount;
      accountReference = "Subscription";
      transactionDesc = "Payment for subscription";
    }

    const stkPushResponse = await ctx.runAction(
      api.m_pesa.initializer.initiateSTKPush,
      {
        phoneNumber: args.phoneNumber,
        amount,
        accountReference,
        transactionDesc,
        paymentmethod: subscriptionSettings.paymentMethod,
        paymentAccount: subscriptionSettings.paymentAccount,
      }
    );

    await ctx.runMutation(
      api.features.mpesa_transactions.createMpesaTransaction,
      {
        phoneNumber: args.phoneNumber,
        accountReference,
        transactionDesc,
        paymentAccount: subscriptionSettings.paymentAccount,
        checkoutRequestID: stkPushResponse.CheckoutRequestID,
        merchantRequestID: stkPushResponse.MerchantRequestID,
        paymentFor: args.tokenBundleId ? "TOKEN_BUNDLE" : "SUBSCRIPTION",
        paymentMethod: subscriptionSettings.paymentMethod,
        resultCode: parseFloat(stkPushResponse.ResponseCode),
        resultDesc: stkPushResponse.ResponseDescription,
        subscriptionEnds: args.subscriptionEnds,
        userId: args.userId,
        tokenBundleId: args.tokenBundleId,
      }
    );

    return {
      success: stkPushResponse.ResponseCode === "0",
      checkoutRequestID: stkPushResponse.CheckoutRequestID,
      merchantRequestID: stkPushResponse.MerchantRequestID,
      responseCode: stkPushResponse.ResponseCode,
      responseDescription: stkPushResponse.ResponseDescription,
      customerMessage: stkPushResponse.CustomerMessage,
    };
  },
});

export const getUserSubscriptionStatusAction = action({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }): Promise<{
    status: "success" | "error";
    data?: {
      isSubscribed: boolean;
      subscriptionEnds: number | null;
      subscriptionId: string | null;
      remainingDays: number;
      tokenBalance: number;
    };
    error?: string;
  }> => {
    try {
      // Query the user data using a simple database query
      const user = await ctx.runQuery(api.users.getUserById, { userId });

      if (!user) {
        return {
          status: "error",
          error: "User not found"
        };
      }

      // Extract subscription data from user record with proper null checks
      const isSubscribed: boolean = user.isSubscribed ?? false;
      const subscriptionEnds: number | null = user.subscriptionEnds ?? null;
      const subscriptionId: string | null = user.subscriptionId ?? null;
      const tokenBalance: number = user.tokenBalance ?? 0;

      // Calculate remaining days if subscription is active
      let remainingDays: number = 0;
      let actuallySubscribed: boolean = isSubscribed;

      if (isSubscribed && subscriptionEnds) {
        const currentTimeSeconds = Math.floor(Date.now() / 1000);

        if (subscriptionEnds > currentTimeSeconds) {
          const remainingSeconds = subscriptionEnds - currentTimeSeconds;
          remainingDays = Math.ceil(remainingSeconds / (24 * 60 * 60));
        } else {
          // Subscription has expired
          actuallySubscribed = false;
          remainingDays = 0;
        }
      }

      return {
        status: "success" as const,
        data: {
          isSubscribed: actuallySubscribed,
          subscriptionEnds: subscriptionEnds,
          subscriptionId: subscriptionId,
          remainingDays: remainingDays,
          tokenBalance: tokenBalance
        }
      };

    } catch (error) {
      console.error("❌ Error getting user subscription status:", error);
      return {
        status: "error" as const,
        error: `Failed to get subscription status: ${error}`
      };
    }
  },
});


export const getUserSubscriptionByPhoneAction = action({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, { phoneNumber }): Promise<{
    status: "success" | "error";
    data?: {
      isSubscribed: boolean;
      subscriptionEnds: number | null;
      subscriptionId: string | null;
      remainingDays: number;
      userId: string;
      tokenBalance: number;
    };
    error?: string;
  }> => {
    try {
      // First get the user by phone number
      const userResult = await ctx.runQuery(api.users.getUserIdByPhone, {
        phoneNumber
      });

      if (!userResult || userResult.status !== "success" || !userResult.userId) {
        return {
          status: "error",
          error: "User not found"
        };
      }

      // Now get the full user data including subscription info
      const user = await ctx.runQuery(api.users.getUserById, {
        userId: userResult.userId
      });

      if (!user) {
        return {
          status: "error",
          error: "User data not found"
        };
      }

      // Use the same logic as above with proper null checks
      const isSubscribed: boolean = user.isSubscribed ?? false;
      const subscriptionEnds: number | null = user.subscriptionEnds ?? null;
      const subscriptionId: string | null = user.subscriptionId ?? null;
      const tokenBalance: number = user.tokenBalance ?? 0;

      let remainingDays: number = 0;
      let actuallySubscribed: boolean = isSubscribed;

      if (isSubscribed && subscriptionEnds) {
        const currentTimeSeconds = Math.floor(Date.now() / 1000);

        if (subscriptionEnds > currentTimeSeconds) {
          const remainingSeconds = subscriptionEnds - currentTimeSeconds;
          remainingDays = Math.ceil(remainingSeconds / (24 * 60 * 60));
        } else {
          actuallySubscribed = false;
          remainingDays = 0;
        }
      }

      return {
        status: "success" as const,
        data: {
          isSubscribed: actuallySubscribed,
          subscriptionEnds: subscriptionEnds,
          subscriptionId: subscriptionId,
          remainingDays: remainingDays,
          userId: user._id,
          tokenBalance: tokenBalance
        }
      };

    } catch (error) {
      console.error("❌ Error getting user subscription by phone:", error);
      return {
        status: "error" as const,
        error: `Failed to get subscription status: ${error}`
      };
    }
  },
});