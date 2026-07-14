import { v } from "convex/values";
import { mutation, internalMutation, query } from "../_generated/server";
import { api, internal } from "../_generated/api";

// Day boundary in Africa/Nairobi (EAT, UTC+3, no DST) — matches transactions.tsx
// nairobiStartOfDay() and the Android counters. NOT the server's UTC midnight, or sales
// made between midnight and 3 AM Kenya time get filed under the previous day and today reads short.
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
function getDayStart(timestamp: number): number {
  const shifted = timestamp + EAT_OFFSET_MS;
  return shifted - (shifted % 86_400_000) - EAT_OFFSET_MS;
}

// Internal helper — apply a delta to a user's daily stats record
export const applyDailyStatsDelta = internalMutation({
  args: {
    userId: v.string(),
    dayStart: v.number(),
    successfulDelta: v.number(),
    failedDelta: v.number(),
    totalDelta: v.number(),
    offerName: v.optional(v.string()),
    offerDelta: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, dayStart, successfulDelta, failedDelta, totalDelta, offerName, offerDelta } = args;

    const existing = await ctx.db
      .query("messageDailyStats")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayStart", dayStart))
      .first();

    if (existing) {
      const offerCounts = { ...(existing.offerCounts as Record<string, number>) };
      if (offerName && offerDelta) {
        const newCount = Math.max(0, (offerCounts[offerName] ?? 0) + offerDelta);
        if (newCount === 0) delete offerCounts[offerName];
        else offerCounts[offerName] = newCount;
      }
      await ctx.db.patch(existing._id, {
        successful: Math.max(0, existing.successful + successfulDelta),
        failed: Math.max(0, existing.failed + failedDelta),
        total: Math.max(0, existing.total + totalDelta),
        offerCounts,
      });
    } else if (totalDelta > 0 || successfulDelta > 0 || failedDelta > 0) {
      const offerCounts: Record<string, number> = {};
      if (offerName && offerDelta && offerDelta > 0) {
        offerCounts[offerName] = offerDelta;
      }
      await ctx.db.insert("messageDailyStats", {
        userId,
        dayStart,
        successful: Math.max(0, successfulDelta),
        failed: Math.max(0, failedDelta),
        total: Math.max(0, totalDelta),
        offerCounts,
      });
    }
  },
});

// One-time migration — processes messages in batches of 1000
// Call repeatedly until done === true
export const migrateUserMessageStats = mutation({
  args: {
    userId: v.string(),
    cursor: v.optional(v.string()),
    clearFirst: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, cursor, clearFirst }) => {
    // On first call (no cursor), clear existing stats
    if (!cursor && clearFirst !== false) {
      const existing = await ctx.db
        .query("messageDailyStats")
        .withIndex("by_user_day", (q) => q.eq("userId", userId))
        .collect();
      for (const e of existing) await ctx.db.delete(e._id);
    }

    // Fetch a batch of 1000 messages — NEWEST first (order desc). Today is the busiest
    // day and the one people look at, so processing it in the very first batch means it's
    // fully counted even if the self-scheduling chain later dies on the slow backend
    // (older days just fill in as the chain continues). Order doesn't change the final
    // per-day totals — it only decides which days are rebuilt first.
    const page = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id_time", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({ numItems: 1000, cursor: cursor ?? null });

    // Aggregate this batch into daily stats
    const dayMap = new Map<number, {
      successful: number; failed: number; total: number; offerCounts: Record<string, number>;
    }>();

    for (const m of page.page) {
      if (m.processed !== "successful" && m.processed !== "failed") continue;
      const dayKey = getDayStart(m.time);
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { successful: 0, failed: 0, total: 0, offerCounts: {} });
      }
      const day = dayMap.get(dayKey)!;
      day.total++;
      if (m.processed === "successful") {
        day.successful++;
        const offerName = ((m.offerName ?? "Unknown").trim() || "Unknown");
        day.offerCounts[offerName] = (day.offerCounts[offerName] ?? 0) + 1;
      } else if (m.processed === "failed") {
        day.failed++;
      }
    }

    // Upsert aggregated days into messageDailyStats
    for (const [dayStart, stats] of dayMap.entries()) {
      const existing = await ctx.db
        .query("messageDailyStats")
        .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayStart", dayStart))
        .first();
      if (existing) {
        const offerCounts = { ...(existing.offerCounts as Record<string, number>) };
        for (const [offer, count] of Object.entries(stats.offerCounts)) {
          offerCounts[offer] = (offerCounts[offer] ?? 0) + count;
        }
        await ctx.db.patch(existing._id, {
          successful: existing.successful + stats.successful,
          failed: existing.failed + stats.failed,
          total: existing.total + stats.total,
          offerCounts,
        });
      } else {
        await ctx.db.insert("messageDailyStats", { userId, dayStart, ...stats });
      }
    }

    // Continue the backfill SERVER-SIDE: if there are more messages, schedule the next
    // batch (carrying the cursor internally, with clearFirst:false so it never re-wipes).
    // The cursor never has to survive a round-trip through the terminal, so it can't be
    // misread and restart from the top — you call this once with clearFirst:true and it
    // pages through everything on its own until done.
    if (!page.isDone) {
      await ctx.scheduler.runAfter(250, api.features.messageDailyStats.migrateUserMessageStats, {
        userId,
        cursor: page.continueCursor,
        clearFirst: false,
      });
    }

    return {
      done: page.isDone,
      nextCursor: page.isDone ? null : page.continueCursor,
      batchProcessed: page.page.length,
    };
  },
});

// Read daily stats for the statistics page
export const getDailyStatsForUser = query({
  args: { userId: v.string(), startTime: v.number(), endTime: v.number() },
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
