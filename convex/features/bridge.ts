import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";

export const createBridgeOffer = mutation({
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
      .query("bridgeOffers")
      .withIndex("by_price", (q) => 
        q.eq("userId", args.userId).eq("price", args.price)
      )
      .first();

    if (existing) {
      throw new Error(`An offer with price ${args.price} already exists`);
    }

    const offerId = await ctx.db.insert("bridgeOffers", {
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

export const updateBridgeOffer = mutation({
  args: {
    offerId: v.id("bridgeOffers"),
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
        .query("bridgeOffers")
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

export const deleteBridgeOffer = mutation({
  args: { 
    offerId: v.id("bridgeOffers"),
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

export const createBridgeDevice = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    deviceName: v.string(),
    devicePhoneNumber: v.string(),
    selectedOfferIds: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const deviceId = await ctx.db.insert("bridgeDevices", {
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

export const updateBridgeDevice = mutation({
  args: {
    deviceId: v.id("bridgeDevices"),
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

export const updateDeviceOffers = mutation({
  args: {
    deviceId: v.id("bridgeDevices"),
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

export const deleteBridgeDevice = mutation({
  args: {
    deviceId: v.id("bridgeDevices"),
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

export const addToWhitelist = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    whitelistedNumber: v.string()
  },
  handler: async (ctx, args) => {
    // Check if already whitelisted
    const existing = await ctx.db
      .query("bridgeWhitelist")
      .withIndex("by_whitelist", (q) =>
        q.eq("phoneNumber", args.phoneNumber)
         .eq("whitelistedNumber", args.whitelistedNumber)
      )
      .first();

    if (existing) {
      throw new Error("Number already whitelisted");
    }

    const id = await ctx.db.insert("bridgeWhitelist", {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      whitelistedNumber: args.whitelistedNumber,
      createdAt: Date.now()
    });

    return id;
  }
});

export const removeFromWhitelist = mutation({
  args: {
    phoneNumber: v.string(),
    whitelistedNumber: v.string()
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("bridgeWhitelist")
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

// ============= TRANSACTIONS MUTATIONS =============

export const createBridgeTransaction = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    deviceId: v.string(),
    offerId: v.string(),
    status: v.union(v.literal("Success"), v.literal("Failed"), v.literal("Pending")),
    smsContent: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("bridgeTransactions", {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      deviceId: args.deviceId,
      offerId: args.offerId,
      status: args.status,
      smsContent: args.smsContent,
      createdAt: Date.now()
    });

    return transactionId;
  }
});

export const updateTransactionStatus = mutation({
  args: {
    transactionId: v.id("bridgeTransactions"),
    status: v.union(v.literal("Success"), v.literal("Failed"), v.literal("Pending"))
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: args.status,
      executedAt: Date.now()
    });
  }
});




// ============= OFFERS QUERIES =============

export const getBridgeOffers = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bridgeOffers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  }
});

export const getBridgeOfferById = query({
  args: { offerId: v.id("bridgeOffers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.offerId);
  }
});

// ============= DEVICES QUERIES =============

export const getBridgeDevices = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bridgeDevices")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  }
});

export const getBridgeDeviceById = query({
  args: { deviceId: v.id("bridgeDevices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deviceId);
  }
});

// ============= WHITELIST QUERIES =============

export const getWhitelist = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bridgeWhitelist")
      .withIndex("by_receiver", (q) => q.eq("phoneNumber", args.phoneNumber))
      .collect();
  }
});

export const isWhitelisted = query({
  args: {
    receiverPhone: v.string(),
    senderPhone: v.string()
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("bridgeWhitelist")
      .withIndex("by_whitelist", (q) =>
        q.eq("phoneNumber", args.receiverPhone)
         .eq("whitelistedNumber", args.senderPhone)
      )
      .first();

    return entry !== null;
  }
});

// ============= TRANSACTIONS QUERIES =============

export const getBridgeTransactions = query({
  args: { 
    userId: v.string(),
    deviceId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    if (args.deviceId) {
      return await ctx.db
        .query("bridgeTransactions")
        .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId!))
        .collect();
    }
    
    return await ctx.db
      .query("bridgeTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  }
});

export const getTransactionStatusCounts = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("bridgeTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const counts = {
      Success: 0,
      Failed: 0,
      Pending: 0
    };

    transactions.forEach(tx => {
      counts[tx.status]++;
    });

    return counts;
  }
});
