import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";

export const storeEmailToken = internalMutation({
  args: {
    email: v.string(),
    userId: v.string(),
    token: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { email, userId, token, expiresAt }) => {
    // Remove any previous unverified tokens for this email
    const existing = await ctx.db
      .query("emailTokens")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const record of existing) {
      await ctx.db.delete(record._id);
    }
    await ctx.db.insert("emailTokens", {
      email,
      userId,
      token,
      isVerified: false,
      expiresAt,
    });
  },
});

export const verifyEmailToken = mutation({
  args: {
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { email, token }) => {
    const record = await ctx.db
      .query("emailTokens")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!record) {
      return { success: false, message: "No token found for this email." };
    }
    if (record.isVerified) {
      return { success: false, message: "Token already used." };
    }
    if (Date.now() > record.expiresAt) {
      return { success: false, message: "Token has expired. Please request a new one." };
    }
    if (record.token !== parseInt(token)) {
      return { success: false, message: "Invalid token." };
    }

    await ctx.db.patch(record._id, { isVerified: true });
    return { success: true };
  },
});
