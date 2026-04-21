import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Query to get total commission by userId and day
 */
export const getByUserAndDay = query({
  args: {
    userId: v.string(),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const commission = await ctx.db
      .query("totalCommission")
      .withIndex("by_user_and_day", (q) =>
        q.eq("userId", args.userId).eq("day", args.day)
      )
      .first();

    return commission;
  },
});

/**
 * Query to get all commissions for a user
 */
export const getByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const commissions = await ctx.db
      .query("totalCommission")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    return commissions;
  },
});

/**
 * Query to get commissions for a user within a date range
 */
export const getByUserIdAndDateRange = query({
  args: {
    userId: v.string(),
    startDay: v.number(),
    endDay: v.number(),
  },
  handler: async (ctx, args) => {
    const allCommissions = await ctx.db
      .query("totalCommission")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by date range
    const commissionsInRange = allCommissions.filter(
      (commission) =>
        commission.day >= args.startDay && commission.day <= args.endDay
    );

    // Sort by day ascending
    commissionsInRange.sort((a, b) => a.day - b.day);

    return commissionsInRange;
  },
});

/**
 * Query to get all commissions for a specific day
 */
export const getByDay = query({
  args: {
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const commissions = await ctx.db
      .query("totalCommission")
      .withIndex("by_day", (q) => q.eq("day", args.day))
      .collect();

    return commissions;
  },
});

/**
 * Mutation to create or update total commission
 * If a record exists for the user and day, it updates it; otherwise, it creates a new one
 */
export const upsertTotalCommission = mutation({
  args: {
    userId: v.string(),
    day: v.number(),
    totalCommissionAmount: v.number(),
    totalAirtimeUsed: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if record exists
    const existingCommission = await ctx.db
      .query("totalCommission")
      .withIndex("by_user_and_day", (q) =>
        q.eq("userId", args.userId).eq("day", args.day)
      )
      .first();

    if (existingCommission) {
      // Update existing record
      await ctx.db.patch(existingCommission._id, {
        totalCommissionAmount: args.totalCommissionAmount,
        totalAirtimeUsed: args.totalAirtimeUsed,
      });
      return { success: true, id: existingCommission._id, action: "updated" };
    } else {
      // Create new record
      const newId = await ctx.db.insert("totalCommission", {
        userId: args.userId,
        day: args.day,
        totalCommissionAmount: args.totalCommissionAmount,
        totalAirtimeUsed: args.totalAirtimeUsed,
      });
      return { success: true, id: newId, action: "created" };
    }
  },
});

/**
 * Mutation to increment total commission and airtime by specific amounts
 * If record doesn't exist, creates it with the amounts
 */
export const incrementTotalCommission = mutation({
  args: {
    userId: v.string(),
    day: v.number(),
    commissionAmount: v.number(),
    airtimeAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if record exists
    const existingCommission = await ctx.db
      .query("totalCommission")
      .withIndex("by_user_and_day", (q) =>
        q.eq("userId", args.userId).eq("day", args.day)
      )
      .first();

    if (existingCommission) {
      // Increment existing amounts
      const newCommissionTotal = existingCommission.totalCommissionAmount + args.commissionAmount;
      const newAirtimeTotal = (existingCommission.totalAirtimeUsed ?? 0) + args.airtimeAmount;
      await ctx.db.patch(existingCommission._id, {
        totalCommissionAmount: newCommissionTotal,
        totalAirtimeUsed: newAirtimeTotal,
      });
      return {
        success: true,
        id: existingCommission._id,
        action: "incremented",
        newCommissionTotal,
        newAirtimeTotal,
      };
    } else {
      // Create new record with the amounts
      const newId = await ctx.db.insert("totalCommission", {
        userId: args.userId,
        day: args.day,
        totalCommissionAmount: args.commissionAmount,
        totalAirtimeUsed: args.airtimeAmount,
      });
      return {
        success: true,
        id: newId,
        action: "created",
        newCommissionTotal: args.commissionAmount,
        newAirtimeTotal: args.airtimeAmount,
      };
    }
  },
});

/**
 * Mutation to delete a commission record
 */
export const deleteTotalCommission = mutation({
  args: {
    userId: v.string(),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const commission = await ctx.db
      .query("totalCommission")
      .withIndex("by_user_and_day", (q) =>
        q.eq("userId", args.userId).eq("day", args.day)
      )
      .first();

    if (commission) {
      await ctx.db.delete(commission._id);
      return { success: true, message: "Commission record deleted" };
    }

    return { success: false, message: "Commission record not found" };
  },
});
