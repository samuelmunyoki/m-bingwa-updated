import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

// ============= USSD HISTORY MUTATIONS =============

export const createUSSDHistory = mutation({
  args: {
    userId: v.string(),
    ussdCode: v.string(),
    targetNumber: v.optional(v.string()),
    offerName: v.optional(v.string()),
    status: v.string(),
    timeTaken: v.string(),
    timeStamp: v.string(),
    ussdResponse: v.optional(v.string()),
    source: v.optional(v.string()),
    // Execution params for web-dial records
    dialingSim: v.optional(v.string()),
    isMultiSession: v.optional(v.boolean()),
    isSimpleUSSD: v.optional(v.boolean()),
    responseValidatorText: v.optional(v.string()),
    bundleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate using composite key
    const existing = await ctx.db
      .query("ussdHistory")
      .withIndex("by_composite_key", (q) =>
        q.eq("userId", args.userId)
         .eq("timeStamp", args.timeStamp)
         .eq("ussdCode", args.ussdCode)
      )
      .first();

    if (existing) {
      // If exact duplicate exists, return existing ID instead of creating new
      return existing._id;
    }

    const historyId = await ctx.db.insert("ussdHistory", {
      userId: args.userId,
      ussdCode: args.ussdCode,
      targetNumber: args.targetNumber,
      offerName: args.offerName,
      status: args.status,
      timeTaken: args.timeTaken,
      timeStamp: args.timeStamp,
      ussdResponse: args.ussdResponse,
      source: args.source ?? "android",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dialingSim: args.dialingSim,
      isMultiSession: args.isMultiSession,
      isSimpleUSSD: args.isSimpleUSSD,
      responseValidatorText: args.responseValidatorText,
      bundleId: args.bundleId,
    });

    return historyId;
  }
});

export const deleteUSSDHistory = mutation({
  args: { 
    historyId: v.id("ussdHistory"),
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const historyItem = await ctx.db.get(args.historyId);
    
    if (!historyItem || historyItem.userId !== args.userId) {
      throw new Error("History item not found or unauthorized");
    }

    await ctx.db.delete(args.historyId);
  }
});

export const clearUSSDHistory = mutation({
  args: {
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const historyItems = await ctx.db
      .query("ussdHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Delete all history items for this user
    for (const item of historyItems) {
      await ctx.db.delete(item._id);
    }

    return { deletedCount: historyItems.length };
  }
});

// ============= USSD HISTORY QUERIES =============

export const getUSSDHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("ussdHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc") // Most recent first
      .collect();

    return history;
  }
});

export const getUSSDHistoryByStatus = query({
  args: { 
    userId: v.string(),
    status: v.string()
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("ussdHistory")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", args.userId).eq("status", args.status)
      )
      .order("desc")
      .collect();

    return history;
  }
});

export const getAvailableStatuses = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("ussdHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Extract unique statuses
    const statuses = [...new Set(history.map(item => item.status))];
    return statuses.sort();
  }
});

// ============= WEB DIAL MUTATIONS/QUERIES =============

/** Android polls this every 30s — returns PENDING web-dial records for a user */
export const getPendingWebDials = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ussdHistory")
      .withIndex("by_user_source_status", (q) =>
        q.eq("userId", args.userId)
         .eq("source", "web-dial")
         .eq("status", "PENDING")
      )
      .collect();
  },
});

/** Android calls this immediately after picking up a PENDING dial — prevents double-execution */
export const markWebDialExecuting = mutation({
  args: { historyId: v.id("ussdHistory") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.historyId);
    if (!item) throw new Error("Record not found");
    // Only mark if still PENDING — guard against race conditions
    if (item.status !== "PENDING") return;
    await ctx.db.patch(args.historyId, {
      status: "EXECUTING",
      updatedAt: Date.now(),
    });
  },
});

/** Android calls this after execution completes to write the result back */
export const updateWebDialStatus = mutation({
  args: {
    historyId: v.id("ussdHistory"),
    status: v.string(),
    ussdResponse: v.optional(v.string()),
    timeTaken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.historyId);
    if (!item) throw new Error("Record not found");
    await ctx.db.patch(args.historyId, {
      status: args.status,
      ...(args.ussdResponse !== undefined && { ussdResponse: args.ussdResponse }),
      ...(args.timeTaken !== undefined && { timeTaken: args.timeTaken }),
      updatedAt: Date.now(),
    });
  },
});
export const getCountsByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("ussdHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return {
      total: all.length,
      successful: all.filter(d => d.status === "Success").length,
      failed: all.filter(d => d.status === "Failed" || d.status === "Timeout" || d.status === "Cancelled").length,
      pending: all.filter(d => d.status === "PENDING" || d.status === "EXECUTING").length,
    };
  },
});

export const getUSSDHistoryPaginated = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ussdHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getTodayCounts = query({
  args: { userId: v.string(), startTime: v.number() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("ussdHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const today = all.filter((d) => {
      const ts = new Date(d.timeStamp).getTime();
      return !isNaN(ts) && ts >= args.startTime;
    });
    return {
      successful: today.filter((d) => d.status === "Success").length,
      failed: today.filter((d) => ["Failed", "Timeout", "Cancelled"].includes(d.status)).length,
      pending: today.filter((d) => ["PENDING", "EXECUTING"].includes(d.status)).length,
    };
  },
});
