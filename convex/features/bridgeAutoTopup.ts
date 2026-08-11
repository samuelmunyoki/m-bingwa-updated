import { mutation } from "../_generated/server";
import { v } from "convex/values";

// ── Settings ──────────────────────────────────────────────────────────────────

export const upsertSettings = mutation({
  args: { userId: v.string(), isEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bridgeAutoTopupSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { isEnabled: args.isEnabled, updatedAt: Date.now() });
      return { id: existing._id.toString() };
    }
    const id = await ctx.db.insert("bridgeAutoTopupSettings", {
      userId: args.userId,
      isEnabled: args.isEnabled,
      updatedAt: Date.now(),
    });
    return { id: id.toString() };
  },
});

// ── Watch records ─────────────────────────────────────────────────────────────

export const upsertWatch = mutation({
  args: {
    userId: v.string(),
    originalMessageId: v.string(),
    phoneNumber: v.string(),
    originalAmount: v.number(),
    reason: v.string(),
    failedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete any existing watch for this phone (keep only the latest)
    const existing = await ctx.db
      .query("bridgeAutoTopupWatch")
      .withIndex("by_user_phone", (q) =>
        q.eq("userId", args.userId).eq("phoneNumber", args.phoneNumber)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    const id = await ctx.db.insert("bridgeAutoTopupWatch", {
      userId: args.userId,
      originalMessageId: args.originalMessageId,
      phoneNumber: args.phoneNumber,
      originalAmount: args.originalAmount,
      reason: args.reason,
      failedAt: args.failedAt,
      createdAt: Date.now(),
    });
    return { id: id.toString() };
  },
});

export const deleteWatch = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("bridgeAutoTopupWatch")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const entry = entries.find((e) => e._id.toString() === args.id);
    if (!entry) {
      // Already gone (e.g. already deleted, or cleaned up elsewhere) — harmless no-op instead
      // of throwing. Deleting something that's already gone shouldn't be an error (2026-08-11).
      return { success: true, alreadyGone: true };
    }
    await ctx.db.delete(entry._id);
    return { success: true };
  },
});

// ── History records ───────────────────────────────────────────────────────────

export const insertHistory = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    originalAmount: v.number(),
    topupAmount: v.number(),
    combinedAmount: v.number(),
    bridgeOfferName: v.string(),
    deviceName: v.string(),
    bridgedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("bridgeAutoTopupHistory", {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      originalAmount: args.originalAmount,
      topupAmount: args.topupAmount,
      combinedAmount: args.combinedAmount,
      bridgeOfferName: args.bridgeOfferName,
      deviceName: args.deviceName,
      bridgedAt: args.bridgedAt,
      createdAt: Date.now(),
    });
    return { id: id.toString() };
  },
});
