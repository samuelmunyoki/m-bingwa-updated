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
    processed: v.optional(v.union(v.literal("pending"), v.literal("successful"), v.literal("failed"))),
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
      processed: args.processed ?? "pending", // Default to "pending" if not provided
    });
  },
});

// Query to get all mpesa messages by userId ordered by time (latest to earliest)
export const getMpesaMessagesByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    let mpesaMessages = await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    // Sort by time from latest to earliest (descending order)
    mpesaMessages = mpesaMessages.sort((a, b) => b.time - a.time);

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
    const message = await ctx.db.get(args.messageId);
    
    // Debug: Log the message to see what fields are present
    console.log("getMpesaMessageById result:", JSON.stringify(message, null, 2));
    
    return message;
  },
});

// Debug query to check if processed field exists in messages
export const debugMpesaMessages = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db.query("mpesaMessages");
    
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    const messages = await query.take(5); // Get first 5 messages
    
    console.log("Debug - Sample messages:", JSON.stringify(messages, null, 2));
    
    return messages.map(msg => ({
      _id: msg._id,
      userId: msg.userId,
      name: msg.name,
      processed: msg.processed,
      hasProcessedField: msg.processed !== undefined
    }));
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
    processed: v.optional(v.union(v.literal("pending"), v.literal("successful"), v.literal("failed"))),
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

// Query to get mpesa messages by processed status
export const getMpesaMessagesByProcessedStatus = query({
  args: { 
    processed: v.union(v.literal("pending"), v.literal("successful"), v.literal("failed")),
    userId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("mpesaMessages")
      .withIndex("by_processed", (q) => q.eq("processed", args.processed));
    
    // Filter by userId if provided
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    // Sort by time from latest to earliest
    let messages = await query.collect();
    messages = messages.sort((a, b) => b.time - a.time);
    
    return messages;
  },
});

// Mutation to update the processed status of a mpesa message
export const updateMpesaMessageProcessedStatus = mutation({
  args: {
    messageId: v.id("mpesaMessages"),
    processed: v.union(v.literal("pending"), v.literal("successful"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const { messageId, processed } = args;
    
    // Update the processed status
    await ctx.db.patch(messageId, { processed });
    
    return {
      success: true,
      message: `Successfully updated message processed status to ${processed}`,
      messageId
    };
  },
});

// Mutation to manually set processed field to pending for messages that don't have it
export const manuallySetProcessedToPending = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all mpesa messages
    const allMessages = await ctx.db.query("mpesaMessages").collect();
    
    console.log(`Found ${allMessages.length} total messages`);
    
    let updatedCount = 0;
    
    // Update messages that don't have processed field
    for (const message of allMessages) {
      if (message.processed === undefined) {
        await ctx.db.patch(message._id, {
          processed: "pending"
        });
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} messages to have processed="pending"`);
    
    return {
      success: true,
      totalMessages: allMessages.length,
      updatedMessages: updatedCount,
      message: `Successfully updated ${updatedCount} out of ${allMessages.length} messages`
    };
  },
});

// Test mutation to verify processed field is always set
export const testCreateMpesaMessage = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    amount: v.number(),
    phoneNumber: v.string(),
    senderId: v.string(),
    time: v.number(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("mpesaMessages", {
      userId: args.userId,
      name: args.name,
      amount: args.amount,
      phoneNumber: args.phoneNumber,
      senderId: args.senderId,
      time: args.time,
      processed: "pending", // Always set default
    });
    
    // Return the created message to verify processed field
    const createdMessage = await ctx.db.get(messageId);
    return createdMessage;
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
