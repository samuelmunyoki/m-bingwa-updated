import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
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
    });

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

    await ctx.db.patch(args.transactionId, {
      status: args.status,
      result: args.result,
      ussdCode: args.ussdCode,
      executedAt: args.executedAt,
      updatedAt: now,
    });

    return args.transactionId;
  },
});

/**
 * Delete (soft delete) Online Bridge transaction
 */
export const deleteOnlineBridgeTransaction = mutation({
  args: {
    transactionId: v.id("onlineBridgeTransactions"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.transactionId, {
      isDeleted: true,
      updatedAt: now,
    });

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
 * Get Online Bridge transaction status counts (Success/Failed/Pending)
 */
export const getOnlineBridgeTransactionStatusCounts = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("onlineBridgeTransactions")
      .withIndex("by_user_and_deleted", (q) =>
        q.eq("userId", args.userId).eq("isDeleted", false)
      )
      .collect();

    const successCount = transactions.filter((t) => t.status === "Success").length;
    const failedCount = transactions.filter((t) => t.status === "Failed" || t.status === "Rejected").length;
    const pendingCount = transactions.filter((t) => t.status === "Pending" || t.status === "Executing").length;

    return {
      successCount,
      failedCount,
      pendingCount,
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
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const transactionIds: Id<"onlineBridgeTransactions">[] = [];

    for (const transaction of args.transactions) {
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
      });

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
      await ctx.db.patch(update.transactionId, {
        status: update.status,
        result: update.result,
        executedAt: update.executedAt,
        updatedAt: now,
      });
    }

    return { count: args.updates.length };
  },
});