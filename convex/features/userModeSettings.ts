import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get mode settings for a specific user.
 * Returns default (Normal mode ON) if no record exists yet.
 */
export const getUserModeSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("userModeSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!record) {
      // Return defaults if user has no saved mode settings yet
      return {
        userId: args.userId,
        isNormalMode: true,
        isSimpleMode: false,
        isAdvancedMode: false,
        updatedAt: 0,
      };
    }

    return record;
  },
});

/**
 * Upsert mode settings for a specific user.
 * Creates if not exists, updates if exists.
 */
export const upsertUserModeSettings = mutation({
  args: {
    userId: v.string(),
    isNormalMode: v.boolean(),
    isSimpleMode: v.boolean(),
    isAdvancedMode: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userModeSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isNormalMode: args.isNormalMode,
        isSimpleMode: args.isSimpleMode,
        isAdvancedMode: args.isAdvancedMode,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userModeSettings", {
        userId: args.userId,
        isNormalMode: args.isNormalMode,
        isSimpleMode: args.isSimpleMode,
        isAdvancedMode: args.isAdvancedMode,
        updatedAt: Date.now(),
      });
    }

    return {
      status: "success",
      message: "Mode settings saved successfully",
    };
  },
});