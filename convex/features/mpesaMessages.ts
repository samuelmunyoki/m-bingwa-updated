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
    processed: v.optional(v.union(v.literal("pending"), v.literal("successful"), v.literal("failed"), v.literal("not-viable"))),
    fullMessage: v.optional(v.string()),
    processResponse: v.optional(v.string()),
    offerName: v.optional(v.string()),
    processedUSSD: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("mpesaMessages", {
      userId: args.userId,
      name: args.name,
      amount: args.amount,
      phoneNumber: args.phoneNumber,
      senderId: args.senderId,
      time: args.time,
      transactionId: args.transactionId ?? undefined,
      processed: args.processed ?? "pending", // Default to "pending" if not provided
      fullMessage: args.fullMessage ?? undefined,
      processResponse: args.processResponse ?? undefined,
      offerName: args.offerName ?? "", // Default to empty string if not provided
      processedUSSD: args.processedUSSD ?? "", // Default to empty string if not provided
    });

    // Return the full message object with ID
    const message = await ctx.db.get(messageId);
    return message;
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

    // Ensure all messages include the new fields (even if undefined/null)
    const messagesWithAllFields = mpesaMessages.map(message => ({
      ...message,
      fullMessage: message.fullMessage ?? null,
      processResponse: message.processResponse ?? null,
      processed: message.processed ?? "pending",
      offerName: message.offerName ?? "",
      processedUSSD: message.processedUSSD ?? ""
    }));

    return messagesWithAllFields;
  },
});

// Query to get all mpesa messages
export const getAllMpesaMessages = query({
  handler: async (ctx) => {
    const messages = await ctx.db
      .query("mpesaMessages")
      .order("desc")
      .collect();

    // Ensure all messages include the new fields (even if undefined/null)
    const messagesWithAllFields = messages.map(message => ({
      ...message,
      fullMessage: message.fullMessage ?? null,
      processResponse: message.processResponse ?? null,
      processed: message.processed ?? "pending",
      offerName: message.offerName ?? "",
      processedUSSD: message.processedUSSD ?? ""
    }));

    return messagesWithAllFields;
  },
});

// Query to get mpesa message by messageId
export const getMpesaMessageById = query({
  args: { messageId: v.id("mpesaMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    
    if (!message) {
      return null;
    }

    // Ensure the message includes all fields
    const messageWithAllFields = {
      ...message,
      fullMessage: message.fullMessage ?? null,
      processResponse: message.processResponse ?? null,
      processed: message.processed ?? "pending",
      offerName: message.offerName ?? "",
      processedUSSD: message.processedUSSD ?? ""
    };
    
    // Debug: Log the message to see what fields are present
    console.log("getMpesaMessageById result:", JSON.stringify(messageWithAllFields, null, 2));
    
    return messageWithAllFields;
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

// Debug query to see phone numbers in messages for a specific user
export const debugPhoneNumbersForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    console.log(`Found ${messages.length} messages for userId ${args.userId}`);

    // Get unique phone numbers
    const phoneNumbers = [...new Set(messages.map(m => m.phoneNumber))];

    console.log("Unique phone numbers:", phoneNumbers);

    return {
      totalMessages: messages.length,
      uniquePhoneNumbers: phoneNumbers,
      sampleMessages: messages.slice(0, 3).map(m => ({
        _id: m._id,
        phoneNumber: m.phoneNumber,
        name: m.name,
        amount: m.amount,
        senderId: m.senderId,
        time: m.time
      }))
    };
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
    processed: v.optional(v.union(v.literal("pending"), v.literal("successful"), v.literal("failed"), v.literal("not-viable"), v.literal("disabled"))),
    fullMessage: v.optional(v.string()),
    processResponse: v.optional(v.string()),
    offerName: v.optional(v.string()),
    processedUSSD: v.optional(v.string()),
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
    const messages = await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("phoneNumber"), args.phoneNumber))
      .order("desc")
      .collect();

    // Ensure all messages include the new fields
    const messagesWithAllFields = messages.map(message => ({
      ...message,
      fullMessage: message.fullMessage ?? null,
      processResponse: message.processResponse ?? null,
      processed: message.processed ?? "pending",
      offerName: message.offerName ?? "",
      processedUSSD: message.processedUSSD ?? ""
    }));

    return messagesWithAllFields;
  },
});

// Query to get mpesa messages by sender ID
export const getMpesaMessagesBySenderId = query({
  args: { senderId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("senderId"), args.senderId))
      .order("desc")
      .collect();

    // Ensure all messages include the new fields
    const messagesWithAllFields = messages.map(message => ({
      ...message,
      fullMessage: message.fullMessage ?? null,
      processResponse: message.processResponse ?? null,
      processed: message.processed ?? "pending",
      offerName: message.offerName ?? "",
      processedUSSD: message.processedUSSD ?? ""
    }));

    return messagesWithAllFields;
  },
});

// Query to get mpesa messages by processed status
export const getMpesaMessagesByProcessedStatus = query({
  args: { 
    processed: v.union(v.literal("pending"), v.literal("successful"), v.literal("failed"), v.literal("not-viable"), v.literal("disabled")),
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
    
    // Ensure all messages include the new fields
    const messagesWithAllFields = messages.map(message => ({
      ...message,
      fullMessage: message.fullMessage ?? null,
      processResponse: message.processResponse ?? null,
      processed: message.processed ?? "pending",
      offerName: message.offerName ?? "",
      processedUSSD: message.processedUSSD ?? ""
    }));
    
    return messagesWithAllFields;
  },
});

// Mutation to update the processed status of a mpesa message
export const updateMpesaMessageProcessedStatus = mutation({
  args: {
    messageId: v.id("mpesaMessages"),
    processed: v.union(v.literal("pending"), v.literal("successful"), v.literal("failed"), v.literal("not-viable"), v.literal("disabled")),
    processResponse: v.optional(v.string()),
    offerName: v.optional(v.string()),
    processedUSSD: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { messageId, processed, processResponse, offerName, processedUSSD } = args;
    
    // Prepare update object
    const updateData: any = { processed };
    
    // Add processResponse to update if provided
    if (processResponse !== undefined) {
      updateData.processResponse = processResponse;
    }
    
    // Add offerName to update if provided
    if (offerName !== undefined) {
      updateData.offerName = offerName;
    }
    
    // Add processedUSSD to update if provided
    if (processedUSSD !== undefined) {
      updateData.processedUSSD = processedUSSD;
    }
    
    // Update the processed status and optionally other fields
    await ctx.db.patch(messageId, updateData);
    
    return {
      success: true,
      message: `Successfully updated message processed status to ${processed}${processResponse ? ' with process response' : ''}${offerName ? ' with offer name' : ''}${processedUSSD ? ' with processed USSD' : ''}`,
      messageId,
      processed,
      processResponse: processResponse || null,
      offerName: offerName || null,
      processedUSSD: processedUSSD || null
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
    fullMessage: v.optional(v.string()),
    processResponse: v.optional(v.string()),
    offerName: v.optional(v.string()),
    processedUSSD: v.optional(v.string()),
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
      fullMessage: args.fullMessage ?? undefined,
      processResponse: args.processResponse ?? undefined,
      offerName: args.offerName ?? "", // Default to empty string
      processedUSSD: args.processedUSSD ?? "", // Default to empty string
    });
    
    // Return the created message to verify processed field
    const createdMessage = await ctx.db.get(messageId);
    return createdMessage;
  },
});

// Migration mutation to add new fields to existing messages
export const migrateMpesaMessagesAddNewFields = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting migration: Adding fullMessage, processResponse, and offerName fields to existing mpesa messages");

    // Get all mpesa messages
    const allMessages = await ctx.db.query("mpesaMessages").collect();
    
    console.log(`Found ${allMessages.length} total messages to migrate`);
    
    let updatedCount = 0;
    
    // Update messages that don't have the new fields
    for (const message of allMessages) {
      const needsUpdate = 
        message.fullMessage === undefined || 
        message.processResponse === undefined ||
        message.offerName === undefined;
      
      if (needsUpdate) {
        await ctx.db.patch(message._id, {
          fullMessage: message.fullMessage || undefined,
          processResponse: message.processResponse || undefined,
          offerName: message.offerName || "", // Default to empty string
        });
        updatedCount++;
      }
    }
    
    console.log(`✅ Migration completed: Updated ${updatedCount} messages with new fields`);
    
    return {
      success: true,
      totalMessages: allMessages.length,
      updatedMessages: updatedCount,
      message: `Successfully migrated ${updatedCount} out of ${allMessages.length} messages`
    };
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

// Mutation to delete all mpesa messages for a specific phone number
export const deleteMpesaMessagesByPhoneNumber = mutation({
  args: {
    phoneNumber: v.string(),
    userId: v.optional(v.string()) // Optional: filter by userId as well
  },
  handler: async (ctx, args) => {
    console.log("🗑️ deleteMpesaMessagesByPhoneNumber called with:");
    console.log("  phoneNumber:", args.phoneNumber);
    console.log("  userId:", args.userId || "not specified");

    // Get all mpesa messages for the specific phone number
    let query = ctx.db
      .query("mpesaMessages")
      .filter((q) => q.eq(q.field("phoneNumber"), args.phoneNumber));

    // Additionally filter by userId if provided
    if (args.userId) {
      const messages = await query.collect();
      const filteredMessages = messages.filter(m => m.userId === args.userId);

      console.log(`Found ${filteredMessages.length} messages matching phoneNumber ${args.phoneNumber} and userId ${args.userId}`);

      // Log sample of messages before deletion
      if (filteredMessages.length > 0) {
        console.log("Sample message:", {
          userId: filteredMessages[0].userId,
          phoneNumber: filteredMessages[0].phoneNumber,
          name: filteredMessages[0].name,
          amount: filteredMessages[0].amount
        });
      }

      // Delete each message
      for (const message of filteredMessages) {
        await ctx.db.delete(message._id);
      }

      return {
        success: true,
        message: `Successfully deleted ${filteredMessages.length} mpesa messages for phone number ${args.phoneNumber} and userId ${args.userId}`,
        deletedCount: filteredMessages.length,
        phoneNumber: args.phoneNumber,
        userId: args.userId
      };
    } else {
      const phoneMessages = await query.collect();

      console.log(`Found ${phoneMessages.length} messages matching phoneNumber ${args.phoneNumber}`);

      // Log sample of messages before deletion
      if (phoneMessages.length > 0) {
        console.log("Sample message:", {
          userId: phoneMessages[0].userId,
          phoneNumber: phoneMessages[0].phoneNumber,
          name: phoneMessages[0].name,
          amount: phoneMessages[0].amount
        });
      }

      // Delete each message for this phone number
      for (const message of phoneMessages) {
        await ctx.db.delete(message._id);
      }

      return {
        success: true,
        message: `Successfully deleted ${phoneMessages.length} mpesa messages for phone number ${args.phoneNumber}`,
        deletedCount: phoneMessages.length,
        phoneNumber: args.phoneNumber
      };
    }
  },
});

// Mutation to delete mpesa messages older than 30 days
// This is intended to be run as a cron job to clean up old data
export const deleteOldMpesaMessages = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️ Starting deleteOldMpesaMessages cron job...");

    // Calculate the timestamp for 30 days ago
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const cutoffDate = new Date(thirtyDaysAgo).toISOString();

    console.log(`Cutoff date: ${cutoffDate} (timestamp: ${thirtyDaysAgo})`);

    // Get all mpesa messages older than 30 days
    const oldMessages = await ctx.db
      .query("mpesaMessages")
      .filter((q) => q.lt(q.field("time"), thirtyDaysAgo))
      .collect();

    console.log(`Found ${oldMessages.length} messages older than 30 days`);

    // Delete each old message
    let deletedCount = 0;
    for (const message of oldMessages) {
      await ctx.db.delete(message._id);
      deletedCount++;
    }

    console.log(`✅ Cron job completed: Deleted ${deletedCount} mpesa messages older than 30 days`);

    return {
      success: true,
      message: `Successfully deleted ${deletedCount} mpesa messages older than 30 days`,
      deletedCount,
      cutoffDate
    };
  },
});
