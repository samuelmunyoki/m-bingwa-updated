import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const addPhoneNumber = mutation({
  args: { phoneNumber: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { phoneNumber, userId } = args;
    await ctx.db.insert("blacklist", { phoneNumber, userId });
  },
});

export const removePhoneNumber = mutation({
  args: { id: v.id("blacklist") },
  handler: async (ctx, args) => {
    const { id } = args;
    await ctx.db.delete(id);
  },
});

export const getPhoneNumbers = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("blacklist")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});


export const getBlacklistedNumbersByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const blacklistEntries = await ctx.db
      .query("blacklist")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return blacklistEntries.map((entry) => entry.phoneNumber);
  },
});
