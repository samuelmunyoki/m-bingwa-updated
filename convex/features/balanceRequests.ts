import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const createBalanceRequest = mutation({
  args: { userId: v.string(), deviceId: v.string(), simSlot: v.optional(v.string()) },
  handler: async (ctx, { userId, deviceId, simSlot }) => {
    const existing = await ctx.db
      .query("balanceRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    for (const r of existing) {
      await ctx.db.patch(r._id, { status: "failed", error: "Superseded by new request" });
    }

    const requestId = await ctx.db.insert("balanceRequests", {
      userId,
      deviceId,
      simSlot,
      status: "pending",
      requestedAt: Date.now(),
    });
    return requestId;
  },
});

export const submitBalanceResult = mutation({
  args: {
    requestId: v.string(),
    airtimeBalance: v.string(),
    bongaPoints: v.string(),
    expiryDate: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, airtimeBalance, bongaPoints, expiryDate }) => {
    const id = ctx.db.normalizeId("balanceRequests", requestId);
    if (!id) return { status: "error", error: "Invalid requestId" };
    await ctx.db.patch(id, {
      status: "completed",
      completedAt: Date.now(),
      airtimeBalance,
      bongaPoints,
      expiryDate: expiryDate ?? "",
    });
    return { status: "success" };
  },
});

export const failBalanceRequest = mutation({
  args: { requestId: v.string(), error: v.string() },
  handler: async (ctx, { requestId, error }) => {
    const id = ctx.db.normalizeId("balanceRequests", requestId);
    if (!id) return;
    await ctx.db.patch(id, { status: "failed", error, completedAt: Date.now() });
  },
});

export const getLatestBalanceRequest = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("balanceRequests")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

export const getFcmToken = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("fcmTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const upsertFcmToken = mutation({
  args: { userId: v.string(), deviceId: v.string(), token: v.string() },
  handler: async (ctx, { userId, deviceId, token }) => {
    const existing = await ctx.db
      .query("fcmTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { token, deviceId, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("fcmTokens", { userId, deviceId, token, updatedAt: Date.now() });
    }
    return { status: "success" };
  },
});
