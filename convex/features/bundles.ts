import { v } from "convex/values";
import { mutation } from "../functions";
import { query } from "../_generated/server";
import { BackendResponse } from "../../lib/custom_types";

export const getAllBundles = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const createBundle = mutation({
  args: {
    userId: v.string(),
    offerName: v.string(),
    duration: v.string(),
    bundlesUSSD: v.string(),
    price: v.number(),
    status: v.union(v.literal("available"), v.literal("disabled")),
    isMultiSession: v.boolean(),
    dialingSIM: v.union(v.literal("SIM1"), v.literal("SIM2")),
  },
  handler: async (ctx, args) => {
    const {
      userId,
      offerName,
      duration,
      price,
      status,
      bundlesUSSD,
      isMultiSession,
      dialingSIM,
    } = args;

    // Check for existing bundle with the same name or price for this user
    const existingBundle = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("offerName"), offerName),
          q.eq(q.field("price"), price)
        )
      )
      .first();

    if (existingBundle) {
      if (existingBundle.offerName === offerName) {
        return {
          status: "error",
          message: `A bundle with the name "${offerName}" already exists. Please choose a different name.`,
        } as BackendResponse;
      } else {
        return {
          status: "error",
          message: `A bundle with the price ${price} already exists. Please choose a different price.`,
        } as BackendResponse;
      }
    }

    try {
      await ctx.db.insert("bundles", {
        userId,
        offerName,
        duration,
        price,
        status,
        bundlesUSSD,
        isMultiSession,
        dialingSIM,
      });
      return {
        status: "success",
        message: `Bundle "${offerName}" created successfully.`,
      } as BackendResponse;
    } catch (error) {
      return {
        status: "error",
        message:
          "An error occurred while creating the bundle. Please try again later.",
      } as BackendResponse;
    }
  },
});

export const createBundleFromAPI = mutation({
  args: {
    userId: v.string(),
    offerName: v.string(),
    duration: v.string(),
    bundlesUSSD: v.string(),
    price: v.number(),
    status: v.union(v.literal("available"), v.literal("disabled")),
    isMultiSession: v.boolean(),
     dialingSIM: v.union(v.literal("SIM1"), v.literal("SIM2")),
  },
  handler: async (ctx, args) => {
    const {
      userId,
      offerName,
      duration,
      price,
      status,
      bundlesUSSD,
      isMultiSession,
      dialingSIM
    } = args;

    // Check for existing bundle with the same name or price for this user
    const existingBundle = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("offerName"), offerName),
          q.eq(q.field("price"), price)
        )
      )
      .first();

    if (existingBundle) {
      if (existingBundle.offerName === offerName) {
        return null;
      } else {
        return null;
      }
    }

    try {
      const id = await ctx.db.insert("bundles", {
        userId,
        offerName,
        duration,
        price,
        status,
        bundlesUSSD,
        isMultiSession,
        dialingSIM
      });
      return id.toString();
    } catch (error) {
      return null;
    }
  },
});

export const updateBundle = mutation({
  args: {
    id: v.id("bundles"),
    userId: v.string(),
    offerName: v.optional(v.string()),
    duration: v.optional(v.string()),
    bundlesUSSD: v.optional(v.string()),
    price: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("disabled"))),
    isMultiSession: v.optional(v.boolean()),
    dialingSIM:v.optional( v.union(v.literal("SIM1"), v.literal("SIM2"))),
  },
  handler: async (ctx, args) => {
    const { id, userId, offerName, price, ...updates } = args;

    const existingBundle = await ctx.db.get(id);
    if (!existingBundle || existingBundle.userId !== userId) {
      return {
        status: "error",
        message: "Bundle not found or you don't have permission to update it.",
      } as BackendResponse;
    }

    if (offerName || price !== undefined) {
      // Check if the new offer name or price already exists for this user (excluding the current bundle)
      const duplicateBundle = await ctx.db
        .query("bundles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) =>
          q.and(
            q.neq(q.field("_id"), id),
            q.or(
              offerName ? q.eq(q.field("offerName"), offerName) : q.eq(1, 0),
              price !== undefined ? q.eq(q.field("price"), price) : q.eq(1, 0)
            )
          )
        )
        .first();

      if (duplicateBundle) {
        if (offerName && duplicateBundle.offerName === offerName) {
          return {
            status: "error",
            message: `A bundle with the name "${offerName}" already exists. Please choose a different name.`,
          } as BackendResponse;
        } else {
          return {
            status: "error",
            message: `A bundle with the price ${price} already exists. Please choose a different price.`,
          } as BackendResponse;
        }
      }
    }

    try {
      await ctx.db.patch(id, { offerName, price, ...updates });
      return {
        status: "success",
        message: `Bundle updated successfully.`,
      } as BackendResponse;
    } catch (error) {
      return {
        status: "error",
        message:
          "An error occurred while updating the bundle. Please try again later.",
      } as BackendResponse;
    }
  },
});

export const deleteBundle = mutation({
  args: { id: v.id("bundles"), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const existingBundle = await ctx.db.get(id);
    if (!existingBundle) {
      throw new Error("Bundle not found!");
    }
    if (existingBundle.userId !== userId) {
      throw new Error("Permission denied!");
    }
    await ctx.db.delete(id);
  },
});

export const deleteBundleFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const existingBundle = await ctx.db
      .query("bundles")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    if (!existingBundle) {
      throw new Error("Bundle not found");
    }
    if (existingBundle.userId !== userId) {
      throw new Error("Permission denied");
    }
    await ctx.db.delete(existingBundle._id);
  },
});

export const toggleBundleStatus = mutation({
  args: { id: v.id("bundles"), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const bundle = await ctx.db.get(id);
    if (!bundle || bundle.userId !== userId) {
      throw new Error(
        "Bundle not found or you don't have permission to update it"
      );
    }
    const newStatus = bundle.status === "available" ? "disabled" : "available";
    await ctx.db.patch(id, { status: newStatus });
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getBundleByBundleID = query({
  args: {
    bundleId: v.string(),
  },
  handler: (ctx, args) => {
    return ctx.db
      .query("bundles")
      .filter((q) => q.eq(q.field("_id"), args.bundleId))
      .first();
  },
});

export const getBundleByUserAndNameOrPrice = query({
  args: {
    userId: v.string(),
    offerName: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, offerName, price } = args;

    // Query the bundles table for matching entries
    const existingBundle = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("offerName"), offerName),
          q.eq(q.field("price"), price)
        )
      )
      .first();

    return existingBundle;
  },
});

export const getDuplicateBundle = query({
  args: {
    userId: v.string(),
    offerName: v.optional(v.string()),
    price: v.optional(v.number()),
    excludeId: v.id("bundles"),
  },
  handler: async (ctx, args) => {
    const { userId, offerName, price, excludeId } = args;

    // If neither offerName nor price is provided, no need to check for duplicates
    if (offerName === undefined && price === undefined) {
      return null;
    }

    const duplicateBundle = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), excludeId),
          q.or(
            offerName ? q.eq(q.field("offerName"), offerName) : q.eq(1, 0),
            price !== undefined ? q.eq(q.field("price"), price) : q.eq(1, 0)
          )
        )
      )
      .first();

    return duplicateBundle;
  },
});