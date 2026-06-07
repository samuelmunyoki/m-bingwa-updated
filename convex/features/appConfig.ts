import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("appConfig").collect();
    if (configs.length === 0) return { minimumVersion: "1.0.0" };
    return configs[0];
  },
});

export const upsert = mutation({
  args: {
    minimumVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("appConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { minimumVersion: args.minimumVersion, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("appConfig", {
        minimumVersion: args.minimumVersion,
        updatedAt: Date.now(),
      });
    }
  },
});
