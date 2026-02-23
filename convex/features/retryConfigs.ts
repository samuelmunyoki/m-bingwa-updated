// retryConfigs.ts — place in convex/features/retryConfigs.ts

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";


export const getAllRetryConfigs = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("retryConfigs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});


export const createRetryConfig = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    timeoutSeconds: v.number(),
    autoRetryEnabled: v.boolean(),
    numberOfRetries: v.number(),
    retryIntervalMinutes: v.number(),
    selectedOffers: v.array(v.string()),
    autoRetryConnectionProblems: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, name } = args;

    // Check for duplicate name for this user
    const existing = await ctx.db
      .query("retryConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), name))
      .first();

    if (existing) {
      return {
        status: "error",
        message: `A retry configuration named "${name}" already exists.`,
        id: null,
      };
    }

    try {
      const id = await ctx.db.insert("retryConfigs", {
        ...args,
        updatedAt: Date.now(),
      });
      return {
        status: "success",
        message: "Retry configuration created successfully.",
        id: id.toString(),
      };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to create retry configuration.",
        id: null,
      };
    }
  },
});

export const updateRetryConfig = mutation({
  args: {
    id: v.id("retryConfigs"),
    userId: v.string(),
    name: v.optional(v.string()),
    timeoutSeconds: v.optional(v.number()),
    autoRetryEnabled: v.optional(v.boolean()),
    numberOfRetries: v.optional(v.number()),
    retryIntervalMinutes: v.optional(v.number()),
    selectedOffers: v.optional(v.array(v.string())),
    autoRetryConnectionProblems: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, userId, name, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      return {
        status: "error",
        message: "Retry configuration not found or permission denied.",
      };
    }

    // Check duplicate name if name is being changed
    if (name && name !== existing.name) {
      const duplicate = await ctx.db
        .query("retryConfigs")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("name"), name))
        .first();

      if (duplicate) {
        return {
          status: "error",
          message: `A retry configuration named "${name}" already exists.`,
        };
      }
    }

    try {
      await ctx.db.patch(id, {
        ...(name !== undefined && { name }),
        ...updates,
        updatedAt: Date.now(),
      });
      return {
        status: "success",
        message: "Retry configuration updated successfully.",
      };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to update retry configuration.",
      };
    }
  },
});

export const deleteRetryConfig = mutation({
  args: {
    id: v.id("retryConfigs"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      return {
        status: "error",
        message: "Retry configuration not found or permission denied.",
      };
    }

    try {
      await ctx.db.delete(args.id);
      return {
        status: "success",
        message: "Retry configuration deleted successfully.",
      };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to delete retry configuration.",
      };
    }
  },
});