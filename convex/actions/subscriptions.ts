"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

export const updateSubscription = action({
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
    if (subscriptionSettings) {
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
          paymentAccount: "4151713",
          checkoutRequestID: stkPushResponse.CheckoutRequestID,
          merchantRequestID: stkPushResponse.MerchantRequestID,
          paymentFor: "SUBSCRIPTION",
          paymentMethod: "PAYBILL",
          resultCode: parseFloat(stkPushResponse.ResponseCode),
          resultDesc: stkPushResponse.ResponseDescription,
        }
      );

      // Update the user's subscription details in the database
      await ctx.runMutation(api.users.updateSubscription, {
        userId: args.userId,
        subscriptionId: stkPushResponse.CheckoutRequestID,
        subscriptionEnds: args.subscriptionEnds,
        isSubscribed: false,
      });
    }
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
    };
    error?: string;
  }> => {
    try {
      console.log("=== GET USER SUBSCRIPTION STATUS ACTION ===");
      console.log("UserId:", userId);

      // Query the user data using a simple database query
      const user = await ctx.runQuery(api.users.getUserById, { userId });

      if (!user) {
        console.log("❌ User not found:", userId);
        return {
          status: "error",
          error: "User not found"
        };
      }

      console.log("✅ User found:", user._id);
      console.log("User subscription data:", {
        isSubscribed: user.isSubscribed,
        subscriptionEnds: user.subscriptionEnds,
        subscriptionId: user.subscriptionId
      });

      // Extract subscription data from user record with proper null checks
      const isSubscribed: boolean = user.isSubscribed ?? false;
      const subscriptionEnds: number | null = user.subscriptionEnds ?? null;
      const subscriptionId: string | null = user.subscriptionId ?? null;

      // Calculate remaining days if subscription is active
      let remainingDays: number = 0;
      let actuallySubscribed: boolean = isSubscribed;

      if (isSubscribed && subscriptionEnds) {
        const currentTimeSeconds = Math.floor(Date.now() / 1000);
        console.log("Current time (seconds):", currentTimeSeconds);
        console.log("Subscription ends (seconds):", subscriptionEnds);

        if (subscriptionEnds > currentTimeSeconds) {
          const remainingSeconds = subscriptionEnds - currentTimeSeconds;
          remainingDays = Math.ceil(remainingSeconds / (24 * 60 * 60));
          console.log("✅ Subscription active - Remaining days:", remainingDays);
        } else {
          // Subscription has expired
          actuallySubscribed = false;
          remainingDays = 0;
          console.log("⚠️ Subscription expired");
        }
      }

      const result = {
        status: "success" as const,
        data: {
          isSubscribed: actuallySubscribed,
          subscriptionEnds: subscriptionEnds,
          subscriptionId: subscriptionId,
          remainingDays: remainingDays
        }
      };

      console.log("✅ Returning subscription status:", result);
      return result;

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
    };
    error?: string;
  }> => {
    try {
      console.log("=== GET USER SUBSCRIPTION BY PHONE ACTION ===");
      console.log("Phone:", phoneNumber);

      // First get the user by phone number
      const userResult = await ctx.runQuery(api.users.getUserIdByPhone, { 
        phoneNumber 
      });

      if (!userResult || userResult.status !== "success" || !userResult.userId) {
        console.log("❌ User not found with phone:", phoneNumber);
        return {
          status: "error",
          error: "User not found"
        };
      }

      console.log("✅ User found by phone:", userResult.userId);

      // Now get the full user data including subscription info
      const user = await ctx.runQuery(api.users.getUserById, { 
        userId: userResult.userId 
      });

      if (!user) {
        console.log("❌ User data not found:", userResult.userId);
        return {
          status: "error",
          error: "User data not found"
        };
      }

      // Use the same logic as above with proper null checks
      const isSubscribed: boolean = user.isSubscribed ?? false;
      const subscriptionEnds: number | null = user.subscriptionEnds ?? null;
      const subscriptionId: string | null = user.subscriptionId ?? null;

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
          userId: user._id
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