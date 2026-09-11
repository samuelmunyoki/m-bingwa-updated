import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a new token bundle (admin)
 */
export const createTokenBundle = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    tokens: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.price <= 0) {
      throw new Error("Price must be greater than 0");
    }
    if (args.tokens <= 0) {
      throw new Error("Token count must be greater than 0");
    }

    const tokenBundleId = await ctx.db.insert("tokenBundles", {
      name: args.name.trim(),
      price: args.price,
      tokens: args.tokens,
      description: args.description,
      isActive: true,
      createdAt: Date.now(),
    });

    console.log("✓ Token bundle created:", args.name);

    return {
      status: "success",
      tokenBundleId,
      message: "Token bundle created successfully",
    };
  },
});

/**
 * Update an existing token bundle (admin) — also used to activate/deactivate
 */
export const updateTokenBundle = mutation({
  args: {
    tokenBundleId: v.id("tokenBundles"),
    name: v.string(),
    price: v.number(),
    tokens: v.number(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.tokenBundleId);
    if (!existing) {
      throw new Error("Token bundle not found");
    }

    if (args.price <= 0) {
      throw new Error("Price must be greater than 0");
    }
    if (args.tokens <= 0) {
      throw new Error("Token count must be greater than 0");
    }

    await ctx.db.patch(args.tokenBundleId, {
      name: args.name.trim(),
      price: args.price,
      tokens: args.tokens,
      description: args.description,
      isActive: args.isActive,
    });

    return {
      status: "success",
      message: "Token bundle updated successfully",
    };
  },
});

/**
 * Delete a token bundle (admin)
 */
export const deleteTokenBundle = mutation({
  args: {
    tokenBundleId: v.id("tokenBundles"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.tokenBundleId);
    if (!existing) {
      throw new Error("Token bundle not found");
    }

    await ctx.db.delete(args.tokenBundleId);

    return {
      status: "success",
      message: "Token bundle deleted successfully",
    };
  },
});

/**
 * Get all token bundles, including inactive (admin management page)
 */
export const getAllTokenBundles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tokenBundles").collect();
  },
});

/**
 * Get only active token bundles (app + website purchase screens)
 */
export const getActiveTokenBundles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tokenBundles")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Get a single token bundle by id — used at purchase-initiation time to read its
 * current price/token count (see project_token_subscription_feature: bundle amount is
 * looked up live, not snapshotted — an admin edit/delete mid-payment is an accepted
 * rare edge case).
 */
export const getTokenBundleById = query({
  args: { tokenBundleId: v.id("tokenBundles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tokenBundleId);
  },
});
