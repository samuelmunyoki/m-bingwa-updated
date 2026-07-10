import { internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
 
export const insertLogs = mutation({
  args: {
    logs: v.array(v.object({
      userId: v.optional(v.string()),
      deviceModel: v.string(),
      deviceManufacturer: v.string(),
      androidVersion: v.string(),
      tag: v.string(),
      message: v.string(),
      level: v.string(),
      timestamp: v.number(),
      sessionId: v.string(),
    }))
  },
  handler: async (ctx, args) => {
    for (const log of args.logs) {
      await ctx.db.insert("appLogs", log);
    }
    return { status: "success", count: args.logs.length };
  },
});
 
export const getLogsByManufacturer = query({
  args: {
    manufacturer: v.string(),
    limit: v.optional(v.number()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    const manufacturer = args.manufacturer.toLowerCase();

    if (args.tag) {
      return await ctx.db
        .query("appLogs")
        .withIndex("by_manufacturer_tag", (q) =>
          q.eq("deviceManufacturer", manufacturer).eq("tag", args.tag!)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("appLogs")
      .withIndex("by_device", (q) =>
        q.eq("deviceManufacturer", manufacturer)
      )
      .order("desc")
      .take(limit);
  },
});
 
export const getLogsBySession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appLogs")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});
 
export const getLogsByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    return await ctx.db
      .query("appLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});
 
export const clearOldLogs = mutation({
  args: { olderThanMs: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const logs = await ctx.db
      .query("appLogs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(500); // delete 500 at a time
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    return logs.length;
  },
});

export const clearAllLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("appLogs").take(500);
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    return logs.length;
  },
});

// ── App-log cleanup ───────────────────────────────────────────────────────────
// Retention window: keep only the last 4h of logs (short on purpose — logs are only needed when
// actively tracking something). Batches are throttled so draining a large backlog never overwhelms
// Convex the way the old runAfter(0) chain did.
const LOG_RETENTION_MS = 4 * 60 * 60 * 1000; // 4 hours
const LOG_DELETE_BATCH = 1000;
const LOG_PRUNE_DELAY_MS = 1000; // gap between retention batches
const LOG_WIPE_DELAY_MS = 500;   // gap between manual full-wipe batches

// CRON target: delete ONLY logs older than the retention window (uses the by_timestamp index), in
// throttled batches, rescheduling ONLY while old logs remain — so it TERMINATES (the backlog is
// finite) instead of chasing the whole still-growing table forever, which is what overwhelmed the
// scheduler before.
export const pruneOldLogsScheduled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - LOG_RETENTION_MS;
    const logs = await ctx.db
      .query("appLogs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(LOG_DELETE_BATCH);
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    if (logs.length === LOG_DELETE_BATCH) {
      await ctx.scheduler.runAfter(LOG_PRUNE_DELAY_MS, internal.features.appLogs.pruneOldLogsScheduled, {});
    }
  },
});

// Manual full wipe (triggered by the deleteLogsHandler HTTP endpoint): deletes ALL logs in throttled
// batches. Kept for on-demand clears; now paced (was runAfter(0)) so it won't hammer Convex.
export const clearAllLogsScheduled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("appLogs").take(LOG_DELETE_BATCH);
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    if (logs.length === LOG_DELETE_BATCH) {
      await ctx.scheduler.runAfter(LOG_WIPE_DELAY_MS, internal.features.appLogs.clearAllLogsScheduled, {});
    }
  },
});

export const countAllLogs = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("appLogs").take(16384);
    return { count: logs.length, isMore: logs.length === 16384 };
  },
});