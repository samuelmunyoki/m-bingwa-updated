import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

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
    ussdResponse: v.optional(v.string())
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
      createdAt: Date.now(),
      updatedAt: Date.now()
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