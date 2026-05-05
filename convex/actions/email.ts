"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const sendEmailToken = action({
  args: {
    email: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { email, userId }) => {
    const token = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await ctx.runMutation(internal.features.emailTokens.storeEmailToken, {
      email,
      userId,
      token,
      expiresAt,
    });

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.log(`[DEV] Email token for ${email}: ${token}`);
      return { success: true, dev: true, devToken: token.toString() };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "M-Bingwa <noreply@m-bingwa.com>",
          to: [email],
          subject: "Your M-Bingwa Verification Code",
          html: `<p>Your M-Bingwa email verification code is:</p><h2>${token}</h2><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
        }),
      });

      if (!response.ok) {
        return { success: false, message: "Failed to send email. Please try again." };
      }

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  },
});
