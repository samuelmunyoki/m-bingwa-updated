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


export const createBundleFromAPI = mutation({
  args: {
    userId: v.string(),
    offerName: v.string(),
    duration: v.string(),
    bundlesUSSD: v.string(),
    price: v.number(),
    commission: v.optional(v.number()),
    status: v.union(v.literal("available"), v.literal("disabled")),
    isMultiSession: v.boolean(),
    isSimpleUSSD: v.boolean(),
    responseValidatorText: v.optional(v.string()),
    autoReschedule: v.optional(v.string()),
    dialingSIM: v.union(v.literal("SIM1"), v.literal("SIM2")),
    offerType: v.union(
      v.literal("Data"), 
      v.literal("SMS"), 
      v.literal("Minutes"), 
      v.literal("Airtime"),
      v.literal("Bundles"),
      v.literal("Other")
    ),
  },
  handler: async (ctx, args) => {
    const {
      userId,
      offerName,
      duration,
      price,
      commission = 0,
      status,
      bundlesUSSD,
      isMultiSession,
      isSimpleUSSD,
      responseValidatorText = "",
      autoReschedule = "",
      dialingSIM,
      offerType
    } = args;

    // Validation: Ensure only one of isMultiSession or isSimpleUSSD is true
    if (isMultiSession && responseValidatorText && responseValidatorText.trim() !== "") {
      const parts = responseValidatorText.split(",");
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
        return null;
      }
      
      // Validate step is a number
      if (isNaN(parseInt(parts[0].trim()))) {
        return null;
      }
    }
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
        commission,
        status,
        bundlesUSSD,
        isMultiSession,
        isSimpleUSSD,
        responseValidatorText,
        autoReschedule,
        dialingSIM,
        offerType
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
    commission: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("disabled"))),
    isMultiSession: v.optional(v.boolean()),
    isSimpleUSSD: v.optional(v.boolean()),
    responseValidatorText: v.optional(v.string()),
    autoReschedule: v.optional(v.string()),
    dialingSIM: v.optional(v.union(v.literal("SIM1"), v.literal("SIM2"))),
    offerType: v.optional(v.union(
      v.literal("Data"), 
      v.literal("SMS"), 
      v.literal("Minutes"), 
      v.literal("Airtime"),
      v.literal("Bundles"),
      v.literal("Other")
    )),
  },
  handler: async (ctx, args) => {
    const { id, userId, offerName, price, isMultiSession, isSimpleUSSD, responseValidatorText, ...updates } = args;

    const existingBundle = await ctx.db.get(id);
    if (!existingBundle || existingBundle.userId !== userId) {
      return {
        status: "error",
        message: "Bundle not found or you don't have permission to update it.",
      } as BackendResponse;
    }

    // Validation: Ensure only one of isMultiSession or isSimpleUSSD is true
    const finalIsMultiSession = isMultiSession !== undefined ? isMultiSession : existingBundle.isMultiSession;
    const finalIsSimpleUSSD = isSimpleUSSD !== undefined ? isSimpleUSSD : existingBundle.isSimpleUSSD;
    
    if (finalIsMultiSession && finalIsSimpleUSSD) {
      return {
        status: "error",
        message: "Bundle cannot be both Multi-session and Simple USSD. Please select only one option.",
      } as BackendResponse;
    }

    // If isMultiSession is false, responseValidatorText should be empty
    const finalResponseValidatorText = responseValidatorText !== undefined ? responseValidatorText : existingBundle.responseValidatorText;
    if (!finalIsMultiSession && finalResponseValidatorText && finalResponseValidatorText.trim() !== "") {
      return {
        status: "error",
        message: "Response Validator Text can only be set when Multi-session is enabled.",
      } as BackendResponse;
    }

    // Validate responseValidatorText format if provided
    if (finalIsMultiSession && finalResponseValidatorText && finalResponseValidatorText.trim() !== "") {
      const parts = finalResponseValidatorText.split(",");
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
        return {
          status: "error",
          message: "Response Validator Text must be in format: 'step,validation_text' (e.g., '3,250Mbs for 24 hours')",
        } as BackendResponse;
      }
      
      // Validate step is a number
      if (isNaN(parseInt(parts[0].trim()))) {
        return {
          status: "error",
          message: "Validator step must be a valid number.",
        } as BackendResponse;
      }
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
      await ctx.db.patch(id, { 
        offerName, 
        price, 
        isMultiSession: finalIsMultiSession,
        isSimpleUSSD: finalIsSimpleUSSD,
        responseValidatorText: finalResponseValidatorText,
        ...updates 
      });
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
    return {
      status: "success",
      message: `Bundle ${newStatus === "available" ? "enabled" : "disabled"} successfully`,
      newStatus: newStatus
    };
  },
});

export const toggleBundleStatusFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const bundle = await ctx.db
      .query("bundles")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    
    if (!bundle || bundle.userId !== userId) {
      throw new Error(
        "Bundle not found or you don't have permission to update it"
      );
    }
    
    const newStatus = bundle.status === "available" ? "disabled" : "available";
    await ctx.db.patch(bundle._id, { status: newStatus });
    
    return {
      status: "success",
      message: `Bundle ${newStatus === "available" ? "enabled" : "disabled"} successfully`,
      newStatus: newStatus
    };
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