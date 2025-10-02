import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Mutation to create a new mpesa message
export const createMpesaMessage = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    amount: v.number(),
    phoneNumber: v.string(),
    senderId: v.string(),
    time: v.number(),
    transactionId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("mpesaMessages", {
      userId: args.userId,
      name: args.name,
      amount: args.amount,
      phoneNumber: args.phoneNumber,
      senderId: args.senderId,
      time: args.time,
      transactionId: args.transactionId ?? undefined,
    });
  },
});

// Query to get all mpesa messages by userId ordered by time (earliest to latest)
export const getMpesaMessagesByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    let mpesaMessages = await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    // Sort by time from earliest to latest
    mpesaMessages = mpesaMessages.sort((a, b) => a.time - b.time);

    return mpesaMessages;
  },
});

// Query to get all mpesa messages
export const getAllMpesaMessages = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("mpesaMessages")
      .order("desc")
      .collect();
  },
});

// Query to get mpesa message by messageId
export const getMpesaMessageById = query({
  args: { messageId: v.id("mpesaMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

// Mutation to update mpesa message
export const updateMpesaMessage = mutation({
  args: {
    messageId: v.id("mpesaMessages"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    phoneNumber: v.optional(v.string()),
    senderId: v.optional(v.string()),
    time: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { messageId, ...updates } = args;
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(messageId, cleanUpdates);
    }
  },
});

// Mutation to delete mpesa message
export const deleteMpesaMessage = mutation({
  args: { messageId: v.id("mpesaMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});

// Query to get mpesa messages by phone number
export const getMpesaMessagesByPhoneNumber = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("phoneNumber"), args.phoneNumber))
      .order("desc")
      .collect();
  },
});

// Query to get mpesa messages by sender ID
export const getMpesaMessagesBySenderId = query({
  args: { senderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("senderId"), args.senderId))
      .order("desc")
      .collect();
  },
});

// Mutation to delete all mpesa messages for a specific user
export const deleteAllMpesaMessages = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all mpesa messages for the specific user
    const userMessages = await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Delete each message for this user
    for (const message of userMessages) {
      await ctx.db.delete(message._id);
    }

    return {
      success: true,
      message: `Successfully deleted ${userMessages.length} mpesa messages for user ${args.userId}`,
      deletedCount: userMessages.length,
      userId: args.userId
    };
  },
});
