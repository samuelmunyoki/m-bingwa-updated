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
    const q = ctx.db
      .query("appLogs")
      .withIndex("by_device", (q) =>
        q.eq("deviceManufacturer", args.manufacturer.toLowerCase())
      );

    if (args.tag) {
      return await q
        .filter((q) => q.eq(q.field("tag"), args.tag))
        .order("desc")
        .take(limit);
    }

    return await q.order("desc").take(limit);
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

// Self-scheduling: deletes 500 logs then reschedules itself until table is empty
export const clearAllLogsScheduled = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("appLogs").take(500);
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    if (logs.length === 500) {
      await ctx.scheduler.runAfter(0, internal.features.appLogs.clearAllLogsScheduled, {});
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