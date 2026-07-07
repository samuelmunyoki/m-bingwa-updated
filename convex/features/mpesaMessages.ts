import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";

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
    mpesaDate: v.optional(v.number()),
    scheduledRetryAt: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    // On a dedup hit, if the stored row is still "pending" but this POST carries a final
    // status, patch it up before returning. Closes the arrival race where the drain POSTs
    // the final status (e.g. not-viable) before the on-arrival "pending" POST's convexId is
    // written locally — otherwise the dedup would silently drop the final status, leaving the
    // cloud row stuck at "pending" while the phone shows the final status. Never downgrades a
    // final status back to "pending".
    const isFinalStatus = (p?: string) =>
      p === "successful" || p === "failed" || p === "not-viable";
    const resolveDup = async (row: any) => {
      // Only refine a not-yet-final row (never downgrade a final status back to pending).
      // Upgrade to a final status when the POST carries one, AND fill in scheduledRetryAt /
      // offerName / processResponse from the incoming POST — that's what the POST path used to
      // drop (e.g. an auto-rescheduled "pending" row losing its scheduledRetryAt). Uses `?? row.x`
      // so a bare on-arrival "pending" POST never wipes values already stored.
      if (row.processed === "pending" || row.processed === undefined) {
        const nextProcessed = isFinalStatus(args.processed) ? args.processed : (row.processed ?? "pending");
        await ctx.db.patch(row._id, {
          processed: nextProcessed,
          processResponse: args.processResponse ?? row.processResponse,
          offerName: args.offerName ?? row.offerName,
          processedUSSD: args.processedUSSD ?? row.processedUSSD,
          scheduledRetryAt: args.scheduledRetryAt ?? row.scheduledRetryAt,
        });
        console.log(`[DEDUP-MERGE] _id=${row._id} processed=${nextProcessed} scheduledRetryAt=${args.scheduledRetryAt ?? row.scheduledRetryAt}`);
        return await ctx.db.get(row._id);
      }
      return row;
    };

    // Dedup: if a record with the same userId + transactionId already exists, return it
    if (args.transactionId) {
      const existing = await ctx.db
        .query("mpesaMessages")
        .withIndex("by_user_transaction", (q) =>
          q.eq("userId", args.userId).eq("transactionId", args.transactionId as string)
        )
        .first();
      if (existing) {
        console.log(`[DEDUP] Returning existing mpesaMessage for transactionId=${args.transactionId} _id=${existing._id}`);
        return await resolveDup(existing);
      }
    } else {
      // No transactionId to dedup on. Fall back to the message's natural identity
      // (userId + time + phoneNumber + amount) so a retried POST for a message that couldn't
      // parse a transaction code doesn't create a duplicate cloud record.
      const sameTime = await ctx.db
        .query("mpesaMessages")
        .withIndex("by_user_id_time", (q) =>
          q.eq("userId", args.userId).eq("time", args.time)
        )
        .collect();
      const dup = sameTime.find(
        (m) => m.phoneNumber === args.phoneNumber && m.amount === args.amount
      );
      if (dup) {
        console.log(`[DEDUP-NATURAL] Returning existing mpesaMessage (no txId) for userId+time+phone+amount _id=${dup._id}`);
        return await resolveDup(dup);
      }
    }

    const messageId = await ctx.db.insert("mpesaMessages", {
      userId: args.userId,
      name: args.name,
      amount: args.amount,
      phoneNumber: args.phoneNumber,
      senderId: args.senderId,
      time: args.time,
      transactionId: args.transactionId ?? undefined,
      processed: args.processed ?? "pending",
      fullMessage: args.fullMessage ?? undefined,
      processResponse: args.processResponse ?? undefined,
      offerName: args.offerName ?? "",
      processedUSSD: args.processedUSSD ?? "",
      mpesaDate: args.mpesaDate ?? undefined,
      scheduledRetryAt: args.scheduledRetryAt ?? undefined,
    });

    const message = await ctx.db.get(messageId);
    return message;
  },
});

// Query to get all mpesa messages by userId ordered by time (latest to earliest)
export const getMpesaMessagesByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    // Use compound index to filter by userId and order by time descending efficiently
    const mpesaMessages = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id_time", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Ensure all messages include the new fields (even if undefined/null)
    const messagesWithAllFields = mpesaMessages.map(message => ({
      ...message,
      fullMessage: message.fullMessage ?? null,
      processResponse: message.processResponse ?? null,
      processed: message.processed ?? "pending",
      offerName: message.offerName ?? "",
      processedUSSD: message.processedUSSD ?? "",
      verified: message.verified ?? false,
      mpesaDate: message.mpesaDate ?? null
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
      processedUSSD: message.processedUSSD ?? "",
      mpesaDate: message.mpesaDate ?? null
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
      processedUSSD: message.processedUSSD ?? "",
      mpesaDate: message.mpesaDate ?? null
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
    verified: v.optional(v.boolean()),
    mpesaDate: v.optional(v.union(v.string(), v.number())),
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
      processedUSSD: message.processedUSSD ?? "",
      mpesaDate: message.mpesaDate ?? null
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
      processedUSSD: message.processedUSSD ?? "",
      mpesaDate: message.mpesaDate ?? null
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
      processedUSSD: message.processedUSSD ?? "",
      mpesaDate: message.mpesaDate ?? null
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
    scheduledRetryAt: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const { messageId, processed, processResponse, offerName, processedUSSD, scheduledRetryAt } = args;

    // Prepare update object
    const updateData: any = { processed };

    if (processResponse !== undefined) {
      updateData.processResponse = processResponse;
    }
    if (offerName !== undefined) {
      updateData.offerName = offerName;
    }
    if (processedUSSD !== undefined) {
      updateData.processedUSSD = processedUSSD;
    }
    if (scheduledRetryAt !== undefined) {
      updateData.scheduledRetryAt = scheduledRetryAt;
    }
    
    // Read current message to compute daily stats delta
    const currentMsg = await ctx.db.get(messageId);

    // Update the processed status and optionally other fields
    await ctx.db.patch(messageId, updateData);

    // Update daily stats if status is changing to/from a finalized state
    if (currentMsg) {
      const oldStatus = currentMsg.processed;
      const newStatus = processed;
      const finalStatuses = ["successful", "failed"];
      const oldIsFinal = finalStatuses.includes(oldStatus ?? "");
      const newIsFinal = finalStatuses.includes(newStatus);

      if (oldIsFinal || newIsFinal) {
        const dayStart = (() => {
          const d = new Date(currentMsg.time);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })();

        let successfulDelta = 0;
        let failedDelta = 0;
        let totalDelta = 0;
        let offerName: string | undefined;
        let offerDelta: number | undefined;

        // Remove old contribution
        if (oldIsFinal) {
          totalDelta--;
          if (oldStatus === "successful") {
            successfulDelta--;
            const oldOffer = ((currentMsg.offerName ?? "Unknown").trim() || "Unknown");
            offerName = oldOffer;
            offerDelta = -1;
          } else if (oldStatus === "failed") {
            failedDelta--;
          }
        }

        // Add new contribution
        if (newIsFinal) {
          totalDelta++;
          if (newStatus === "successful") {
            successfulDelta++;
            const newOffer = ((args.offerName ?? currentMsg.offerName ?? "Unknown").trim() || "Unknown");
            offerName = newOffer;
            offerDelta = (offerDelta ?? 0) + 1;
          } else if (newStatus === "failed") {
            failedDelta++;
          }
        }

        await ctx.scheduler.runAfter(0, internal.features.messageDailyStats.applyDailyStatsDelta, {
          userId: currentMsg.userId,
          dayStart,
          successfulDelta,
          failedDelta,
          totalDelta,
          offerName,
          offerDelta,
        });
      }
    }

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
    mpesaDate: v.optional(v.number()),
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
      mpesaDate: args.mpesaDate ?? undefined,
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

// Mutation to delete mpesa messages that are not pending (processed !== "pending")
// This is intended to be run as a cron job to clean up processed messages
// Processes in batches to avoid timeouts and includes error handling
export const deleteNonPendingMpesaMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const BATCH_SIZE = 100; // Process 100 messages at a time to avoid timeouts
    const startTime = Date.now();

    try {
      console.log("🗑️ Starting deleteNonPendingMpesaMessages cron job...");

      // Use the by_processed index to fetch each non-pending status — avoids full table scan
      const statuses = ["successful", "failed", "not-viable", "disabled"] as const;
      const nonPendingMessages = (await Promise.all(
        statuses.map((status) =>
          ctx.db
            .query("mpesaMessages")
            .withIndex("by_processed", (q) => q.eq("processed", status))
            .take(200)
        )
      )).flat();

      console.log(`Found ${nonPendingMessages.length} non-pending messages to delete`);

      if (nonPendingMessages.length === 0) {
        console.log("✅ No non-pending messages to delete");
        return {
          success: true,
          message: "No non-pending messages found",
          deletedCount: 0,
          failedCount: 0,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Delete messages in batches
      let deletedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < nonPendingMessages.length; i += BATCH_SIZE) {
        const batch = nonPendingMessages.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(nonPendingMessages.length / BATCH_SIZE)} (${batch.length} messages)`);

        for (const message of batch) {
          try {
            await ctx.db.delete(message._id);
            deletedCount++;
          } catch (error) {
            failedCount++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to delete message ${message._id}: ${errorMessage}`);
            console.error(`❌ Error deleting message ${message._id}:`, errorMessage);
          }
        }
      }

      const executionTimeMs = Date.now() - startTime;

      if (failedCount > 0) {
        console.warn(`⚠️ Cron job completed with errors: Deleted ${deletedCount} messages, failed to delete ${failedCount} messages`);
        console.warn(`First 5 errors:`, errors.slice(0, 5));
      } else {
        console.log(`✅ Cron job completed successfully: Deleted ${deletedCount} non-pending mpesa messages in ${executionTimeMs}ms`);
      }

      return {
        success: failedCount === 0,
        message: failedCount === 0
          ? `Successfully deleted ${deletedCount} non-pending mpesa messages`
          : `Deleted ${deletedCount} messages but ${failedCount} deletions failed`,
        deletedCount,
        failedCount,
        totalFound: nonPendingMessages.length,
        executionTimeMs,
        errors: errors.slice(0, 10) // Return first 10 errors
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 Fatal error in deleteNonPendingMpesaMessages cron job:`, errorMessage);

      return {
        success: false,
        message: `Fatal error: ${errorMessage}`,
        deletedCount: 0,
        failedCount: 0,
        executionTimeMs,
        error: errorMessage
      };
    }
  },
});

// Mutation to delete mpesa messages older than 30 days
// This is intended to be run as a cron job to clean up old data
// Processes in batches to avoid timeouts and includes error handling
export const deleteOldMpesaMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const BATCH_SIZE = 100; // Process 100 messages at a time to avoid timeouts
    const startTime = Date.now();

    try {
      console.log("🗑️ Starting deleteOldMpesaMessages cron job...");

      // Calculate the timestamp for 30 days ago
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const cutoffDate = new Date(thirtyDaysAgo).toISOString();

      console.log(`Cutoff date: ${cutoffDate} (timestamp: ${thirtyDaysAgo})`);

      // Use the by_time index to efficiently get old messages — avoids full table scan
      const oldMessages = await ctx.db
        .query("mpesaMessages")
        .withIndex("by_time", (q) => q.lt("time", thirtyDaysAgo))
        .take(500);

      console.log(`Found ${oldMessages.length} messages older than 30 days`);

      if (oldMessages.length === 0) {
        console.log("✅ No messages to delete");
        return {
          success: true,
          message: "No messages older than 30 days found",
          deletedCount: 0,
          failedCount: 0,
          cutoffDate,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Delete messages in batches
      let deletedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < oldMessages.length; i += BATCH_SIZE) {
        const batch = oldMessages.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(oldMessages.length / BATCH_SIZE)} (${batch.length} messages)`);

        for (const message of batch) {
          try {
            await ctx.db.delete(message._id);
            deletedCount++;
          } catch (error) {
            failedCount++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Failed to delete message ${message._id}: ${errorMessage}`);
            console.error(`❌ Error deleting message ${message._id}:`, errorMessage);
          }
        }
      }

      const executionTimeMs = Date.now() - startTime;

      if (failedCount > 0) {
        console.warn(`⚠️ Cron job completed with errors: Deleted ${deletedCount} messages, failed to delete ${failedCount} messages`);
        console.warn(`First 5 errors:`, errors.slice(0, 5));
      } else {
        console.log(`✅ Cron job completed successfully: Deleted ${deletedCount} mpesa messages older than 30 days in ${executionTimeMs}ms`);
      }

      return {
        success: failedCount === 0,
        message: failedCount === 0
          ? `Successfully deleted ${deletedCount} mpesa messages older than 30 days`
          : `Deleted ${deletedCount} messages but ${failedCount} deletions failed`,
        deletedCount,
        failedCount,
        totalFound: oldMessages.length,
        cutoffDate,
        executionTimeMs,
        errors: errors.slice(0, 10) // Return first 10 errors
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 Fatal error in deleteOldMpesaMessages cron job:`, errorMessage);

      return {
        success: false,
        message: `Fatal error: ${errorMessage}`,
        deletedCount: 0,
        failedCount: 0,
        executionTimeMs,
        error: errorMessage
      };
    }
  },
});


// Mutation to reset a single message for web-initiated retry
export const resetMessageForWebRetry = mutation({
  args: { messageId: v.id("mpesaMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      processed: "pending",
      webRetryRequested: true,
      processResponse: undefined,
    });
  },
});

// Mutation to reset multiple messages for web-initiated bulk retry
export const bulkResetMessagesForWebRetry = mutation({
  args: { messageIds: v.array(v.id("mpesaMessages")) },
  handler: async (ctx, args) => {
    await Promise.all(
      args.messageIds.map((id) =>
        ctx.db.patch(id, {
          processed: "pending",
          webRetryRequested: true,
          processResponse: undefined,
        })
      )
    );
    return { count: args.messageIds.length };
  },
});

// Manual cleanup: delete "pending" mpesa messages older than a cutoff for one user.
// Destructive — guarded by dryRun (default true), scoped to userId, only touches
// processed=="pending", and skips still-active scheduled retries (future scheduledRetryAt).
// Batch-per-call: run repeatedly with dryRun:false until deleted=0 / moreLikely=false.
export const deleteOldPendingMessages = mutation({
  args: {
    userId: v.string(),
    before: v.number(),               // epoch ms — delete pending rows with time < before
    dryRun: v.optional(v.boolean()),  // default true = preview only, no delete
    limit: v.optional(v.number()),    // batch size (default 200, max 500)
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500);
    const now = Date.now();

    // Uses by_user_processed_time so it reads ONLY this user's pending rows (oldest first),
    // never scanning successful/failed — avoids the timeout from filtering a huge range.
    const candidates = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_processed_time", (q) =>
        q.eq("userId", args.userId).eq("processed", "pending").lt("time", args.before)
      )
      .take(limit);

    // Never delete a still-active scheduled retry (pending + future scheduledRetryAt)
    const targets = candidates.filter(
      (m) => !m.scheduledRetryAt || m.scheduledRetryAt <= now
    );

    const sample = targets.slice(0, 10).map((m) => ({
      _id: m._id,
      time: m.time,
      timeReadable: new Date(m.time).toISOString(),
      phoneNumber: m.phoneNumber,
      amount: m.amount,
      transactionId: m.transactionId ?? null,
      offerName: m.offerName ?? null,
    }));

    let deleted = 0;
    if (!dryRun) {
      for (const m of targets) {
        await ctx.db.delete(m._id);
        deleted++;
      }
    }

    return {
      dryRun,
      before: args.before,
      beforeReadable: new Date(args.before).toISOString(),
      matched: targets.length,                 // deletable pending rows in this batch
      deleted,
      skippedScheduled: candidates.length - targets.length,
      moreLikely: candidates.length === limit, // hit batch cap → run again
      sample,
    };
  },
});

// Query for Android to poll — returns messages pending web retry for a user
export const getPendingWebRetries = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_webRetry", (q) =>
        q.eq("userId", args.userId).eq("webRetryRequested", true)
      )
      .collect();
  },
});

// Mutation called by Android after picking up a web retry — clears the flag
export const clearWebRetryFlag = mutation({
  args: { messageId: v.id("mpesaMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { webRetryRequested: false });
  },
});

// Mutation to create a store mpesa message after payment confirmation
export const createStoreMpesaMessage = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    amount: v.number(),
    phoneNumber: v.string(),
    transactionId: v.string(),
    time: v.number(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("mpesaMessages", {
      userId: args.userId,
      name: args.name,
      amount: args.amount,
      phoneNumber: args.phoneNumber,
      senderId: "STORE",
      time: args.time,
      transactionId: args.transactionId,
      processed: "pending",
      source: "store",
      androidProcessed: false,
    });
    return await ctx.db.get(messageId);
  },
});

// Query to get pending store messages not yet processed by Android
export const getPendingStoreMpesaMessages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_source_androidProcessed", (q) =>
        q.eq("source", "store").eq("androidProcessed", false)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    return messages;
  },
});

// Mutation to mark a store message as processed by Android
export const markStoreMessageAndroidProcessed = mutation({
  args: { messageId: v.id("mpesaMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { androidProcessed: true });
  },
});

export const getCountsByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    return {
      total: all.length,
      successful: all.filter(m => m.processed === "successful").length,
      failed: all.filter(m => m.processed === "failed").length,
      pending: all.filter(m => m.processed === "pending").length,
    };
  },
});

// ── Paginated M-Pesa messages with server-side filters ─────────────────────
export const getMpesaMessagesPaginated = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, statusFilter, startTime, endTime } = args;

    let q = ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id_time", (q) => {
        const byUser = q.eq("userId", userId);
        if (startTime !== undefined && endTime !== undefined) {
          return byUser.gte("time", startTime).lte("time", endTime);
        }
        if (startTime !== undefined) return byUser.gte("time", startTime);
        return byUser;
      });

    if (statusFilter && statusFilter !== "all" && statusFilter !== "pending") {
      const stored =
        statusFilter === "unavailable" ? "not-viable" : statusFilter;
      q = q.filter((fq) => fq.eq(fq.field("processed"), stored)) as typeof q;
    }

    const result = await q.order("desc").paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((m) => ({
        ...m,
        processed: m.processed ?? "pending",
        fullMessage: m.fullMessage ?? null,
        processResponse: m.processResponse ?? null,
        offerName: m.offerName ?? "",
        processedUSSD: m.processedUSSD ?? "",
        verified: m.verified ?? false,
        mpesaDate: m.mpesaDate ?? null,
      })),
    };
  },
});

// ── Return all IDs matching filter — used for Select All ───────────────────
export const getMpesaIdsForFilter = query({
  args: {
    userId: v.string(),
    statusFilter: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, statusFilter, startTime, endTime } = args;

    let q = ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id_time", (q) => {
        const byUser = q.eq("userId", userId);
        if (startTime !== undefined && endTime !== undefined) {
          return byUser.gte("time", startTime).lte("time", endTime);
        }
        if (startTime !== undefined) return byUser.gte("time", startTime);
        return byUser;
      });

    if (statusFilter && statusFilter !== "all" && statusFilter !== "pending") {
      const stored =
        statusFilter === "unavailable" ? "not-viable" : statusFilter;
      q = q.filter((fq) => fq.eq(fq.field("processed"), stored)) as typeof q;
    }

    const all = await q.collect();
    return all.map((m) => `sms_${m._id}`);
  },
});

// ── Today counts for M-Pesa ────────────────────────────────────────────────
export const getAutoScheduledMessages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messages = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("processed"), "pending"),
          q.gt(q.field("scheduledRetryAt"), now)
        )
      )
      .collect();
    return messages
      .sort((a, b) => (a.scheduledRetryAt ?? 0) - (b.scheduledRetryAt ?? 0))
      .map((m) => ({
        _id: m._id,
        name: m.name,
        amount: m.amount,
        phoneNumber: m.phoneNumber,
        transactionId: m.transactionId,
        offerName: m.offerName ?? "",
        processResponse: m.processResponse ?? "",
        scheduledRetryAt: m.scheduledRetryAt,
        time: m.time,
      }));
  },
});

export const getTodayPendingMessages = query({
  args: { userId: v.string(), startTime: v.number(), endTime: v.number() },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id_time", (q) =>
        q.eq("userId", args.userId).gte("time", args.startTime).lte("time", args.endTime)
      )
      .collect();
    const now = Date.now();
    return msgs
      .filter((m) =>
        (!m.processed || m.processed === "pending") &&
        (!m.scheduledRetryAt || m.scheduledRetryAt <= now)
      )
      .map((m) => ({
        _id: m._id,
        name: m.name,
        amount: m.amount,
        phoneNumber: m.phoneNumber,
        transactionId: m.transactionId,
        offerName: m.offerName ?? "",
        processed: m.processed,
        scheduledRetryAt: m.scheduledRetryAt ?? null,
        time: m.time,
      }));
  },
});

export const getMpesaMessageByTransactionId = query({
  args: { userId: v.string(), transactionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_transaction", (q) =>
        q.eq("userId", args.userId).eq("transactionId", args.transactionId)
      )
      .first();
  },
});

export const getTodayCounts = query({
  args: { userId: v.string(), startTime: v.number(), endTime: v.number() },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id_time", (q) =>
        q.eq("userId", args.userId).gte("time", args.startTime).lte("time", args.endTime)
      )
      .collect();
    const now = Date.now();
    // NOTE: web mpesaMessages has no isDeleted field (deletes are hard deletes) and no 'processing'
    // status in its schema (the app never syncs that transient state), so there's nothing here to
    // mirror the phone's isDeleted/processing handling — the web can only ever hold final/pending rows.
    return {
      successful: msgs.filter((m) => m.processed === "successful").length,
      failed: msgs.filter((m) => m.processed === "failed").length,
      pending: msgs.filter((m) =>
        (!m.processed || m.processed === "pending") &&
        (!m.scheduledRetryAt || m.scheduledRetryAt <= now)
      ).length,
    };
  },
});

// Fix 2 (one-time reconciliation): returns the records the cloud currently thinks are actively
// pending (not future-scheduled retries), since a given time. Android compares each to its local
// copy and, where it has since finalized the status, re-flags it for sync to correct the cloud.
export const getPendingForReconcile = query({
  args: { userId: v.string(), sinceTime: v.number() },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("mpesaMessages")
      .withIndex("by_user_id_time", (q) =>
        q.eq("userId", args.userId).gte("time", args.sinceTime)
      )
      .collect();
    const now = Date.now();
    return msgs
      .filter(
        (m) =>
          (!m.processed || m.processed === "pending") &&
          (!m.scheduledRetryAt || m.scheduledRetryAt <= now)
      )
      .map((m) => ({ id: m._id, processed: m.processed ?? "pending", time: m.time }));
  },
});
