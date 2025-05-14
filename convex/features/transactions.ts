import {
  updateTransaction,
  getByCheckoutRequestID,
} from "./mpesa_transactions";
import { v } from "convex/values";
import {  query } from "../_generated/server";

// Added DB Trigger
import { mutation } from "../functions";

export const createBundlesTransaction = mutation({
  args: {
    storeId: v.string(),
    storeOwnerId: v.string(),
    bundlesID: v.string(),
    bundlesPrice: v.number(),
    payingNumber: v.string(),
    receivingNumber: v.string(),
    paymentMethod: v.string(),
    paymentAccount: v.string(),
    CheckoutRequestID: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("transactions", {
      bundlesID: args.bundlesID,
      bundlesPrice: args.bundlesPrice,
      payingNumber: args.payingNumber,
      paymentAccount: args.paymentAccount,
      paymentMethod: args.paymentMethod,
      storeId: args.storeId,
      receivingNumber: args.receivingNumber,
      storeOwnerId: args.storeOwnerId,
      paymentStatus: "PENDING",
      checkoutRequestID: args.CheckoutRequestID,
    });
  },
});

export const getTransactionsByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    const transactions = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("storeOwnerId"), userId))
      .order("desc")
      .collect();

    const transactionsWithBundleInfo = await Promise.all(
      transactions.map(async (transaction) => {
        const bundle = await ctx.db
          .query("bundles")
          .filter((q) => q.eq(q.field("_id"), transaction.bundlesID))
          .first();

        return {
          ...transaction,
          offerName: bundle?.offerName || "N/A",
          duration: bundle?.duration || "N/A",
        };
      })
    );

    return transactionsWithBundleInfo;
  },
});

export const updateTransactionStatus = mutation({
  args: {
    checkoutRequestID: v.string(),
    paymentStatus: v.union(
      v.literal("PENDING"),
      v.literal("CANCELLED"),
      v.literal("TIMEDOUT"),
      v.literal("CONFIRMED"),
      v.literal("ERRORED")
    ),
  },
  handler: async (ctx, args) => {
    const extTxn = await ctx.db
      .query("transactions")
      .withIndex("by_checkoutrequest_id", (q) =>
        q.eq("checkoutRequestID", args.checkoutRequestID)
      )
      .first();
    if (extTxn) {
      await ctx.db.patch(extTxn._id, {
        paymentStatus: args.paymentStatus,
      });
    }
  },
});

export const getReceivingNumberToday = query({
  args: {
    receivingNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get today's date at midnight (start of the day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await ctx.db
      .query("transactions")
      .withIndex("by_recieving_number_id", (q) =>
        q.eq("receivingNumber", args.receivingNumber)
      )
      .filter((q) => q.gte(q.field("_creationTime"), today.getTime()))
      .order("desc")
      .first();
  },
});
