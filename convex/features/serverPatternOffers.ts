import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const stepValidator = v.object({
  stepIndex: v.number(),
  inputKey: v.string(),
  inputValue: v.string(),
  pattern: v.optional(v.string()),
  type: v.string(),
  inputMode: v.string(),
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("serverPatternOffers").order("desc").collect();
  },
});

export const getAllActive = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("serverPatternOffers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    ussdBaseCode: v.string(),
    offerType: v.string(),
    createdBy: v.string(),
    steps: v.array(stepValidator),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("serverPatternOffers", {
      name: args.name,
      price: args.price,
      ussdBaseCode: args.ussdBaseCode,
      offerType: args.offerType,
      isActive: true,
      createdAt: Date.now(),
      createdBy: args.createdBy,
      steps: args.steps,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("serverPatternOffers"),
    name: v.string(),
    price: v.number(),
    ussdBaseCode: v.string(),
    offerType: v.string(),
    isActive: v.boolean(),
    steps: v.array(stepValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("serverPatternOffers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("serverPatternOffers"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});
