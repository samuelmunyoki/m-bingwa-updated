import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a new promo code
 */
export const createPromoCode = mutation({
  args: {
    promoCode: v.string(),
    validDays: v.number(),
    description: v.optional(v.string()),
    endDate: v.optional(v.number()),      
    maxUsages: v.optional(v.number()), 
  },
  handler: async (ctx, args) => {
    const promoCode = args.promoCode.toUpperCase().trim();

    // ✅ Validate promo code format: exactly 7 characters
    if (promoCode.length !== 7) {
      throw new Error("Promo code must be exactly 7 characters long");
    }

    // ✅ Validate alphanumeric only (A-Z, 0-9)
    if (!/^[A-Z0-9]{7}$/.test(promoCode)) {
      throw new Error("Promo code must contain only letters and numbers (A-Z, 0-9)");
    }

    // Check if promo code already exists
    const existing = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("promoCode", promoCode))
      .first();

    if (existing) {
      throw new Error("Promo code already exists");
    }

    // Validate validDays is positive
    if (args.validDays <= 0) {
      throw new Error("Valid days must be greater than 0");
    }

    // Validate maxUsages if provided
    if (args.maxUsages !== undefined && args.maxUsages <= 0) {
      throw new Error("Max usages must be greater than 0");
    }

    const now = Date.now();

    // Create promo code
    const promoCodeId = await ctx.db.insert("promoCodes", {
      promoCode: promoCode,
      validDays: args.validDays,
      description: args.description,
      endDate: args.endDate || (now + (365 * 24 * 60 * 60 * 1000)), 
      maxUsages: args.maxUsages,        
      currentUsages: 0,                    
      isActive: true,
      createdAt: now,
    });

    console.log("✓ Promo code created:", promoCode);

    return {
      status: "success",
      promoCodeId,
      message: "Promo code created successfully",
    };
  },
});


/**
 * Validate a promo code and return bonus days
 */
export const validatePromoCode = query({
  args: {
    promoCode: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const codeUpper = args.promoCode.toUpperCase();

    // Find the promo code
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("promoCode", codeUpper))
      .first();

    if (!promo) {
      return {
        status: "error",
        error: "Invalid promo code",
        isValid: false,
      };
    }

    // Check if active
    if (!promo.isActive) {
      return {
        status: "error",
        error: "This promo code is no longer active",
        isValid: false,
      };
    }

    // Check if expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (promo.endDate < currentTime) {
      return {
        status: "error",
        error: "This promo code has expired",
        isValid: false,
      };
    }

    // Check if user has already used this code
    const alreadyUsed = await ctx.db
      .query("promoUsers")
      .withIndex("by_user_and_code", (q) =>
        q.eq("userId", args.userId).eq("promoCode", codeUpper)
      )
      .first();

    if (alreadyUsed) {
      return {
        status: "error",
        error: "You have already used this promo code",
        isValid: false,
      };
    }

    // Check max usages if specified
    if (promo.maxUsages && promo.currentUsages && promo.currentUsages >= promo.maxUsages) {
      return {
        status: "error",
        error: "This promo code has reached its maximum usage limit",
        isValid: false,
      };
    }

    // Valid promo code
    return {
      status: "success",
      isValid: true,
      data: {
        promoCode: promo.promoCode,
        validDays: promo.validDays,
        description: promo.description,
      },
    };
  },
});

/**
 * Record promo code usage
 */
export const recordPromoCodeUsage = mutation({
  args: {
    userId: v.string(),
    promoCode: v.string(),
    subscriptionExtended: v.number(),
    subscriptionEnds: v.number(),
  },
  handler: async (ctx, args) => {
    const codeUpper = args.promoCode.toUpperCase();

    // Double-check the user hasn't already used this code
    const alreadyUsed = await ctx.db
      .query("promoUsers")
      .withIndex("by_user_and_code", (q) =>
        q.eq("userId", args.userId).eq("promoCode", codeUpper)
      )
      .first();

    if (alreadyUsed) {
      throw new Error("Promo code already used by this user");
    }

    // Record the usage
    await ctx.db.insert("promoUsers", {
      userId: args.userId,
      promoCode: codeUpper,
      usedAt: Math.floor(Date.now() / 1000),
      subscriptionExtended: args.subscriptionExtended,
      subscriptionEnds: args.subscriptionEnds,
    });

    // Increment usage count on promo code
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("promoCode", codeUpper))
      .first();

    if (promo) {
      await ctx.db.patch(promo._id, {
        currentUsages: (promo.currentUsages || 0) + 1,
      });
    }

    return {
      status: "success",
      message: "Promo code usage recorded",
    };
  },
});

/**
 * Get all promo codes (admin function)
 */
export const getAllPromoCodes = query({
  args: {},
  handler: async (ctx) => {
    const promoCodes = await ctx.db.query("promoCodes").collect();
    return promoCodes;
  },
});

/**
 * Update promo code status
 */
export const updatePromoCodeStatus = mutation({
  args: {
    promoCode: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const codeUpper = args.promoCode.toUpperCase();

    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("promoCode", codeUpper))
      .first();

    if (!promo) {
      throw new Error("Promo code not found");
    }

    await ctx.db.patch(promo._id, {
      isActive: args.isActive,
    });

    return {
      status: "success",
      message: `Promo code ${args.isActive ? "activated" : "deactivated"}`,
    };
  },
});

/**
 * Get user's promo code usage history
 */
export const getUserPromoHistory = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("promoUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return history;
  },
});

/**
 * Get a specific promo code by code
 */
export const getPromoCodeByCode = query({
  args: {
    promoCode: v.string(),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("promoCode", args.promoCode))
      .first();

    return promo;
  },
});

/**
 * Get promo code usage statistics
 */
export const getPromoCodeStats = query({
  args: {
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let usageRecords;

    if (args.promoCode) {
      const code = args.promoCode; // ✅ Store in a const to narrow the type
      usageRecords = await ctx.db
        .query("promoUsers")
        .withIndex("by_code", (q) => q.eq("promoCode", code))
        .collect();
    } else {
      usageRecords = await ctx.db
        .query("promoUsers")
        .collect();
    }

    const stats = {
      totalUsages: usageRecords.length,
      uniqueUsers: new Set(usageRecords.map(r => r.userId)).size,
      totalDaysGranted: usageRecords.reduce((sum, r) => sum + r.subscriptionExtended, 0),
    };

    return stats;
  },
});


/**
 * Apply promo code standalone (no payment required)
 * Validates promo, checks usage, extends subscription
 */
export const applyPromoCodeStandalone = mutation({
  args: {
    userId: v.string(),
    promoCode: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("=== APPLY STANDALONE PROMO CODE ===");
      console.log("User ID:", args.userId);
      console.log("Promo Code:", args.promoCode);

      // 1. Get and validate promo code
      const promo = await ctx.db
        .query("promoCodes")
        .withIndex("by_code", (q) => q.eq("promoCode", args.promoCode.toUpperCase()))
        .first();

      if (!promo) {
        console.log("❌ Promo code not found");
        return {
          status: "error",
          error: "Invalid promo code",
        };
      }

      if (!promo.isActive) {
        console.log("❌ Promo code is inactive");
        return {
          status: "error",
          error: "This promo code is no longer active",
        };
      }

      // Check expiration (endDate is timestamp in seconds)
      const now = Math.floor(Date.now() / 1000);
      if (promo.endDate && promo.endDate < now) {
        console.log("❌ Promo code expired");
        return {
          status: "error",
          error: "This promo code has expired",
        };
      }

      // Check usage limit
      const currentUsages = promo.currentUsages || 0;
      if (promo.maxUsages && currentUsages >= promo.maxUsages) {
        console.log("❌ Promo code usage limit reached");
        return {
          status: "error",
          error: "This promo code has reached its usage limit",
        };
      }

      // 2. Check if user already used this promo
      const existingUsage = await ctx.db
        .query("promoUsers")
        .withIndex("by_user_and_code", (q) =>
          q.eq("userId", args.userId).eq("promoCode", args.promoCode.toUpperCase())
        )
        .first();

      if (existingUsage) {
        console.log("❌ User already used this promo code");
        return {
          status: "error",
          error: "You have already used this promo code",
        };
      }

      // 3. Get user's current subscription
      const user = await ctx.db
        .query("users")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .first();

      if (!user) {
        console.log("❌ User not found");
        return {
          status: "error",
          error: "User not found",
        };
      }

      // 4. Calculate new subscription end date
      const currentSubscriptionEnds = user.subscriptionEnds || now;
      const promoDaysInSeconds = promo.validDays * 24 * 60 * 60;
      const newSubscriptionEnds = currentSubscriptionEnds + promoDaysInSeconds;

      console.log("Current subscription ends:", currentSubscriptionEnds);
      console.log("Adding promo days:", promo.validDays);
      console.log("New subscription ends:", newSubscriptionEnds);

      // 5. Update user subscription
      await ctx.db.patch(user._id, {
        isSubscribed: true,
        subscriptionEnds: newSubscriptionEnds,
        subscriptionId: `promo_${promo.promoCode}_${Date.now()}`,
      });

      console.log("✓ User subscription updated");

      // 6. Record promo usage in promoUsers table
      await ctx.db.insert("promoUsers", {
        userId: args.userId,
        promoCode: args.promoCode.toUpperCase(),
        usedAt: now,
        subscriptionExtended: promo.validDays,
        subscriptionEnds: newSubscriptionEnds,
      });

      console.log("✓ Promo usage recorded in promoUsers");

      // 7. Increment promo usage count in promoCodes table
      await ctx.db.patch(promo._id, {
        currentUsages: currentUsages + 1,
      });

      console.log("✓ Promo usage count updated:", currentUsages + 1);

      return {
        status: "success",
        message: `Promo code applied! ${promo.validDays} days added to your subscription.`,
        daysAdded: promo.validDays,
        newSubscriptionEnds: newSubscriptionEnds,
      };
    } catch (error: any) {
      console.error("❌ Error applying standalone promo code:", error);
      return {
        status: "error",
        error: error.message || "Failed to apply promo code",
      };
    }
  },
});


