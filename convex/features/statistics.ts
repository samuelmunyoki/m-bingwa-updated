import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const getMessagesForStats = query({
  args: {
    userId: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, { userId, startTime, endTime }) => {
    const stats = await ctx.db
      .query("messageDailyStats")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", userId).gte("dayStart", startTime)
      )
      .filter((q) => q.lte(q.field("dayStart"), endTime))
      .collect();

    const byStatus: Record<string, number> = {};
    let totalMessages = 0;

    for (const d of stats) {
      byStatus["successful"] = (byStatus["successful"] ?? 0) + d.successful;
      byStatus["failed"] = (byStatus["failed"] ?? 0) + d.failed;
      totalMessages += d.total;
    }

    return {
      dailyStats: stats.map(d => ({
        dayStart: d.dayStart,
        successful: d.successful,
        failed: d.failed,
        total: d.total,
        offerCounts: d.offerCounts as Record<string, number>,
      })),
      byStatus,
      totalMessages,
    };
  },
});

export const getCommissionByTypeInRange = query({
  args: {
    userId: v.string(),
    startDay: v.number(),
    endDay: v.number(),
  },
  handler: async (ctx, { userId, startDay, endDay }) => {
    const records = await ctx.db
      .query("commissionByType")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(q.gte(q.field("day"), startDay), q.lte(q.field("day"), endDay))
      )
      .collect();
    return records;
  },
});

export const getAutoSaverStatsInRange = query({
  args: {
    userId: v.string(),
    startDay: v.number(),
    endDay: v.number(),
  },
  handler: async (ctx, { userId, startDay, endDay }) => {
    const records = await ctx.db
      .query("autoSaverStats")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(q.gte(q.field("day"), startDay), q.lte(q.field("day"), endDay))
      )
      .collect();
    return records;
  },
});

export const upsertCommissionByType = mutation({
  args: {
    userId: v.string(),
    day: v.number(),
    offerType: v.string(),
    commissionAmount: v.number(),
    salesCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("commissionByType")
      .withIndex("by_user_day_type", (q) =>
        q.eq("userId", args.userId).eq("day", args.day).eq("offerType", args.offerType)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        commissionAmount: args.commissionAmount,
        salesCount: args.salesCount,
      });
      return { success: true, action: "updated" };
    }
    await ctx.db.insert("commissionByType", {
      userId: args.userId,
      day: args.day,
      offerType: args.offerType,
      commissionAmount: args.commissionAmount,
      salesCount: args.salesCount,
    });
    return { success: true, action: "created" };
  },
});

export const upsertAutoSaverStats = mutation({
  args: {
    userId: v.string(),
    day: v.number(),
    savedCount: v.number(),
    skippedCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("autoSaverStats")
      .withIndex("by_user_and_day", (q) =>
        q.eq("userId", args.userId).eq("day", args.day)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        savedCount: args.savedCount,
        skippedCount: args.skippedCount,
      });
      return { success: true, action: "updated" };
    }
    await ctx.db.insert("autoSaverStats", {
      userId: args.userId,
      day: args.day,
      savedCount: args.savedCount,
      skippedCount: args.skippedCount,
    });
    return { success: true, action: "created" };
  },
});
