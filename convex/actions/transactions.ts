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

      // 2. Create an SMS record
      const timestamp = Math.floor(new Date().getTime() / 1000);
      const smsContent = `IT|${args.payingNumber}|${args.receivingNumber}|${timestamp}`;
      const createdSMSId = await ctx.runMutation(api.features.sms.createSMS, {
        service: "STORE",
        userId: args.storeOwnerId,
        smsContent,
        smsReciepient: storeOwnerData?.phoneNumber,
      });

      // 3. Send OTP SMS
      const otpSmsResponse = await ctx.runAction(api.actions.sms.sendOTPSMS, {
        smsNumber: storeOwnerData.phoneNumber,
        smsContent,
        smsId: createdSMSId.data.id,
        service: "STORE",
      });

      if (
        otpSmsResponse.status !== "success" ||
        !otpSmsResponse.data.responses
      ) {
        return {
          status: "error",
          message: "Purchase failed or timed out. Please try again.",
        } as BackendResponse;
      }

      const smsDetails = otpSmsResponse.data.responses[0];
      if (smsDetails["response-code"] !== 200 || !smsDetails.messageid) {
        return {
          status: "error",
          message: "Purchase failed or timed out. Please try again.",
        } as BackendResponse;
      }

      // Check OTP SMS delivery status
      const deliveryStatus = await checkSMSDelivery(ctx, smsDetails.messageid);

      if (deliveryStatus !== "DeliveredToTerminal") {
        return {
          status: "error",
          message: "Purchase failed or timed out. Please try again.",
        } as BackendResponse;
      }

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

// Helper function to check SMS delivery status
async function checkSMSDelivery(ctx: any, messageId: string): Promise<string> {
  const startTime = Date.now();
  let deliveryStatus = "";
  let retries = 0;

  while (Date.now() - startTime < 45000) {
    // Check for 45 seconds
    const deliveryReport = await ctx.runAction(
      api.actions.sms.getDeliveryReport,
      { messageId }
    );
    // Mmh the M-bingwa agent got the IT| OTP?
    if (deliveryReport.status === "success" && deliveryReport.data) {
      deliveryStatus = deliveryReport.data.deliveryDescription;
      if (deliveryStatus === "DeliveredToTerminal") {
        break;
      }
    }
    // Let's give up and timeout
    retries++;
    if (retries > 225) {
      break; 
    }
    // I am impatient, lets Wait for 200ms before checking again (API has no rate limit? spam!)
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  //  Return whatever we got.
  return deliveryStatus;
}
