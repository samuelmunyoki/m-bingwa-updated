import { BackendResponse } from "./../../lib/custom_types";
import { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { mutation } from "../functions";
import { api } from "../_generated/api";

export const getStore = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stores")
      .withIndex("by_user", (q) => q.eq("storeOwnerId", args.userId))
      .first();
  },
});

// Define the Bundle type
type Bundle = Doc<"bundles">;

// Internal query to fetch bundles by userId
const getBundlesByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<Bundle[]> => {
    return await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

//getStoreByStoreName query
export const getStoreByStoreName = query({
  args: { storeName: v.string() },
  handler: async (ctx, args) => {
    // Fetch the store data
    const store = await ctx.db
      .query("stores")
      .withIndex("by_storeName", (q) => q.eq("storeName", args.storeName))
      .first();

    if (!store) {
      return null; // Return null if the store is not found
    }

    // Fetch the bundles associated with the store owner using the query
    const bundles = await getBundlesByUserId(ctx, {
      userId: store.storeOwnerId,
    });

    // Return both the store data and the associated bundles
    return {
      store,
      bundles,
    };
  },
});
export const createStore = mutation({
  args: {
    userId: v.string(),
    storeName: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("disabled"),
      v.literal("maintenance")
    ),
    statusDescription: v.optional(v.string()),
    paymentAccount: v.string(),
    paymentMethod: v.union(v.literal("TILL"), v.literal("PAYBILL")),
  },
  handler: async (ctx, args) => {
    console.log("🏪 CREATE STORE CALLED");
    console.log("userId from Android:", args.userId);
    console.log("storeName:", args.storeName);
    console.log("timestamp:", new Date().toISOString());

    const existingStore = await ctx.db
      .query("stores")
      .withIndex("by_storeName", (q) => q.eq("storeName", args.storeName))
      .first();

    if (existingStore) {
      console.log(" Store name already taken:", args.storeName);
      return {
        status: "error",
        message: `${args.storeName} already taken. Please use another store name.`,
      } as BackendResponse;
    }
    console.log("Checking user phone number...");
    console.log("Calling api.users.getUserById with userId:", args.userId);
    
    const userData = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    });


    console.log("userData result:", userData);
    console.log("userData exists:", !!userData);
    console.log("userData.phoneNumber:", userData?.phoneNumber);
    console.log("phoneNumber is null:", userData?.phoneNumber == null);
    console.log("phoneNumber is undefined:", userData?.phoneNumber === undefined);
    console.log("phoneNumber is empty string:", userData?.phoneNumber === "");


    if (userData && userData.phoneNumber != null) {
      console.log("Phone number exists, creating store...");
      await ctx.db.insert("stores", {
        storeName: args.storeName,
        storeOwnerId: args.userId,
        status: args.status,
        statusDescription: args.statusDescription || "",
        paymentAccount: args.paymentAccount,
        paymentMethod: args.paymentMethod,
      });
      console.log("Store created successfully!");
      return {
        status: "success",
        message: `${args.storeName} created successfully.`,
      } as BackendResponse;
    } else {
      console.log("Phone number check failed:");
      console.log("  - userData exists:", !!userData);
      console.log("  - phoneNumber value:", userData?.phoneNumber);
      console.log("  - phoneNumber type:", typeof userData?.phoneNumber);
      return {
        status: "error",
        message: "Please first set your agent phone number in Settings",
      } as BackendResponse;
    }
  },
});

export const updateStore = mutation({
  args: {
    userId: v.string(),
    storeName: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("disabled"),
      v.literal("maintenance")
    ),
    statusDescription: v.string(),
    paymentAccount: v.string(),
    paymentMethod: v.union(v.literal("TILL"), v.literal("PAYBILL")),
  },
  handler: async (ctx, args) => {
    const existingStore = await ctx.db
      .query("stores")
      .withIndex("by_storeName", (q) => q.eq("storeName", args.storeName))
      .first();

    if (existingStore) {
      return {
        status: "error",
        message: `${args.storeName} already taken. Please use another store name.`,
      } as BackendResponse;
    }
    const store = await ctx.db
      .query("stores")
      .withIndex("by_user", (q) => q.eq("storeOwnerId", args.userId))
      .first();

    if (!store) {
      return {
        status: "error",
        message: `${args.storeName} not found.`,
      } as BackendResponse;
    }

    const userData = await ctx.runQuery(api.users.getUserById, {
      userId: args.userId,
    });
    if (userData && userData.phoneNumber != null) {
      await ctx.db.patch(store._id, {
        storeName: args.storeName,
        status: args.status,
        statusDescription: args.statusDescription,
        paymentAccount: args.paymentAccount,
        paymentMethod: args.paymentMethod,
      });
      return {
        status: "success",
        message: `${args.storeName} updated successfully.`,
      } as BackendResponse;
    } else {
      return {
        status: "error",
        message: "Please first set your agent phone number in Settings",
      } as BackendResponse;
    }
  },
});

export const deleteStore = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const store = await ctx.db
      .query("stores")
      .withIndex("by_user", (q) => q.eq("storeOwnerId", args.userId))
      .first();

    if (!store) {
      throw new Error("Store not found");
    }

    await ctx.db.delete(store._id);
  },
});
