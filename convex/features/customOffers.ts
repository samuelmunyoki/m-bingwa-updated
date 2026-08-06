import { v } from "convex/values";
import { mutation } from "../functions";
import { query } from "../_generated/server";
import { BackendResponse } from "../../lib/custom_types";

const offerTypeArg = v.union(
  v.literal("Data"),
  v.literal("SMS"),
  v.literal("Minutes"),
  v.literal("Airtime"),
  v.literal("Bundles"),
  v.literal("Other")
);

export const getCustomOffersByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customOffers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const createCustomOfferFromAPI = mutation({
  args: {
    userId: v.string(),
    offerName: v.string(),
    offerType: offerTypeArg,
    price: v.number(),
    status: v.union(v.literal("available"), v.literal("disabled")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customOffers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("offerName"), args.offerName))
      .first();

    if (existing) {
      throw new Error(
        `A custom offer with the name "${args.offerName}" already exists.`
      );
    }

    const id = await ctx.db.insert("customOffers", args);
    return id.toString();
  },
});

export const updateCustomOfferFromAPI = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
    offerName: v.optional(v.string()),
    offerType: v.optional(offerTypeArg),
    price: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("disabled"))),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;
    const existing = await ctx.db
      .query("customOffers")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();

    if (!existing || existing.userId !== userId) {
      return {
        status: "error",
        message: "Custom offer not found or you don't have permission to update it.",
      } as BackendResponse;
    }

    await ctx.db.patch(existing._id, updates);
    return {
      status: "success",
      message: "Custom offer updated successfully.",
    } as BackendResponse;
  },
});

export const deleteCustomOfferFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customOffers")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();

    if (!existing) {
      throw new Error("Custom offer not found");
    }
    if (existing.userId !== args.userId) {
      throw new Error("Permission denied");
    }
    await ctx.db.delete(existing._id);
  },
});

export const toggleCustomOfferStatusFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customOffers")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();

    if (!existing || existing.userId !== args.userId) {
      throw new Error("Custom offer not found or you don't have permission to update it");
    }

    const newStatus = existing.status === "available" ? "disabled" : "available";
    await ctx.db.patch(existing._id, { status: newStatus });
    return {
      status: "success",
      message: `Custom offer ${newStatus === "available" ? "enabled" : "disabled"} successfully`,
      newStatus,
    };
  },
});
