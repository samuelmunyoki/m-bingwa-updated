import { v } from "convex/values";
import { mutation } from "../functions";
import { query } from "../_generated/server";

export const createMpesaTransaction = mutation({
  args: {
    merchantRequestID: v.string(),
    checkoutRequestID: v.string(),
    resultCode: v.number(),
    resultDesc: v.string(),
    phoneNumber: v.string(),
    accountReference: v.string(),
    transactionDesc: v.string(),
    paymentMethod: v.string(),
    paymentAccount: v.string(),
    paymentFor: v.union(v.literal("STORE"), v.literal("SUBSCRIPTION")),
    subscriptionEnds: v.optional(v.number()), // ADD THIS
    userId: v.optional(v.string()), // ADD THIS
  },
  handler: async (ctx, args) => {
    try {
      const createFields = {
        merchantRequestID: args.merchantRequestID,
        checkoutRequestID: args.checkoutRequestID,
        resultCode: args.resultCode,
        resultDesc: args.resultDesc,
        phoneNumber: args.phoneNumber,
        accountReference: args.accountReference,
        transactionDesc: args.transactionDesc,
        paymentMethod: args.paymentMethod,
        paymentAccount: args.paymentAccount,
        paymentFor: args.paymentFor,
        subscriptionEnds: args.subscriptionEnds, // ADD THIS
        userId: args.userId, // ADD THIS
      };

      await ctx.db.insert("mpesa_transactions", createFields);
    } catch (error) {
      console.error("Error creating M-Pesa transaction:", error);
    }
  },
});

export const getByCheckoutRequestID = query({
  args: { checkoutRequestID: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mpesa_transactions")
      .withIndex("by_checkoutRequestID", (q) =>
        q.eq("checkoutRequestID", args.checkoutRequestID)
      )
      .first();
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id("mpesa_transactions"),
    resultCode: v.number(),
    resultDesc: v.string(),
    amount: v.optional(v.number()),
    mpesaReceiptNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    await ctx.db.patch(id, updateData);
  },
});
