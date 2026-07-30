import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";

// Anything left pending/acknowledged past this age gets force-released by the sweep below —
// safety net for a lost STK callback (see releaseStaleSkips).
const SKIP_TTL_MS = 10 * 60 * 1000;

export const createSkipEntry = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingSkips", {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Subscribed live by the app (HeartbeatService) — only entries it hasn't recorded yet.
export const getPendingSkips = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingSkips")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();
  },
});

// Polled by payBundle while it waits for the app to confirm it has recorded the skip.
export const getSkipStatus = query({
  args: { skipId: v.id("pendingSkips") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.skipId);
    return { status: entry?.status ?? null };
  },
});

// Called by the app once it has written the number into its local skip list.
// Idempotent: a second call (e.g. a re-fired subscription) is a no-op.
export const acknowledgeSkip = mutation({
  args: { skipId: v.id("pendingSkips") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.skipId);
    if (!entry || entry.status !== "pending") {
      return { status: entry?.status ?? "released" };
    }
    await ctx.db.patch(args.skipId, {
      status: "acknowledged",
      acknowledgedAt: Date.now(),
    });
    return { status: "acknowledged" };
  },
});

// Frees the number from the skip list. Called as soon as the STK callback resolves to any
// terminal state (see updateTransactionStatus), so a genuine unrelated SMS from that number
// isn't dropped any longer than necessary. Idempotent.
export const releaseSkip = mutation({
  args: { skipId: v.id("pendingSkips") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.skipId);
    if (!entry || entry.status === "released") return;
    await ctx.db.patch(args.skipId, { status: "released" });
  },
});

// Safety-net sweep (see crons.ts) for entries whose STK callback never arrived, so they don't
// stay live and eat a real, unrelated SMS from that number indefinitely.
export const releaseStaleSkips = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - SKIP_TTL_MS;
    const stale = await ctx.db
      .query("pendingSkips")
      .filter((q) =>
        q.and(q.neq(q.field("status"), "released"), q.lt(q.field("createdAt"), cutoff))
      )
      .collect();
    for (const entry of stale) {
      await ctx.db.patch(entry._id, { status: "released" });
    }
  },
});
