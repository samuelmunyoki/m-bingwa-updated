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
