"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const sendPhoneVerificationOtp = action({
  args: {
    phoneNumber: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { phoneNumber, userId }) => {
    const smsApiKey = process.env.SMS_API_KEY;
    const smsPartnerID = process.env.SMS_PARTNER_ID;
    const smsSenderID = process.env.SMS_SENDER_ID;
    const smsEndpoint = process.env.SMS_SEND_ENDPOINT;

    if (!smsApiKey || !smsPartnerID || !smsEndpoint || !smsSenderID) {
      return { success: false, message: "SMS service not configured." };
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000);

    await ctx.runMutation(internal.features.otps.storeVerificationOtp, {
      userId,
      phoneNumber,
      otpCode,
    });

    try {
      const response = await fetch(smsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: smsApiKey,
          partnerID: smsPartnerID,
          message: `Your M-Bingwa verification code is: ${otpCode}. Do not share this code with anyone.`,
          shortcode: smsSenderID,
          mobile: phoneNumber,
        }),
      });

      if (!response.ok) {
        return { success: false, message: "Failed to send OTP. Please try again." };
      }

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  },
});
