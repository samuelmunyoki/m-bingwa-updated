"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { BackendResponse } from "../../lib/custom_types";

const DEVICE_ONLINE_THRESHOLD_MS = 60_000; // matches getBatchDeviceOnlineStatus in serviceStatus.ts
const SKIP_ACK_MAX_WAIT_MS = 5_000;
const SKIP_ACK_POLL_INTERVAL_MS = 400;

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
    let skipId: Id<"pendingSkips"> | undefined;
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

      // 2. Liveness pre-filter — fail fast if the store owner's device hasn't heartbeated
      // recently, instead of discovering that after sending a skip signal nobody's there to ack.
      const heartbeat = await ctx.runQuery(
        api.features.serviceStatus.getDeviceHeartbeatByUserId,
        { userId: args.storeOwnerId }
      );
      const isDeviceOnline =
        !!heartbeat.lastSeenTimestamp &&
        Date.now() - heartbeat.lastSeenTimestamp < DEVICE_ONLINE_THRESHOLD_MS;
      if (!isDeviceOnline) {
        return {
          status: "error",
          message: "Could not reach device. Please try again.",
        } as BackendResponse;
      }

      // 3. Create the SKIP signal in Convex and wait for the app to acknowledge it over the
      // live push (see skips.ts) before sending any money-moving request — this is what
      // actually closes the race against the real M-Pesa SMS, not just the heartbeat check above.
      skipId = await ctx.runMutation(api.features.skips.createSkipEntry, {
        userId: args.storeOwnerId,
        phoneNumber: args.payingNumber,
      });
      if (!skipId) {
        return {
          status: "error",
          message: "Could not reach device. Please try again.",
        } as BackendResponse;
      }

      const acknowledged = await waitForSkipAck(ctx, skipId);
      if (!acknowledged) {
        await ctx.runMutation(api.features.skips.releaseSkip, { skipId });
        return {
          status: "error",
          message: "Could not reach device. Please try again.",
        } as BackendResponse;
      }

      // Initiate Mpesa STK Push
      let stkPushResponse;
      try {
        stkPushResponse = await ctx.runAction(
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
      } catch (stkError) {
        // Never sent — free the number immediately rather than leaving it skipped for the TTL.
        await ctx.runMutation(api.features.skips.releaseSkip, { skipId });
        throw stkError;
      }

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
          skipId,
        }),
      ]);
      // From here on, releasing the skip is updateTransactionStatus's job (via postStKPushCallback)
      // once the STK result is known, plus the TTL sweep in skips.ts as a last-resort safety net.

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

// Polls the skip entry created above until the app acknowledges it (via the pending-skips push)
// or the budget runs out. Bounded wait, not a blind delay — replaces the old fixed 8s SMS buffer.
async function waitForSkipAck(ctx: any, skipId: Id<"pendingSkips">): Promise<boolean> {
  const attempts = Math.ceil(SKIP_ACK_MAX_WAIT_MS / SKIP_ACK_POLL_INTERVAL_MS);
  for (let i = 0; i < attempts; i++) {
    const { status } = await ctx.runQuery(api.features.skips.getSkipStatus, { skipId });
    if (status === "acknowledged") return true;
    if (status === "released") return false;
    await new Promise((resolve) => setTimeout(resolve, SKIP_ACK_POLL_INTERVAL_MS));
  }
  return false;
}

// ============= RETIRED 2026-07-29 — SKIP signal now goes through Convex (skips.ts) instead of
// SMS, see payBundle above. Left in place, unused, per the "comment out don't delete" preference.
// ============================================================================================
// // Send SKIP| SMS with up to 3 retries, 2 seconds apart
// async function sendSkipSmsWithRetry(ctx: any, phoneNumber: string, smsContent: string, userId: string): Promise<boolean> {
//   const MAX_RETRIES = 3;
//   const RETRY_DELAY_MS = 2000;
//
//   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//     try {
//       const createdSMSId = await ctx.runMutation(api.features.sms.createSMS, {
//         service: "STORE",
//         userId,
//         smsContent,
//         smsReciepient: phoneNumber,
//       });
//
//       const response = await ctx.runAction(api.actions.sms.sendOTPSMS, {
//         smsNumber: phoneNumber,
//         smsContent,
//         smsId: createdSMSId.data.id,
//         service: "STORE",
//       });
//
//       console.log(`SKIP SMS attempt ${attempt} raw gateway response:`, JSON.stringify(response));
//
//       if (response.status === "success" && response.data?.responses?.[0]?.["response-code"] === 200) {
//         return true;
//       }
//     } catch (e) {
//       console.error(`SKIP SMS attempt ${attempt} failed:`, e);
//     }
//
//     if (attempt < MAX_RETRIES) {
//       await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
//     }
//   }
//   return false;
// }
