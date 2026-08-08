import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// ============= DAILY TRANSACTION COUNTS (see onlineBridgeDailyCounts in schema.ts) =============
// Day boundary in Africa/Nairobi (EAT, UTC+3, no DST) — same convention as messageDailyStats.ts /
// transactions.tsx nairobiStartOfDay(), so bridge-transaction days line up with everything else.
const BRIDGE_EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
export function getBridgeDayStart(timestamp: number): number {
  const shifted = timestamp + BRIDGE_EAT_OFFSET_MS;
  return shifted - (shifted % 86_400_000) - BRIDGE_EAT_OFFSET_MS;
}

// Maps a transaction's status to which daily-count bucket it belongs to — mirrors exactly the
// grouping getOnlineBridgeTransactionStatusCounts used to compute in-memory (failed = Failed +
// Rejected, pending = Pending + Executing). Anything else contributes to none of the three
// buckets, same as before.
export function bridgeStatusBucket(status: string): "successful" | "failed" | "pending" | null {
  if (status === "Success") return "successful";
  if (status === "Failed" || status === "Rejected") return "failed";
  if (status === "Pending" || status === "Executing") return "pending";
  return null;
}

// Internal helper — apply a delta to a user's daily bridge-transaction counts. Called via
// ctx.scheduler.runAfter(0, ...) from every place a transaction is created, changes status, or
// is deleted — same decoupled-from-the-main-write pattern as messageDailyStats.applyDailyStatsDelta,
// so contention on one day's row can't make the original transaction write retry.
export const applyOnlineBridgeDailyDelta = internalMutation({
  args: {
    userId: v.string(),
    dayStart: v.number(),
    successfulDelta: v.number(),
    failedDelta: v.number(),
    pendingDelta: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, dayStart, successfulDelta, failedDelta, pendingDelta } = args;

    const existing = await ctx.db
      .query("onlineBridgeDailyCounts")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayStart", dayStart))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        successful: Math.max(0, existing.successful + successfulDelta),
        failed: Math.max(0, existing.failed + failedDelta),
        pending: Math.max(0, existing.pending + pendingDelta),
      });
    } else if (successfulDelta > 0 || failedDelta > 0 || pendingDelta > 0) {
      await ctx.db.insert("onlineBridgeDailyCounts", {
        userId,
        dayStart,
        successful: Math.max(0, successfulDelta),
        failed: Math.max(0, failedDelta),
        pending: Math.max(0, pendingDelta),
      });
    }
  },
});

// ============= OFFERS MUTATIONS =============

export const createOnlineBridgeOffer = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    name: v.string(),
    type: v.union(v.literal("Data"), v.literal("SMS"), v.literal("Minutes")),
    price: v.number()
  },
  handler: async (ctx, args) => {
    // Check for duplicate price for this user
    const existing = await ctx.db
      .query("onlineBridgeOffers")
      .withIndex("by_price", (q) => 
        q.eq("userId", args.userId).eq("price", args.price)
      )
      .first();

    if (existing) {
      throw new Error(`An offer with price ${args.price} already exists`);
    }

    const offerId = await ctx.db.insert("onlineBridgeOffers", {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      name: args.name,
      type: args.type,
      price: args.price,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return offerId;
  }
});

export const updateOnlineBridgeOffer = mutation({
  args: {
    offerId: v.id("onlineBridgeOffers"),
    userId: v.string(),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("Data"), v.literal("SMS"), v.literal("Minutes"))),
    price: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    
    if (!offer || offer.userId !== args.userId) {
      throw new Error("Offer not found or unauthorized");
    }

    // If updating price, check for duplicates
    if (args.price !== undefined && args.price !== offer.price) {
      const duplicate = await ctx.db
        .query("onlineBridgeOffers")
        .withIndex("by_price", (q) => 
          q.eq("userId", args.userId).eq("price", args.price as number)
        )
        .first();

      if (duplicate && duplicate._id !== args.offerId) {
        throw new Error(`An offer with price ${args.price} already exists`);
      }
    }

    await ctx.db.patch(args.offerId, {
      ...(args.name && { name: args.name }),
      ...(args.type && { type: args.type }),
      ...(args.price !== undefined && { price: args.price }),
      updatedAt: Date.now()
    });
  }
});

export const deleteOnlineBridgeOffer = mutation({
  args: { 
    offerId: v.id("onlineBridgeOffers"),
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.offerId);
    
    if (!offer || offer.userId !== args.userId) {
      throw new Error("Offer not found or unauthorized");
    }

    await ctx.db.delete(args.offerId);
  }
});

// ============= DEVICES MUTATIONS =============

export const createOnlineBridgeDevice = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    deviceName: v.string(),
    devicePhoneNumber: v.string(),
    selectedOfferIds: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const deviceId = await ctx.db.insert("onlineBridgeDevices", {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      deviceName: args.deviceName,
      devicePhoneNumber: args.devicePhoneNumber,
      selectedOfferIds: args.selectedOfferIds,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return deviceId;
  }
});

export const updateOnlineBridgeDevice = mutation({
  args: {
    deviceId: v.id("onlineBridgeDevices"),
    userId: v.string(),
    deviceName: v.optional(v.string()),
    devicePhoneNumber: v.optional(v.string()),
    selectedOfferIds: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    
    if (!device || device.userId !== args.userId) {
      throw new Error("Device not found or unauthorized");
    }

    await ctx.db.patch(args.deviceId, {
      ...(args.deviceName && { deviceName: args.deviceName }),
      ...(args.devicePhoneNumber && { devicePhoneNumber: args.devicePhoneNumber }),
      ...(args.selectedOfferIds && { selectedOfferIds: args.selectedOfferIds }),
      updatedAt: Date.now()
    });
  }
});

export const updateOnlineDeviceOffers = mutation({
  args: {
    deviceId: v.id("onlineBridgeDevices"),
    userId: v.string(),
    selectedOfferIds: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    
    if (!device || device.userId !== args.userId) {
      throw new Error("Device not found or unauthorized");
    }

    await ctx.db.patch(args.deviceId, {
      selectedOfferIds: args.selectedOfferIds,
      updatedAt: Date.now()
    });
  }
});

export const deleteOnlineBridgeDevice = mutation({
  args: {
    deviceId: v.id("onlineBridgeDevices"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    
    if (!device || device.userId !== args.userId) {
      throw new Error("Device not found or unauthorized");
    }

    await ctx.db.delete(args.deviceId);
  }
});

// ============= WHITELIST MUTATIONS =============

export const addToOnlineWhitelist = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    whitelistedNumber: v.string()
  },
  handler: async (ctx, args) => {
    // Check if already whitelisted
    const existing = await ctx.db
      .query("onlineBridgeWhitelist")
      .withIndex("by_whitelist", (q) =>
        q.eq("phoneNumber", args.phoneNumber)
         .eq("whitelistedNumber", args.whitelistedNumber)
      )
      .first();

    if (existing) {
      throw new Error("Number already whitelisted");
    }

    const id = await ctx.db.insert("onlineBridgeWhitelist", {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      whitelistedNumber: args.whitelistedNumber,
      createdAt: Date.now()
    });

    return id;
  }
});

export const removeFromOnlineWhitelist = mutation({
  args: {
    phoneNumber: v.string(),
    whitelistedNumber: v.string()
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("onlineBridgeWhitelist")
      .withIndex("by_whitelist", (q) =>
        q.eq("phoneNumber", args.phoneNumber)
         .eq("whitelistedNumber", args.whitelistedNumber)
      )
      .first();

    if (!entry) {
      throw new Error("Whitelist entry not found");
    }

    await ctx.db.delete(entry._id);
  }
});

// ============= OFFERS QUERIES =============

export const getOnlineBridgeOffers = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onlineBridgeOffers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  }
});

export const getOnlineBridgeOfferById = query({
  args: { offerId: v.id("onlineBridgeOffers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.offerId);
  }
});

// ============= DEVICES QUERIES =============

export const getOnlineBridgeDevices = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onlineBridgeDevices")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  }
});

export const getOnlineBridgeDeviceById = query({
  args: { deviceId: v.id("onlineBridgeDevices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deviceId);
  }
});

// ============= WHITELIST QUERIES =============

export const getOnlineWhitelist = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onlineBridgeWhitelist")
      .withIndex("by_receiver", (q) => q.eq("phoneNumber", args.phoneNumber))
      .collect();
  }
});

export const isOnlineWhitelisted = query({
  args: {
    receiverPhone: v.string(),
    senderPhone: v.string()
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("onlineBridgeWhitelist")
      .withIndex("by_whitelist", (q) =>
        q.eq("phoneNumber", args.receiverPhone)
         .eq("whitelistedNumber", args.senderPhone)
      )
      .first();

    return entry !== null;
  }
});

/**
 * Create a new Online Bridge transaction
 */
/**
 * Idempotency guard for creates. A bridge transaction is uniquely identified by (userId + the M-Pesa
 * message text) — the message carries a unique Safaricom code that never repeats. The sender's phone
 * may re-send the same create when a response is lost, so before inserting we look for an existing,
 * non-deleted copy and reuse it. Without this, one payment becomes two server rows and the receiver
 * dials the same bundle twice. Uses the by_user_and_sms index (exact, bounded — no history scan).
 */
async function findExistingBridgeTransactionId(
  ctx: any,
  userId: string,
  smsContent: string
): Promise<Id<"onlineBridgeTransactions"> | null> {
  const existing = await ctx.db
    .query("onlineBridgeTransactions")
    .withIndex("by_user_and_sms", (q: any) =>
      q.eq("userId", userId).eq("smsContent", smsContent)
    )
    .filter((q: any) => q.eq(q.field("isDeleted"), false))
    .first();
  return existing ? existing._id : null;
}

export const createOnlineBridgeTransaction = mutation({
  args: {
    userId: v.string(),
    senderPhoneNumber: v.string(),
    receiverPhoneNumber: v.string(),
    deviceId: v.string(),
    offerId: v.string(),
    amount: v.float64(),
    smsContent: v.string(),
    ussdCode: v.optional(v.string()),
    status: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Idempotent: if this exact transaction already exists, return it instead of duplicating.
    const existingId = await findExistingBridgeTransactionId(ctx, args.userId, args.smsContent);
    if (existingId) return existingId;

    const transactionId = await ctx.db.insert("onlineBridgeTransactions", {
      userId: args.userId,
      senderPhoneNumber: args.senderPhoneNumber,
      receiverPhoneNumber: args.receiverPhoneNumber,
      deviceId: args.deviceId,
      offerId: args.offerId,
      amount: args.amount,
      smsContent: args.smsContent,
      ussdCode: args.ussdCode,
      status: args.status,
      result: undefined,
      executedAt: undefined,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      source: args.source ?? "sms",
    });

    const bucket = bridgeStatusBucket(args.status);
    if (bucket) {
      await ctx.scheduler.runAfter(0, internal.features.onlineBridge.applyOnlineBridgeDailyDelta, {
        userId: args.userId,
        dayStart: getBridgeDayStart(now),
        successfulDelta: bucket === "successful" ? 1 : 0,
        failedDelta: bucket === "failed" ? 1 : 0,
        pendingDelta: bucket === "pending" ? 1 : 0,
      });
    }

    return transactionId;
  },
});

/**
 * Update Online Bridge transaction status
 */
export const updateOnlineBridgeTransactionStatus = mutation({
  args: {
    transactionId: v.id("onlineBridgeTransactions"),
    status: v.string(),
    result: v.optional(v.string()),
    ussdCode: v.optional(v.string()),
    executedAt: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const before = await ctx.db.get(args.transactionId);

    await ctx.db.patch(args.transactionId, {
      status: args.status,
      result: args.result,
      ussdCode: args.ussdCode,
      executedAt: args.executedAt,
      updatedAt: now,
    });

    // Daily bucket lives under the transaction's CREATION day, never "today" — a transaction
    // created weeks ago that resolves now still belongs to its original day's tally, just moving
    // from one status column to another within that same day's row.
    if (before) {
      const oldBucket = bridgeStatusBucket(before.status);
      const newBucket = bridgeStatusBucket(args.status);
      if (oldBucket !== newBucket) {
        await ctx.scheduler.runAfter(0, internal.features.onlineBridge.applyOnlineBridgeDailyDelta, {
          userId: before.userId,
          dayStart: getBridgeDayStart(before.createdAt),
          successfulDelta: (newBucket === "successful" ? 1 : 0) - (oldBucket === "successful" ? 1 : 0),
          failedDelta: (newBucket === "failed" ? 1 : 0) - (oldBucket === "failed" ? 1 : 0),
          pendingDelta: (newBucket === "pending" ? 1 : 0) - (oldBucket === "pending" ? 1 : 0),
        });
      }
    }

    return args.transactionId;
  },
});

/**
 * Delete Online Bridge transaction — hard delete, actually removes the row. App-initiated,
 * no pendingDeletions signal needed here (single-device-per-account, no other device to notify;
 * the app already cleans up its own local copy in the same call) — see
 * convex/features/pendingDeletions.ts for where "bridge" signals actually come from (the
 * scheduled cleanup cron, which deletes rows the phone doesn't already know about).
 */
export const deleteOnlineBridgeTransaction = mutation({
  args: {
    transactionId: v.id("onlineBridgeTransactions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.userId !== args.userId) {
      throw new Error("Transaction not found or unauthorized");
    }
    await ctx.db.delete(args.transactionId);

    const bucket = bridgeStatusBucket(transaction.status);
    if (bucket) {
      await ctx.scheduler.runAfter(0, internal.features.onlineBridge.applyOnlineBridgeDailyDelta, {
        userId: transaction.userId,
        dayStart: getBridgeDayStart(transaction.createdAt),
        successfulDelta: bucket === "successful" ? -1 : 0,
        failedDelta: bucket === "failed" ? -1 : 0,
        pendingDelta: bucket === "pending" ? -1 : 0,
      });
    }

    return args.transactionId;
  },
});

// ============= QUERIES =============

/**
 * Get all Online Bridge transactions for a user
 */
export const getOnlineBridgeTransactions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_user_and_deleted", (q) =>
        q.eq("userId", args.userId).eq("isDeleted", false)
      )
      .order("desc")
      .collect();

    return transactions;
  },
});

/**
 * Get a single Online Bridge transaction by ID
 */
export const getOnlineBridgeTransactionById = query({
  args: {
    transactionId: v.id("onlineBridgeTransactions"),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);

    if (!transaction || transaction.isDeleted) {
      return null;
    }

    return transaction;
  },
});

/**
 * Get the current state of specific transactions by their ids (bounded — the caller passes only the
 * handful it cares about, e.g. the sender's local in-flight rows). Used by the sender to fetch the
 * final status of the few that just resolved, without ever pulling its whole history.
 */
export const getOnlineBridgeTransactionsByIds = query({
  args: {
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: any[] = [];
    for (const idStr of args.ids) {
      const id = ctx.db.normalizeId("onlineBridgeTransactions", idStr);
      if (!id) continue;
      const tx = await ctx.db.get(id);
      if (tx && !tx.isDeleted) results.push(tx);
    }
    return results;
  },
});

/**
 * Match a SENDER's stuck local rows to their real server copies by M-Pesa message text.
 *
 * The sender's phone can be left with an orphaned local copy (temporary "local_" id, still "Pending")
 * when a background create's response is lost — the server actually saved the transaction under its own
 * id, but the phone never swapped. Those orphans can't be reconciled by id (the ids differ). Every
 * M-Pesa message carries a unique Safaricom code, so smsContent uniquely identifies the same
 * transaction on both sides. Bounded, exact lookups on the by_user_and_sms index (one per supplied
 * message) — never a history scan.
 */
export const getOnlineBridgeTransactionsBySmsContents = query({
  args: {
    userId: v.string(),
    smsContents: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.smsContents.length === 0) return [];
    const results: any[] = [];
    for (const sms of args.smsContents) {
      const rows = await ctx.db
        .query("onlineBridgeTransactions")
        .withIndex("by_user_and_sms", (q) =>
          q.eq("userId", args.userId).eq("smsContent", sms)
        )
        .collect();
      for (const tx of rows) if (!tx.isDeleted) results.push(tx);
    }
    return results;
  },
});

/**
 * Get pending Online Bridge transactions for a receiver phone number
 */
export const getPendingOnlineBridgeTransactions = query({
  args: {
    receiverPhoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_receiver_and_status", (q) =>
        q.eq("receiverPhoneNumber", args.receiverPhoneNumber).eq("status", "Pending")
      )
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();

    return transactions;
  },
});

/**
 * Get a SENDER's in-progress transactions (Pending + Executing) by userId.
 *
 * This is the subscription source for the sender's phone: it's a small, bounded set (the few
 * still-in-flight ones), so subscribing to it is cheap and never scans history. When the receiver
 * resolves a transaction (Success/Failed/Rejected), it leaves this set and Convex fires the
 * subscription — that's how the sender learns to refresh that one row locally. Mirrors
 * getPendingOnlineBridgeTransactions (the receiver's subscription), keyed by userId instead of phone.
 */
export const getInProgressOnlineBridgeTransactionsForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "Pending")
      )
      .collect();
    const executing = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "Executing")
      )
      .collect();

    return [...pending, ...executing].filter((t) => !t.isDeleted);
  },
});

/**
 * Get Online Bridge transaction status counts (Success/Failed/Pending)
 */
export const getOnlineBridgeTransactionStatusCounts = query({
  args: {
    userId: v.string(),
    // Optional "counters reset point" (epoch millis). When set, only transactions created
    // strictly after it are counted — used by the app's Reset-counters feature. Same base
    // set as getOnlineBridgeTransactions, so the counts stay in step with that list.
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = args.since ?? 0;
    const ONE_DAY_MS = 86_400_000;

    // Reset day itself is handled separately below (exact, bounded lookup) — the bucket sum here
    // only covers every FULL day strictly after it, so nothing gets double-counted. For "all-time"
    // (since=0), bucketStartDay is 0 so every bucket ever recorded is included.
    const sinceDay = since > 0 ? getBridgeDayStart(since) : 0;
    const bucketStartDay = since > 0 ? sinceDay + ONE_DAY_MS : 0;

    const buckets = await ctx.db
      .query("onlineBridgeDailyCounts")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", args.userId).gte("dayStart", bucketStartDay)
      )
      .collect();

    let successCount = buckets.reduce((sum, b) => sum + b.successful, 0);
    let failedCount = buckets.reduce((sum, b) => sum + b.failed, 0);
    let pendingCount = buckets.reduce((sum, b) => sum + b.pending, 0);

    // Partial reset day: bounded to exactly this one day's transactions, created strictly after
    // the exact reset moment — gives reset the same instant-drop precision the old query had,
    // without ever touching the user's whole history (this never grows with account age; it's
    // always just one day's worth of rows, whether the reset was yesterday or three years ago).
    if (since > 0) {
      const dayEnd = sinceDay + ONE_DAY_MS;
      const partialDay = await ctx.db
        .query("onlineBridgeTransactions")
        .withIndex("by_user_and_createdat", (q) =>
          q.eq("userId", args.userId).gt("createdAt", since).lt("createdAt", dayEnd)
        )
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .collect();

      for (const t of partialDay) {
        const bucket = bridgeStatusBucket(t.status);
        if (bucket === "successful") successCount++;
        else if (bucket === "failed") failedCount++;
        else if (bucket === "pending") pendingCount++;
      }
    }

    return {
      successCount,
      failedCount,
      pendingCount,
    };
  },
});

// One-time maintenance: soft-delete transactions stranded in "Executing" (receiver claimed
// them but the Success/Failed mark never landed). ONLY touches status === "Executing" and
// only those older than the threshold — never Pending/Success/Failed. Soft-delete
// (isDeleted: true) so they drop off the counter and the app's sync ignores them.
export const cleanupStaleExecutingTransactions = mutation({
  args: {
    userId: v.string(),
    olderThanMs: v.optional(v.number()), // default 5 minutes
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const threshold = args.olderThanMs ?? 5 * 60 * 1000;
    const cutoff = now - threshold;
    const MAX_PER_CALL = 2000; // safety cap so one call never blows the write budget

    // Index-scoped read: ONLY this user's "Executing" rows (a small subset) — avoids the
    // collect-everything timeout that hits getOnlineBridgeTransactionStatusCounts.
    const executing = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "Executing")
      )
      .collect();

    // HARD delete: physically remove the row. Targets stale ones (Executing > threshold) AND any
    // already-soft-deleted tombstones still sitting in the table. Spares only Executing rows that
    // are live AND fresh (< threshold) — i.e. ones actually being processed right now.
    const toDelete = executing.filter((t) => t.isDeleted || t.updatedAt < cutoff);

    let deleted = 0;
    for (const t of toDelete) {
      if (deleted >= MAX_PER_CALL) break;
      await ctx.db.delete(t._id);
      // Only decrement if this row was actually counted — an already-isDeleted tombstone (a
      // leftover from before deletes were changed to hard-delete) was never in the daily tally
      // in the first place, so it must not be double-subtracted here.
      if (!t.isDeleted) {
        await ctx.scheduler.runAfter(0, internal.features.onlineBridge.applyOnlineBridgeDailyDelta, {
          userId: args.userId,
          dayStart: getBridgeDayStart(t.createdAt),
          successfulDelta: 0,
          failedDelta: 0,
          pendingDelta: -1,
        });
      }
      deleted++;
    }

    // remaining > 0 → run the URL again to clear the rest.
    return { deleted, remaining: toDelete.length - deleted, thresholdMs: threshold };
  },
});

// One-time backfill for onlineBridgeDailyCounts — needed because that table starts empty and the
// live delta-nudges (see applyOnlineBridgeDailyDelta and its 6 call sites above) only account for
// activity from the moment they're deployed onward. Mirrors migrateUserMessageStats
// (messageDailyStats.ts) exactly: paginates a user's existing transactions in batches of 1000,
// newest first (so today's numbers are correct even if the chain dies partway through an old
// backlog), and self-reschedules server-side until done. Call once per user with just {userId} —
// it drives itself to completion from there.
export const migrateOnlineBridgeDailyCounts = mutation({
  args: {
    userId: v.string(),
    cursor: v.optional(v.string()),
    clearFirst: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, cursor, clearFirst }) => {
    // On first call (no cursor), clear this user's existing daily counts so a re-run is safe.
    if (!cursor && clearFirst !== false) {
      const existing = await ctx.db
        .query("onlineBridgeDailyCounts")
        .withIndex("by_user_day", (q) => q.eq("userId", userId))
        .collect();
      for (const e of existing) await ctx.db.delete(e._id);
    }

    const page = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_user_and_createdat", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({ numItems: 1000, cursor: cursor ?? null });

    // Aggregate this batch into day buckets. Skips already-isDeleted tombstones — the live query
    // never counted those either (same by_user_and_deleted exclusion the old query used), so
    // backfilling them in as real counts would make the numbers wrong, not just stale.
    const dayMap = new Map<number, { successful: number; failed: number; pending: number }>();

    for (const t of page.page) {
      if (t.isDeleted) continue;
      const bucket = bridgeStatusBucket(t.status);
      if (!bucket) continue;
      const dayKey = getBridgeDayStart(t.createdAt);
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, { successful: 0, failed: 0, pending: 0 });
      dayMap.get(dayKey)![bucket]++;
    }

    for (const [dayStart, stats] of dayMap.entries()) {
      const existing = await ctx.db
        .query("onlineBridgeDailyCounts")
        .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayStart", dayStart))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          successful: existing.successful + stats.successful,
          failed: existing.failed + stats.failed,
          pending: existing.pending + stats.pending,
        });
      } else {
        await ctx.db.insert("onlineBridgeDailyCounts", { userId, dayStart, ...stats });
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(250, api.features.onlineBridge.migrateOnlineBridgeDailyCounts, {
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

// Cron target: delete bridge transactions older than 2 days, in throttled batches, rescheduling
// itself ONLY while a full-size batch was found — same self-rescheduling/terminating pattern as
// deleteOldMpesaMessages (mpesaMessages.ts). Uses the global by_createdat index (no userId scope)
// since this runs across every user's transactions in one pass.
const BRIDGE_DELETE_FETCH_LIMIT = 500;
const BRIDGE_DELETE_RESCHEDULE_DELAY_MS = 1000;

export const deleteOldOnlineBridgeTransactions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);

    const oldTransactions = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_createdat", (q) => q.lt("createdAt", twoDaysAgo))
      .take(BRIDGE_DELETE_FETCH_LIMIT);

    for (const t of oldTransactions) {
      await ctx.db.delete(t._id);

      // Decrement the daily bucket — same isDeleted-skip rule as everywhere else: an
      // already-soft-deleted leftover was never counted, so it must not be double-subtracted.
      if (!t.isDeleted) {
        const bucket = bridgeStatusBucket(t.status);
        if (bucket) {
          await ctx.scheduler.runAfter(0, internal.features.onlineBridge.applyOnlineBridgeDailyDelta, {
            userId: t.userId,
            dayStart: getBridgeDayStart(t.createdAt),
            successfulDelta: bucket === "successful" ? -1 : 0,
            failedDelta: bucket === "failed" ? -1 : 0,
            pendingDelta: bucket === "pending" ? -1 : 0,
          });
        }
      }

      // Signal the app so its local copy gets cleaned up too — bridge notes only ever come from
      // this cron (see pendingDeletions.ts; app-initiated bridge deletes don't self-signal since
      // there's only ever one device per account).
      await ctx.db.insert("pendingDeletions", {
        userId: t.userId,
        type: "bridge",
        convexId: t._id,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    // A full-size batch means there may be more still waiting — reschedule to keep draining the
    // backlog. A short batch means we're caught up, so this stops naturally.
    if (oldTransactions.length === BRIDGE_DELETE_FETCH_LIMIT) {
      await ctx.scheduler.runAfter(
        BRIDGE_DELETE_RESCHEDULE_DELAY_MS,
        internal.features.onlineBridge.deleteOldOnlineBridgeTransactions,
        {}
      );
    }

    return {
      deletedCount: oldTransactions.length,
      cutoffDate: new Date(twoDaysAgo).toISOString(),
    };
  },
});

/**
 * Get Online Bridge transactions for a specific device
 */
export const getOnlineBridgeTransactionsByDevice = query({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .collect();

    return transactions;
  },
});

/**
 * Batch create multiple Online Bridge transactions at once
 */
export const batchCreateOnlineBridgeTransactions = mutation({
  args: {
    transactions: v.array(
      v.object({
        userId: v.string(),
        senderPhoneNumber: v.string(),
        receiverPhoneNumber: v.string(),
        deviceId: v.string(),
        offerId: v.string(),
        amount: v.float64(),
        smsContent: v.string(),
        ussdCode: v.optional(v.string()),
        status: v.string(),
        source: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const transactionIds: Id<"onlineBridgeTransactions">[] = [];

    for (const transaction of args.transactions) {
      // Idempotent: skip re-creating one that already exists (same user + M-Pesa message) — the
      // buffered resync can re-send rows the server already has; without this it double-dials.
      const existingId = await findExistingBridgeTransactionId(
        ctx,
        transaction.userId,
        transaction.smsContent
      );
      if (existingId) {
        transactionIds.push(existingId);
        continue;
      }

      const transactionId = await ctx.db.insert("onlineBridgeTransactions", {
        userId: transaction.userId,
        senderPhoneNumber: transaction.senderPhoneNumber,
        receiverPhoneNumber: transaction.receiverPhoneNumber,
        deviceId: transaction.deviceId,
        offerId: transaction.offerId,
        amount: transaction.amount,
        smsContent: transaction.smsContent,
        ussdCode: transaction.ussdCode,
        status: transaction.status,
        result: undefined,
        executedAt: undefined,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        source: transaction.source ?? "sms",
      });

      const bucket = bridgeStatusBucket(transaction.status);
      if (bucket) {
        await ctx.scheduler.runAfter(0, internal.features.onlineBridge.applyOnlineBridgeDailyDelta, {
          userId: transaction.userId,
          dayStart: getBridgeDayStart(now),
          successfulDelta: bucket === "successful" ? 1 : 0,
          failedDelta: bucket === "failed" ? 1 : 0,
          pendingDelta: bucket === "pending" ? 1 : 0,
        });
      }

      transactionIds.push(transactionId);
    }

    return { transactionIds, count: transactionIds.length };
  },
});

/**
 * Batch update transaction statuses
 */
export const batchUpdateOnlineBridgeTransactionStatuses = mutation({
  args: {
    updates: v.array(
      v.object({
        transactionId: v.id("onlineBridgeTransactions"),
        status: v.string(),
        result: v.optional(v.string()),
        executedAt: v.optional(v.float64()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const update of args.updates) {
      // Fetched before patching — updates has no userId per item, and different items in the
      // same batch can belong to different users, so each one's daily bucket must be resolved
      // individually (same reasoning as updateOnlineBridgeTransactionStatus above).
      const before = await ctx.db.get(update.transactionId);

      await ctx.db.patch(update.transactionId, {
        status: update.status,
        result: update.result,
        executedAt: update.executedAt,
        updatedAt: now,
      });

      if (before) {
        const oldBucket = bridgeStatusBucket(before.status);
        const newBucket = bridgeStatusBucket(update.status);
        if (oldBucket !== newBucket) {
          await ctx.scheduler.runAfter(0, internal.features.onlineBridge.applyOnlineBridgeDailyDelta, {
            userId: before.userId,
            dayStart: getBridgeDayStart(before.createdAt),
            successfulDelta: (newBucket === "successful" ? 1 : 0) - (oldBucket === "successful" ? 1 : 0),
            failedDelta: (newBucket === "failed" ? 1 : 0) - (oldBucket === "failed" ? 1 : 0),
            pendingDelta: (newBucket === "pending" ? 1 : 0) - (oldBucket === "pending" ? 1 : 0),
          });
        }
      }
    }

    return { count: args.updates.length };
  },
});