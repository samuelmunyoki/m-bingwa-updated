import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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

// Mutation to update heartbeat
export const updateDeviceHeartbeat = mutation({
  args: {
    phoneNumber: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if heartbeat exists
    const existing = await ctx.db
      .query("deviceHeartbeats")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        lastSeenTimestamp: now,
      });
      return existing._id;
    } else {
      // Create new
      const id = await ctx.db.insert("deviceHeartbeats", {
        phoneNumber: args.phoneNumber,
        userId: args.userId,
        lastSeenTimestamp: now,
      });
      return id;
    }
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
      // Update existing
      await ctx.db.patch(existing._id, {
        isServiceRunning: args.isServiceRunning,
        updatedAt: now,
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
      isServiceRunning: status.isServiceRunning ?? false,
      lastSeenTimestamp: status.updatedAt,
    };
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