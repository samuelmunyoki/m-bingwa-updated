import { mutation, query, QueryCtx } from "../_generated/server";
import { v } from "convex/values";

// Shared decision used by both the login-time check (checkAccessHttp) and the
// 2-second heartbeat poll (validateDeviceSession) — single source of truth so
// the two checkpoints can never disagree on who's allowed in.
export async function isAccessAllowed(
  ctx: QueryCtx,
  { email, phoneNumber, userId }: { email?: string; phoneNumber?: string; userId?: string }
): Promise<boolean> {
  const config = await ctx.db.query("appConfig").first();
  if (!config?.maintenanceMode) return true;

  const user = userId
    ? await ctx.db.query("users").withIndex("by_user_id", (q) => q.eq("userId", userId)).first()
    : email
    ? await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first()
    : null;

  if (user?.isAdmin) return true;
  if (email && config.allowedEmails?.includes(email.toLowerCase())) return true;
  if (phoneNumber && config.allowedPhones?.includes(phoneNumber)) return true;

  return false;
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("appConfig").collect();
    if (configs.length === 0) {
      return {
        minimumVersion: "1.0.0",
        maintenanceMode: false,
        allowedPhones: [] as string[],
        allowedEmails: [] as string[],
      };
    }
    return configs[0];
  },
});

export const checkAccess = query({
  args: {
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return { allowed: await isAccessAllowed(ctx, args) };
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

export const setMaintenanceMode = mutation({
  args: {
    requestingUserId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
      .first();
    if (!requestingUser?.isAdmin) throw new Error("Unauthorized");

    const existing = await ctx.db.query("appConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { maintenanceMode: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("appConfig", {
        minimumVersion: "1.0.0",
        maintenanceMode: args.enabled,
        allowedPhones: [],
        allowedEmails: [],
        updatedAt: Date.now(),
      });
    }
  },
});

export const addAllowedUser = mutation({
  args: {
    requestingUserId: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
      .first();
    if (!requestingUser?.isAdmin) throw new Error("Unauthorized");

    const existing = await ctx.db.query("appConfig").first();
    const phones = new Set(existing?.allowedPhones ?? []);
    const emails = new Set(existing?.allowedEmails ?? []);
    if (args.phone) phones.add(args.phone.trim());
    if (args.email) emails.add(args.email.trim().toLowerCase());

    if (existing) {
      await ctx.db.patch(existing._id, {
        allowedPhones: Array.from(phones),
        allowedEmails: Array.from(emails),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("appConfig", {
        minimumVersion: "1.0.0",
        maintenanceMode: false,
        allowedPhones: Array.from(phones),
        allowedEmails: Array.from(emails),
        updatedAt: Date.now(),
      });
    }
  },
});

export const removeAllowedUser = mutation({
  args: {
    requestingUserId: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
      .first();
    if (!requestingUser?.isAdmin) throw new Error("Unauthorized");

    const existing = await ctx.db.query("appConfig").first();
    if (!existing) return;

    await ctx.db.patch(existing._id, {
      allowedPhones: (existing.allowedPhones ?? []).filter((p) => p !== args.phone),
      allowedEmails: (existing.allowedEmails ?? []).filter((e) => e !== args.email),
      updatedAt: Date.now(),
    });
  },
});
