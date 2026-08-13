import { v } from "convex/values";
import { mutation } from "../functions";
import { query } from "../_generated/server";
import { BackendResponse } from "../../lib/custom_types";

// Backend persistence + cross-device sync only for Offer Time Configs (pairs two offers sharing
// a price with daily time windows, so the Android app can auto-switch which is "active" as
// Safaricom rotates offers by time of day). Deliberately no website UI reads/writes this table —
// see project_offer_time_config_feature memory (Android repo) / plan
// "enumerated-splashing-wadler". Mirrors features/bundles.ts's create/update/delete-by-string-id
// conventions, including the local-UUID-then-reconcile-to-Convex-id pattern
// (PatternOfferDao.updateOfferId's Android-side counterpart).

const variantAKindArgs = v.union(v.literal("NORMAL"), v.literal("PATTERN"));
// Variant B only — "NONE" means a single-offer schedule with no partner to switch to.
const variantBKindArgs = v.union(v.literal("NORMAL"), v.literal("PATTERN"), v.literal("NONE"));

const variantFields = {
  price: v.number(),
  isEnabled: v.boolean(),
  variantAKind: variantAKindArgs,
  variantAStartTime: v.string(),
  variantAEndTime: v.string(),
  variantABundleId: v.optional(v.string()),
  variantAServerOfferId: v.optional(v.string()),
  variantAPatternSnapshotJson: v.optional(v.string()),
  variantBKind: variantBKindArgs,
  variantBStartTime: v.string(),
  variantBEndTime: v.string(),
  variantBBundleId: v.optional(v.string()),
  variantBServerOfferId: v.optional(v.string()),
  variantBPatternSnapshotJson: v.optional(v.string()),
};

export const getOfferTimeConfigs = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("offerTimeConfigs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const createOfferTimeConfigFromAPI = mutation({
  args: { userId: v.string(), ...variantFields },
  handler: async (ctx, args) => {
    try {
      const id = await ctx.db.insert("offerTimeConfigs", args);
      return {
        status: "success",
        message: "Time Config created",
        data: { id: id.toString() },
      } as BackendResponse;
    } catch (error: any) {
      return {
        status: "error",
        message: error.message ?? "Failed to create Time Config",
        data: null,
      } as BackendResponse;
    }
  },
});

export const updateOfferTimeConfigFromAPI = mutation({
  args: { id: v.string(), userId: v.string(), ...variantFields },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    const existing = await ctx.db
      .query("offerTimeConfigs")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();

    if (!existing || existing.userId !== userId) {
      return {
        status: "error",
        message: "Time Config not found or you don't have permission to update it.",
        data: null,
      } as BackendResponse;
    }

    try {
      await ctx.db.patch(existing._id, updates);
      return { status: "success", message: "Time Config updated", data: null } as BackendResponse;
    } catch (error: any) {
      return {
        status: "error",
        message: error.message ?? "Failed to update Time Config",
        data: null,
      } as BackendResponse;
    }
  },
});

export const deleteOfferTimeConfigFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const existing = await ctx.db
      .query("offerTimeConfigs")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();

    if (!existing) {
      throw new Error("Time Config not found");
    }
    if (existing.userId !== userId) {
      throw new Error("Permission denied");
    }
    await ctx.db.delete(existing._id);
  },
});
