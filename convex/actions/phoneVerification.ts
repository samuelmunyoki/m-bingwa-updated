"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";

const COOLDOWN_MS = 60 * 1000;

// Some telcos silently drop back-to-back SMS with identical body text to the same
// number (bites on quick "resend" taps) — this suffix keeps each message unique.
function randomSuffix(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 11 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

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

    const cooldownUntil = await ctx.runQuery(api.features.cooldown.getCooldownTimer, { userId });
    if (cooldownUntil && cooldownUntil > Date.now()) {
      const waitSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
      return { success: false, message: `Please wait ${waitSeconds}s before requesting another code.` };
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
          message: `Your M-Bingwa verification code is: ${otpCode}. Do not share this code with anyone.\n${randomSuffix()}\n`,
          shortcode: smsSenderID,
          mobile: phoneNumber,
        }),
      });

      if (!response.ok) {
        return { success: false, message: "Failed to send OTP. Please try again." };
      }

      await ctx.runMutation(api.features.cooldown.setCooldownTimer, {
        userId,
        expiresAt: Date.now() + COOLDOWN_MS,
      });

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  },
});
