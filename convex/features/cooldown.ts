import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const setCooldownTimer = mutation({
  args: { userId: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const { userId, expiresAt } = args;

    const existingCooldown = await ctx.db
      .query("cooldownTimers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingCooldown) {
      await ctx.db.patch(existingCooldown._id, { expiresAt });
    } else {
      await ctx.db.insert("cooldownTimers", { userId, expiresAt });
    }

    return { success: true };
  },
});

export const getCooldownTimer = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const cooldown = await ctx.db
      .query("cooldownTimers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return cooldown?.expiresAt || null;
  },
});
