"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import type { BackendResponse } from "../../lib/custom_types";

export const payBundle = action({
  args: {
    storeId: v.string(),
    storeOwnerId: v.string(),
    bundlesID: v.string(),
    bundlesPrice: v.number(),
    payingNumber: v.string(),
    receivingNumber: v.string(),
    paymentMethod: v.string(),
    paymentAccount: v.string(),
  },
  handler: async (ctx, args): Promise<BackendResponse> => {
    try {
      // 1. Query the store owner's data
      const storeOwnerData = await ctx.runQuery(api.users.getUserById, {
        userId: args.storeOwnerId,
      });
      console.log(`STORE OWNER DATA: ${storeOwnerData}`);

      if (!storeOwnerData || !storeOwnerData.phoneNumber) {
        return {
          status: "error",
          message: "Store not configured correctly.",
        } as BackendResponse;
      }

      // 2. Send SKIP| SMS to store owner's phone — warn Android to ignore incoming M-Pesa SMS
      const smsContent = `SKIP|${args.payingNumber}`;
      const skipSmsSent = await sendSkipSmsWithRetry(ctx, storeOwnerData.phoneNumber, smsContent, args.storeOwnerId);

      if (!skipSmsSent) {
        return {
          status: "error",
          message: "Could not reach device. Please try again.",
        } as BackendResponse;
      }

      // 3. Wait 8 seconds to ensure SKIP| SMS lands on device before STK push
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Initiate Mpesa STK Push
      const stkPushResponse = await ctx.runAction(
        api.m_pesa.initializer.initiateSTKPush,
        {
          amount: args.bundlesPrice.toString(),
          phoneNumber: `254${args.payingNumber.slice(1)}`,
          paymentAccount: args.paymentAccount,
          paymentmethod: args.paymentMethod,
          accountReference: "M-Bingwa Store",
          transactionDesc: `${args.paymentMethod} - ${args.paymentAccount}`,
        }
      );

      // Run in parallel sort of?
      await Promise.all([
        ctx.runMutation(
          api.features.mpesa_transactions.createMpesaTransaction,
          {
            phoneNumber: `254${args.payingNumber.slice(1)}`,
            accountReference: "STORE TRANSACTION",
            transactionDesc: "M-Bingwa store transaction",
            paymentAccount: args.paymentAccount,
            checkoutRequestID: stkPushResponse.CheckoutRequestID,
            merchantRequestID: stkPushResponse.MerchantRequestID,
            paymentFor: "STORE",
            paymentMethod: args.paymentMethod,
            resultCode: Number.parseFloat(stkPushResponse.ResponseCode),
            resultDesc: stkPushResponse.ResponseDescription,
          }
        ),
        ctx.runMutation(api.features.transactions.createBundlesTransaction, {
          bundlesID: args.bundlesID,
          bundlesPrice: args.bundlesPrice,
          CheckoutRequestID: stkPushResponse.CheckoutRequestID,
          payingNumber: args.payingNumber,
          paymentAccount: args.paymentAccount,
          paymentMethod: args.paymentMethod,
          receivingNumber: args.receivingNumber,
          storeId: args.storeId,
          storeOwnerId: args.storeOwnerId,
        }),
      ]);

      // 7. Return success response
      return {
        status: "success",
        message: `M-Pesa STK sent to ${args.payingNumber}. Please enter your PIN.`,
      } as BackendResponse;
    } catch (error: any) {
      console.error("Payment process failed:", error.message, error.stack);
      return {
        status: "error",
        message: "Unexpected error. Please try again.",
      } as BackendResponse;
    }
  },
});

// Send SKIP| SMS with up to 3 retries, 2 seconds apart
async function sendSkipSmsWithRetry(ctx: any, phoneNumber: string, smsContent: string, userId: string): Promise<boolean> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const createdSMSId = await ctx.runMutation(api.features.sms.createSMS, {
        service: "STORE",
        userId,
        smsContent,
        smsReciepient: phoneNumber,
      });

      const response = await ctx.runAction(api.actions.sms.sendOTPSMS, {
        smsNumber: phoneNumber,
        smsContent,
        smsId: createdSMSId.data.id,
        service: "STORE",
      });

      if (response.status === "success" && response.data?.responses?.[0]?.["response-code"] === 200) {
        return true;
      }
    } catch (e) {
      console.error(`SKIP SMS attempt ${attempt} failed:`, e);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return false;
}
