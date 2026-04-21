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

export const verifyOtp = mutation({
  args: { otpCode: v.string() },
  handler: async (ctx, args) => {
    const { otpCode } = args;

    const otp = await ctx.db
      .query("otps")
      .withIndex("by_otp_code", (q) => q.eq("otpCode", parseInt(otpCode)))
      .order("desc")
      .first();

    if (!otp || otp.otpCode !== parseInt(otpCode)) {
      return { success: false, message: "Invalid OTP Code" };
    }
    if (!otp || otp.otpCode !== parseInt(otpCode)) {
      return { success: false, message: "Invalid OTP Code" };
    }
    if (!otp || otp.otpCode !== parseInt(otpCode)) {
      return { success: false, message: "Invalid OTP Code" };
    }

    if (otp.isVerified) {
      return { success: false, message: "Invalid OTP Code" };
    }

    await ctx.db.patch(otp._id, { isVerified: true });

    return { success: true, message: "OTP verified successfully" , userId: otp.userId};
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
    });
  },
});
