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
 * Includes profiles where the user is primary owner OR additional owner.
 */
export const getProfilesByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    // Primary owner profiles
    const primary = await ctx.db
      .query("phoneProfiles")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    // Additional owner profiles — collect all and filter
    const all = await ctx.db.query("phoneProfiles").collect();
    const additional = all.filter(
      (p) =>
        p.ownerId !== args.ownerId &&
        p.additionalOwnerIds?.includes(args.ownerId)
    );

    // Merge and deduplicate by profileId
    const seen = new Set(primary.map((p) => p.profileId));
    const merged = [...primary];
    for (const p of additional) {
      if (!seen.has(p.profileId)) {
        merged.push(p);
        seen.add(p.profileId);
      }
    }
    return merged;
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
 * Creates or links a phone profile after OTP verification.
 * - Phone doesn't exist: creates new profile
 * - Phone exists, same owner: error "already in your list"
 * - Phone exists, different owner: adds current user as additional owner
 */
export const createProfile = mutation({
  args: {
    ownerId: v.string(),
    phoneNumber: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("phoneProfiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      // Already in this user's account
      if (existing.ownerId === args.ownerId) {
        return { status: "error", message: "This phone number is already in your account" };
      }
      if (existing.additionalOwnerIds?.includes(args.ownerId)) {
        return { status: "error", message: "This phone number is already in your account" };
      }
      // Add as additional owner and update displayName if provided
      const updatedOwners = [...(existing.additionalOwnerIds ?? []), args.ownerId];
      await ctx.db.patch(existing._id, {
        additionalOwnerIds: updatedOwners,
        ...(args.displayName ? { displayName: args.displayName } : {}),
      });
      return { status: "success", profileId: existing.profileId };
    }

    // New phone — create profile
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
