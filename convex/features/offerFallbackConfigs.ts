import { v } from "convex/values";
import { mutation } from "../functions";
import { query } from "../_generated/server";
import { BackendResponse } from "../../lib/custom_types";

// Backend persistence + cross-device sync only for Offer Fallback Configs (pairs a "main" offer
// with a "secondary" offer the Android app dials when the main offer's USSD response comes back
// "Already Recommended"). Deliberately no website UI reads/writes this table — see the Android
// repo's OfferFallbackConfigEntity for the full design. Mirrors features/offerTimeConfigs.ts's
// create/update/delete-by-string-id conventions, including the local-UUID-then-reconcile-to-
// Convex-id pattern.

const kindArgs = v.union(v.literal("NORMAL"), v.literal("PATTERN"));

const fallbackFields = {
  isEnabled: v.boolean(),
  mainKind: kindArgs,
  mainBundleId: v.string(),
  secondaryKind: kindArgs,
  secondaryBundleId: v.string(),
};

export const getOfferFallbackConfigs = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("offerFallbackConfigs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const createOfferFallbackConfigFromAPI = mutation({
  args: { userId: v.string(), ...fallbackFields },
  handler: async (ctx, args) => {
    try {
      const id = await ctx.db.insert("offerFallbackConfigs", args);
      return {
        status: "success",
        message: "Fallback Config created",
        data: { id: id.toString() },
      } as BackendResponse;
    } catch (error: any) {
      return {
        status: "error",
        message: error.message ?? "Failed to create Fallback Config",
        data: null,
      } as BackendResponse;
    }
  },
});

export const updateOfferFallbackConfigFromAPI = mutation({
  args: { id: v.string(), userId: v.string(), ...fallbackFields },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    const existing = await ctx.db
      .query("offerFallbackConfigs")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();

    if (!existing || existing.userId !== userId) {
      return {
        status: "error",
        message: "Fallback Config not found or you don't have permission to update it.",
        data: null,
      } as BackendResponse;
    }

    try {
      await ctx.db.patch(existing._id, updates);
      return { status: "success", message: "Fallback Config updated", data: null } as BackendResponse;
    } catch (error: any) {
      return {
        status: "error",
        message: error.message ?? "Failed to update Fallback Config",
        data: null,
      } as BackendResponse;
    }
  },
});

export const deleteOfferFallbackConfigFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const existing = await ctx.db
      .query("offerFallbackConfigs")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();

    if (!existing) {
      throw new Error("Fallback Config not found");
    }
    if (existing.userId !== userId) {
      throw new Error("Permission denied");
    }
    await ctx.db.delete(existing._id);
  },
});
