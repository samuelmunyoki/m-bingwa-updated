import { v } from "convex/values";
import { mutation } from "../functions";
import { BackendResponse } from "../../lib/custom_types";
import { query } from "../_generated/server";

export const createSMS = mutation({
  args: {
    service: v.union(
      v.literal("USSD"),
      v.literal("SCHEDULER"),
      v.literal("STORE"),
      v.literal("NOTIFICATION")
    ),
    userId: v.string(),
    smsContent: v.string(),
    smsReciepient: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const smsId = await ctx.db.insert("sms", {
        userId: args.userId,
        smsContent: args.smsContent,
        smsReciepient: args.smsReciepient,
        service: args.service,
      });

      return {
        status: "success",
        message: `${args.smsContent} sent to ${args.smsReciepient}.`,
        data: {
          id: smsId,
          ...args,
        },
      } as BackendResponse;
    } catch (error) {
      return {
        status: "error",
        message: "Unexpected error. Please try again later.",
      } as BackendResponse;
    }
  },
});

export const getSMSHistory = query({
  args: {
    userId: v.string(),
    service: v.union(v.literal("USSD"), v.literal("SCHEDULER")),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    const smsHistory = await ctx.db
      .query("sms")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("service"), args.service))
      .order("desc")
      .collect();
    return smsHistory;
  },
});

export const getSMSByMessageId = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const sms = await ctx.db
      .query("sms")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
    return sms;
  },
});

export const updateSMS = mutation({
  args: {
    smsId: v.string(),
    service: v.union(
      v.literal("USSD"),
      v.literal("STORE"),
      v.literal("SCHEDULER"),
      v.literal("NOTIFICATION")
    ),
    messageId: v.optional(v.string()),
    status: v.optional(v.string()),
    timeTaken: v.optional(v.string()),
    timeStamp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Query the SMS record by ID
      const sms = await ctx.db
        .query("sms")
        .filter((q) => q.eq(q.field("_id"), args.smsId))
        .filter((q) => q.eq(q.field("service"), args.service))
        .first();

      if (sms) {
        // Prepare an update object with only the fields provided in args
        const updateFields = {
          ...(args.messageId && { messageId: args.messageId }),
          ...(args.status && { status: args.status }),
          ...(args.timeTaken && { timeTaken: args.timeTaken }),
          ...(args.timeStamp && { timeStamp: args.timeStamp }),
        };

        // Update the SMS record
        await ctx.db.patch(sms._id, updateFields);
      }
    } catch (error) {
      console.error("Failed to update SMS record:", error);
    }
  },
});

export const updateSMSByMessageID = mutation({
  args: {
    messageId: v.string(),
    status: v.optional(v.string()),
    timeTaken: v.optional(v.string()),
    timeStamp: v.optional(v.string()),
    service: v.union(
      v.literal("USSD"),
      v.literal("SCHEDULER"),
      v.literal("STORE"),
      v.literal("NOTIFICATION")
    ),
  },
  handler: async (ctx, args) => {
    try {
      // Query the SMS record by messageId
      const sms = await ctx.db
        .query("sms")
        .filter((q) => q.eq(q.field("messageId"), args.messageId))
        .filter((q) => q.eq(q.field("service"), args.service))
        .first();

      if (sms) {
        // Prepare an update object with only the fields provided in args
        const updateFields = {
          ...(args.status && { status: args.status }),
          ...(args.timeTaken && { timeTaken: args.timeTaken }),
          ...(args.timeStamp && { timeStamp: args.timeStamp }),
        };

        // Update the SMS record
        await ctx.db.patch(sms._id, updateFields);
      }
    } catch (error) {
      console.error("Failed to update SMS record:", error);
    }
  },
});

export const deleteSMS = mutation({
  args: { id: v.id("sms") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
