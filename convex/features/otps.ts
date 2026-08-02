import { internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { mutation } from "../functions";

export const createOtp = mutation({
  args: { userId: v.string(), phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const { userId, phoneNumber } = args;

    // Generate a 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000);

    await ctx.db.insert("otps", {
      userId,
      phoneNumber,
      otpCode,
      isVerified: false,
    });

    return { success: true };
  },
});

// phoneNumber is optional for backward compatibility with older callers, but every
// known caller now passes it — an unscoped code-only match let a stale, unrelated
// unverified OTP satisfy a different phone number's verification.
export const verifyOtp = mutation({
  args: { otpCode: v.string(), phoneNumber: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { otpCode, phoneNumber } = args;

    const candidates = await ctx.db
      .query("otps")
      .withIndex("by_otp_code", (q) => q.eq("otpCode", parseInt(otpCode)))
      .order("desc")
      .collect();

    const now = Date.now();
    const otp = candidates.find(
      (c) =>
        !c.isVerified &&
        (!phoneNumber || c.phoneNumber === phoneNumber) &&
        (!c.expiresAt || c.expiresAt > now)
    );

    if (!otp) {
      return { success: false, message: "Invalid or expired OTP code." };
    }

    await ctx.db.patch(otp._id, { isVerified: true });

    return { success: true, message: "OTP verified successfully", userId: otp.userId };
  },
});

export const getLatestOtp = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const otp = await ctx.db
      .query("otps")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    return otp;
  },
});

// Internal mutation — bypasses the trigger that sends SMS to saved phoneNumber.
// Used by sendPhoneVerificationOtp action which sends SMS directly to the entered number.
export const storeVerificationOtp = internalMutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    otpCode: v.number(),
  },
  handler: async (ctx, { userId, phoneNumber, otpCode }) => {
    await ctx.db.insert("otps", {
      userId,
      phoneNumber,
      otpCode,
      isVerified: false,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  },
});
