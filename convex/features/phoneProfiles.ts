import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Gets an existing profile by phone number, or creates a new one.
 * Called by Android on every login.
 * For existing users: profileId = their Clerk userId (zero data migration).
 * For new users: profileId = a newly generated unique ID.
 */
export const getOrCreateProfile = mutation({
  args: {
    ownerId: v.string(),    // Clerk Gmail userId
    phoneNumber: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists for this phone number
    const existing = await ctx.db
      .query("phoneProfiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      // Profile exists — update ownerId if not yet linked (e.g. Android created before website login)
      if (!existing.ownerId && args.ownerId) {
        await ctx.db.patch(existing._id, { ownerId: args.ownerId });
      }
      return { profileId: existing.profileId, isNew: false };
    }

    // No profile exists — create one
    // For existing users who already have data under their Clerk userId,
    // we use ownerId as profileId so their data is preserved.
    const profileId = args.ownerId;

    await ctx.db.insert("phoneProfiles", {
      ownerId: args.ownerId,
      profileId,
      phoneNumber: args.phoneNumber,
      displayName: args.displayName ?? "Main",
      createdAt: Date.now(),
    });

    return { profileId, isNew: true };
  },
});

/**
 * Gets all phone profiles for a Gmail account.
 * Used by website to populate the phone switcher dropdown.
 */
export const getProfilesByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phoneProfiles")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .order("asc")
      .collect();
  },
});

/**
 * Gets a profile by phone number.
 * Used by website to verify a phone number before adding.
 */
export const getProfileByPhone = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phoneProfiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
  },
});

/**
 * Creates a new phone profile from the website settings page.
 * Generates a unique profileId for the new phone number.
 */
export const createProfile = mutation({
  args: {
    ownerId: v.string(),
    phoneNumber: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check phone not already registered
    const existing = await ctx.db
      .query("phoneProfiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      return { status: "error", message: "This phone number is already registered" };
    }

    // Generate unique profileId for new profiles
    const profileId = `profile_${args.phoneNumber}_${Date.now()}`;

    await ctx.db.insert("phoneProfiles", {
      ownerId: args.ownerId,
      profileId,
      phoneNumber: args.phoneNumber,
      displayName: args.displayName ?? args.phoneNumber,
      createdAt: Date.now(),
    });

    return { status: "success", profileId };
  },
});

/**
 * Deletes a phone profile. Only the owner can delete.
 */
export const deleteProfile = mutation({
  args: {
    profileId: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("phoneProfiles")
      .withIndex("by_profileId", (q) => q.eq("profileId", args.profileId))
      .first();

    if (!profile) {
      return { status: "error", message: "Profile not found" };
    }
    if (profile.ownerId !== args.ownerId) {
      return { status: "error", message: "Unauthorized" };
    }

    await ctx.db.delete(profile._id);
    return { status: "success" };
  },
});

/**
 * Updates the display name of a profile.
 */
export const updateDisplayName = mutation({
  args: {
    profileId: v.string(),
    ownerId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("phoneProfiles")
      .withIndex("by_profileId", (q) => q.eq("profileId", args.profileId))
      .first();

    if (!profile || profile.ownerId !== args.ownerId) {
      return { status: "error", message: "Profile not found or unauthorized" };
    }

    await ctx.db.patch(profile._id, { displayName: args.displayName });
    return { status: "success" };
  },
});
