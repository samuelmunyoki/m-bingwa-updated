import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// For sms/dialer/scheduled: created only from the website's own delete handlers (transactions
// page, scheduler page) — never from the shared deleteMpesaMessage/deleteUSSDHistory/
// deleteScheduledEvent mutations, since those are also called by the app's own delete flow via
// the mobile HTTP handler, and app-initiated deletes must not signal themselves.
// For bridge: only ever created by the scheduled cleanup cron (deleteOldOnlineBridgeTransactions
// in onlineBridge.ts, TODO) — deleteOnlineBridgeTransaction itself does NOT signal, since
// bridge deletes are app-initiated only (single device per account) and the app already cleans
// up its own local copy in the same call.
export const createPendingDeletion = mutation({
  args: {
    userId: v.string(),
    type: v.union(v.literal("sms"), v.literal("dialer"), v.literal("scheduled"), v.literal("bridge")),
    convexId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingDeletions", {
      userId: args.userId,
      type: args.type,
      convexId: args.convexId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Subscribed live by the app (HeartbeatService) — only entries it hasn't recorded yet.
export const getPendingDeletions = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingDeletions")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();
  },
});

// Called by the app once it has deleted the record from its local database.
// Idempotent: a second call (e.g. a re-fired subscription) is a no-op.
export const acknowledgeDeletion = mutation({
  args: { deletionId: v.id("pendingDeletions") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.deletionId);
    if (!entry || entry.status !== "pending") {
      return { status: entry?.status ?? "unknown" };
    }
    await ctx.db.patch(args.deletionId, {
      status: "acknowledged",
      acknowledgedAt: Date.now(),
    });
    return { status: "acknowledged" };
  },
});
