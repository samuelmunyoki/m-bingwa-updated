import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Mutation to create or update a user-sender relation
export const createOrUpdateUserSenderRelation = mutation({
  args: {
    userId: v.string(),
    senderId: v.string(),
    lastUpdateTimeStamp: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, senderId, lastUpdateTimeStamp } = args;

    // Check if relation already exists
    const existingRelation = await ctx.db
      .query("userSenderRelations")
      .withIndex("by_user_sender", (q) => 
        q.eq("userId", userId).eq("senderId", senderId)
      )
      .first();

    if (existingRelation) {
      // Update existing relation
      await ctx.db.patch(existingRelation._id, {
        lastUpdateTimeStamp,
      });
      return existingRelation._id;
    } else {
      // Create new relation
      const newRelationId = await ctx.db.insert("userSenderRelations", {
        userId,
        senderId,
        lastUpdateTimeStamp,
      });
      return newRelationId;
    }
  },
});



// Query to get all user-sender relations by userId ordered by lastUpdateTimeStamp (earliest to latest)
export const getUserSenderRelationsByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    // Get all relations for this userId
    let relations = await ctx.db
      .query("userSenderRelations")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    // Sort by lastUpdateTimeStamp from earliest to latest
    relations = relations.sort((a, b) => a.lastUpdateTimeStamp - b.lastUpdateTimeStamp);

    return relations;
  },
});

//NOTE: NOT to be used in production
// Query to get all user-sender relations by senderId
export const getUserSenderRelationsBySenderId = query({
  args: { senderId: v.string() },
  handler: async (ctx, args) => {
    const { senderId } = args;
    const relations = await ctx.db
      .query("userSenderRelations")
      .withIndex("by_sender_id", (q) => q.eq("senderId", senderId))
      .order("desc")
      .collect();

    return relations;
  },
});

// Query to get a specific user-sender relation
export const getUserSenderRelation = query({
  args: { 
    userId: v.string(),
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, senderId } = args;
    const relation = await ctx.db
      .query("userSenderRelations")
      .withIndex("by_user_sender", (q) => 
        q.eq("userId", userId).eq("senderId", senderId)
      )
      .first();

    return relation;
  },
});

//NOTE: NOT to be used in production
// Query to get all user-sender relations
export const getAllUserSenderRelations = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("userSenderRelations")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
  },
});

// Mutation to update lastUpdateTimeStamp for a specific user-sender relation
export const updateLastUpdateTimeStamp = mutation({
  args: {
    userId: v.string(),
    senderId: v.string(),
    lastUpdateTimeStamp: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, senderId, lastUpdateTimeStamp } = args;
    
    const relation = await ctx.db
      .query("userSenderRelations")
      .withIndex("by_user_sender", (q) => 
        q.eq("userId", userId).eq("senderId", senderId)
      )
      .first();

    if (!relation) {
      throw new Error("User-sender relation not found");
    }

    await ctx.db.patch(relation._id, {
      lastUpdateTimeStamp,
    });

    return relation._id;
  },
});


//NOTE: NOT to be used in production
// Query to get recent relations (last 24 hours)
export const getRecentUserSenderRelations = query({
  args: { hoursBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const hoursBack = args.hoursBack || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    
    const relations = await ctx.db
      .query("userSenderRelations")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("lastUpdateTimeStamp"), cutoffTime))
      .order("desc")
      .collect();

    return relations;
  },
});

// Mutation to delete a user-sender relation
export const deleteUserSenderRelation = mutation({
  args: {
    userId: v.string(),
    senderId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, senderId } = args;
    
    const relation = await ctx.db
      .query("userSenderRelations")
      .withIndex("by_user_sender", (q) => 
        q.eq("userId", userId).eq("senderId", senderId)
      )
      .first();

    if (!relation) {
      throw new Error("User-sender relation not found");
    }

    await ctx.db.delete(relation._id);
    return { success: true, message: "Relation deleted successfully" };
  },
});
