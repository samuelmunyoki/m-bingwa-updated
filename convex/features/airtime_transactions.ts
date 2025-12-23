import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create airtime transaction record
 */
export const createAirtimeTransaction = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    recipientNumber: v.string(),
    amount: v.number(),
    ussdCode: v.string(),
    ussdResponse: v.string(),
    parsedAmount: v.optional(v.number()),
    parsedRecipient: v.optional(v.string()),
    status: v.union(v.literal("PENDING"), v.literal("SUCCESS"), v.literal("FAILED")),
    subscriptionEnds: v.number(),
    subscriptionDays: v.number(),
    paidDays: v.number(),
    promoDays: v.optional(v.number()),
    promoCode: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    simSlot: v.string(),
  },
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("airtimeTransactions", {
      ...args,
      transactionDate: Math.floor(Date.now() / 1000),
    });

    console.log("✓ Airtime transaction created:", transactionId);

    // If transaction is successful, update user subscription
    if (args.status === "SUCCESS") {
      const user = await ctx.db
        .query("users")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId)) 
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          isSubscribed: true,
          subscriptionEnds: args.subscriptionEnds,
          subscriptionId: transactionId,
        });

        console.log("✓ User subscription updated via airtime payment");
      }
    }

    return {
      status: "success",
      transactionId,
      message: args.status === "SUCCESS" 
        ? "Subscription activated successfully"
        : "Transaction recorded",
    };
  },
});

/**
 * Update airtime transaction status (for retry or confirmation)
 */
export const updateAirtimeTransactionStatus = mutation({
  args: {
    transactionId: v.id("airtimeTransactions"),
    status: v.union(v.literal("SUCCESS"), v.literal("FAILED")),
    ussdResponse: v.optional(v.string()),
    parsedAmount: v.optional(v.number()),
    parsedRecipient: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await ctx.db.patch(args.transactionId, {
      status: args.status,
      ussdResponse: args.ussdResponse || transaction.ussdResponse,
      parsedAmount: args.parsedAmount,
      parsedRecipient: args.parsedRecipient,
      failureReason: args.failureReason,
    });

    // If now successful, update user subscription
    if (args.status === "SUCCESS") {
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), transaction.userId))
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          isSubscribed: true,
          subscriptionEnds: transaction.subscriptionEnds,
          subscriptionId: args.transactionId,
        });
      }
    }

    return {
      status: "success",
      message: "Transaction updated",
    };
  },
});

/**
 * Get airtime transactions for a user
 */
export const getUserAirtimeTransactions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("airtimeTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return transactions;
  },
});

/**
 * Get all airtime transactions (admin function)
 */
export const getAllAirtimeTransactions = query({
  args: {
    status: v.optional(v.union(v.literal("PENDING"), v.literal("SUCCESS"), v.literal("FAILED"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("airtimeTransactions")
        .withIndex("by_status", (q) => q.eq("status", args.status!)) // Add ! to assert non-null
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("airtimeTransactions")
      .order("desc")
      .collect();
  },
});

/**
 * Get airtime transaction statistics
 */
export const getAirtimeStats = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let transactions;

    if (args.userId) {
      transactions = await ctx.db
        .query("airtimeTransactions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .collect();
    } else {
      transactions = await ctx.db.query("airtimeTransactions").collect();
    }

    const stats = {
      total: transactions.length,
      successful: transactions.filter((t) => t.status === "SUCCESS").length,
      failed: transactions.filter((t) => t.status === "FAILED").length,
      pending: transactions.filter((t) => t.status === "PENDING").length,
      totalAmount: transactions
        .filter((t) => t.status === "SUCCESS")
        .reduce((sum, t) => sum + t.amount, 0),
    };

    return stats;
  },
});
