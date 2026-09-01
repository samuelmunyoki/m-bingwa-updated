import { v } from "convex/values";
import { mutation, query, MutationCtx } from "../_generated/server";

/**
 * Update or create service status for a phone number
 */
export const updateServiceStatus = mutation({
  args: {
    phoneNumber: v.string(),
    isServiceRunning: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if status exists
    const existing = await ctx.db
      .query("serviceStatus")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        isServiceRunning: args.isServiceRunning,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      // Create new
      const id = await ctx.db.insert("serviceStatus", {
        phoneNumber: args.phoneNumber,
        isServiceRunning: args.isServiceRunning,
        lastUpdated: now,
      });
      return id;
    }
  },
});

/**
 * Get service status for a phone number
 */
export const getServiceStatus = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("serviceStatus")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (!status) {
      return { isServiceRunning: false, lastUpdated: null };
    }

    return {
      isServiceRunning: status.isServiceRunning,
      lastUpdated: status.lastUpdated,
    };
  },
});

/**
 * Get service status for multiple phone numbers (batch)
 */
export const getMultipleServiceStatuses = query({
  args: {
    phoneNumbers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const statuses: Record<string, { isServiceRunning: boolean; lastUpdated: number | null }> = {};

    for (const phoneNumber of args.phoneNumbers) {
      const status = await ctx.db
        .query("serviceStatus")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
        .first();

      statuses[phoneNumber] = status
        ? { isServiceRunning: status.isServiceRunning, lastUpdated: status.lastUpdated }
        : { isServiceRunning: false, lastUpdated: null };
    }

    return statuses;
  },
});

// Shared handler body, reused by updateDeviceHeartbeat and by the combined
// heartbeat+session-validate mutation in users.ts (one isolate invocation
// instead of two — see HEARTBEAT_INTERVAL history in HeartbeatService.kt).
export async function performHeartbeatUpdate(
  ctx: MutationCtx,
  args: { phoneNumber: string; userId: string; batteryLevel?: number }
) {
  const now = Date.now();

  // Dedupe by userId (the account), NOT phoneNumber. Phone numbers can be reassigned between
  // accounts over time (see the phone-number-change feature elsewhere in this project). Deduping
  // by phoneNumber caused a real cross-account bug: a number that used to belong to a different,
  // now-dormant account still had a leftover row here, and a NEW account that later took over
  // that same number kept silently patching the OLD account's row with its own fresh battery/
  // timestamp data — while its own row (created earlier, before the number was assigned) sat
  // frozen forever. Matching on userId instead means each account always finds/updates its own
  // row, regardless of what phone number is currently attached to it.
  const existing = await ctx.db
    .query("deviceHeartbeats")
    .withIndex("by_userId", (q) => q.eq("userId", args.userId))
    .first();

  if (existing) {
    // Also correct phoneNumber here in case it drifted (e.g. this account's number changed) —
    // keeps the row's phoneNumber field truthful without needing a separate migration.
    await ctx.db.patch(existing._id, {
      phoneNumber: args.phoneNumber,
      lastSeenTimestamp: now,
      ...(args.batteryLevel !== undefined ? { batteryLevel: args.batteryLevel } : {}),
    });
    return existing._id;
  } else {
    // Create new
    const id = await ctx.db.insert("deviceHeartbeats", {
      phoneNumber: args.phoneNumber,
      userId: args.userId,
      lastSeenTimestamp: now,
      ...(args.batteryLevel !== undefined ? { batteryLevel: args.batteryLevel } : {}),
    });
    return id;
  }
}

// Mutation to update heartbeat
export const updateDeviceHeartbeat = mutation({
  args: {
    phoneNumber: v.string(),
    userId: v.string(),
    batteryLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => performHeartbeatUpdate(ctx, args),
});

// Query to get a device's latest heartbeat (battery level + last-seen) for one user
export const getDeviceHeartbeatByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // updateDeviceHeartbeat (above) dedupes writes by phoneNumber, not userId — so if this
    // account's phoneNumber value has ever changed (SIM swap, reformatting, re-registration),
    // a NEW row gets inserted instead of the old one being patched, leaving multiple rows for
    // the same userId. `.first()` with no explicit order returns the OLDEST match (ascending
    // _creationTime), which can serve a long-stale battery reading while a separate, newer row
    // is the one actually being updated. Collect all matches and take the one with the highest
    // lastSeenTimestamp instead — that field can't be sorted via this index directly since it
    // only covers userId.
    const heartbeats = await ctx.db
      .query("deviceHeartbeats")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const heartbeat = heartbeats.reduce<typeof heartbeats[number] | null>(
      (latest, h) => (!latest || h.lastSeenTimestamp > latest.lastSeenTimestamp ? h : latest),
      null
    );
    return {
      batteryLevel: heartbeat?.batteryLevel ?? null,
      lastSeenTimestamp: heartbeat?.lastSeenTimestamp ?? null,
    };
  },
});

// Query to get batch online status
export const getBatchDeviceOnlineStatus = query({
  args: {
    phoneNumbers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const statuses: Record<string, boolean> = {};
    const now = Date.now();
    const oneMinute = 60 * 1000;

    for (const phoneNumber of args.phoneNumbers) {
      const heartbeat = await ctx.db
        .query("deviceHeartbeats")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", phoneNumber))
        .first();

      if (!heartbeat) {
        statuses[phoneNumber] = false;
      } else {
        const isOnline = (now - heartbeat.lastSeenTimestamp) < oneMinute;
        statuses[phoneNumber] = isOnline;
      }
    }

    return { statuses };
  },
});


// For testing online/offline status
export const setDeviceHeartbeatManually = mutation({
  args: {
    phoneNumber: v.string(),
    userId: v.string(),
    timestampOffset: v.number(), 
  },
  handler: async (ctx, args) => {
    const customTimestamp = Date.now() - args.timestampOffset;

    const existing = await ctx.db
      .query("deviceHeartbeats")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenTimestamp: customTimestamp,
      });
      return { 
        success: true, 
        timestamp: customTimestamp,
        message: `Heartbeat set to ${customTimestamp} (${args.timestampOffset}ms ago)`
      };
    } else {
      const id = await ctx.db.insert("deviceHeartbeats", {
        phoneNumber: args.phoneNumber,
        userId: args.userId,
        lastSeenTimestamp: customTimestamp,
      });
      return { 
        success: true, 
        id,
        timestamp: customTimestamp,
        message: `Created new heartbeat at ${customTimestamp}`
      };
    }
  },
});

export const updateOnlineServiceStatus = mutation({
  args: {
    phoneNumber: v.string(),
    userId: v.string(),
    isServiceRunning: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if heartbeat exists
    const existing = await ctx.db
      .query("onlineServiceStatus")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      // Update existing — also sync userId so website queries stay consistent
      await ctx.db.patch(existing._id, {
        isServiceRunning: args.isServiceRunning,
        updatedAt: now,
        userId: args.userId,
      });
      return existing._id;
    } else {
      // Create new
      const id = await ctx.db.insert("onlineServiceStatus", {
        phoneNumber: args.phoneNumber,
        userId: args.userId,
        updatedAt: now,
        isServiceRunning: args.isServiceRunning,
      });
      return id;
    }
  },
});

export const getOnlineServiceStatus = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("onlineServiceStatus")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (!status) {
      return {
        phoneNumber: args.phoneNumber,
        isServiceRunning: false,
        lastSeenTimestamp: null,
      };
    }

    // Just return the actual value - no staleness check
    return {
      phoneNumber: status.phoneNumber,
      userId: status.userId,
      isServiceRunning: status.isServiceRunning ?? false,
      lastSeenTimestamp: status.updatedAt,
    };
  },
});

export const getServiceStatusByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("onlineServiceStatus")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    return {
      isServiceRunning: status?.isServiceRunning ?? false,
      updatedAt: status?.updatedAt ?? null,
    };
  },
});

export const setServiceStatusByUserId = mutation({
  args: {
    userId: v.string(),
    isServiceRunning: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("onlineServiceStatus")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        isServiceRunning: args.isServiceRunning,
        updatedAt: now,
      });
    } else {
      const profile = await ctx.db
        .query("phoneProfiles")
        .withIndex("by_profileId", (q) => q.eq("profileId", args.userId))
        .first();
      if (profile) {
        await ctx.db.insert("onlineServiceStatus", {
          phoneNumber: profile.phoneNumber,
          userId: args.userId,
          isServiceRunning: args.isServiceRunning,
          updatedAt: now,
        });
      }
    }
    return { isServiceRunning: args.isServiceRunning };
  },
});

export const getOnlineBatchServiceStatus = query({
  args: {
    phoneNumbers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const statuses: Record<string, boolean> = {};

    // Fetch all statuses in parallel
    const statusPromises = args.phoneNumbers.map(async (phoneNumber) => {
      const status = await ctx.db
        .query("onlineServiceStatus")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", phoneNumber))
        .first();

      return {
        phoneNumber,
        isServiceRunning: status?.isServiceRunning ?? false,  // Just the actual value
      };
    });

    const results = await Promise.all(statusPromises);

    // Convert to map
    results.forEach(({ phoneNumber, isServiceRunning }) => {
      statuses[phoneNumber] = isServiceRunning;
    });

    return { statuses };
  },
});