import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// ── Web dashboard mutations (unchanged) ──────────────────────────────────────

export const addPhoneNumber = mutation({
  args: { phoneNumber: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { phoneNumber, userId } = args;
    await ctx.db.insert("blacklist", {
      phoneNumber,
      userId,
      createdAt: Date.now(),
    });
  },
});

export const removePhoneNumber = mutation({
  args: { id: v.id("blacklist") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
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
    const entries = await ctx.db
      .query("blacklist")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return entries.map((e) => e.phoneNumber);
  },
});

// ── Android HTTP API mutations ────────────────────────────────────────────────

export const addPhoneNumberFromAPI = mutation({
  args: { phoneNumber: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { phoneNumber, userId } = args;
    const id = await ctx.db.insert("blacklist", {
      phoneNumber,
      userId,
      createdAt: Date.now(),
    });
    return { id: id.toString() };
  },
});

export const removePhoneNumberById = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("blacklist")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const entry = entries.find((e) => e._id.toString() === args.id);
    if (!entry) throw new Error("Blacklist entry not found");
    await ctx.db.delete(entry._id);
    return { success: true };
  },
});
