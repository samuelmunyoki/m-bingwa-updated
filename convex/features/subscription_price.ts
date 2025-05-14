import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { BackendResponse } from "../../lib/custom_types";

export const createOrUpdateSubscriptionPrice = mutation({
  args: {
    price: v.number(),
    paymentMethod: v.string(),
    paymentAccount: v.string(),
  },
  handler: async (ctx, { price, paymentAccount, paymentMethod }) => {
    try {
      const subPriceexists = await ctx.db.query("subscription_price").first();
      if (subPriceexists) {
        await ctx.db.patch(subPriceexists._id, {
          price,
          paymentAccount,
          paymentMethod,
        });
        return {
          status: "success",
          message: "Subscription price updated.",
        } as BackendResponse;
      } else {
        await ctx.db.insert("subscription_price", {
          price,
          paymentAccount,
          paymentMethod,
        });
        return {
          status: "success",
          message: "Subscription price created.",
        } as BackendResponse;
      }
    } catch (error) {
      return {
        status: "error",
        message: "Error handling subscription price",
      } as BackendResponse;
    }
  },
});

export const querySubscriptionPrice = query({
  args: {},
  handler: async (ctx, args) => {
    return await ctx.db.query("subscription_price").first();
  },
});

export const querySubscriptionSettings = query({
  args: {},
  handler: async (ctx, args) => {
    return await ctx.db.query("subscription_price").first();
  },
});
