import { addPhoneNumber } from "./features/blacklist";
import { isAccessAllowed } from "./features/appConfig";
import { performHeartbeatUpdate } from "./features/serviceStatus";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  MutationCtx,
} from "./_generated/server";
import { BackendResponse } from "../lib/custom_types";
import { api } from "./_generated/api";
import { v4 as uuidv4 } from "uuid";

export const updateOrcreateUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    profileImage: v.string(),
  },
  handler: async (ctx, { userId, name, email, profileImage }) => {
    // Check by userId first — canonical Clerk identifier, prevents duplicates
    const byUserId = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (byUserId) {
      await ctx.db.patch(byUserId._id, { name, email, profileImage });
      return { userId: byUserId.userId };
    }

    // Fall back to email lookup (handles legacy records)
    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (byEmail) {
      await ctx.db.patch(byEmail._id, { name, email, profileImage, userId });
      return { userId: byEmail.userId };
    }

    // No record found — create new user
    await ctx.db.insert("users", {
      userId,
      name,
      email,
      isAdmin: false,
      profileImage,
      suspended: false,
      isSubscribed: false,
    });
    return { userId };
  },
});

export const internalgetUserById = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      return null; // Return null if user is not found
    }

    // Return only the necessary fields
    return {
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      profileImage: user.profileImage,
      suspended: user.suspended,
    };
  },
});

export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      return null;
    }

    return user;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return user ?? null;
  },
});

export const updateSubscription = mutation({
  args: {
    userId: v.string(),
    subscriptionId: v.string(),
    subscriptionEnds: v.number(),
    isSubscribed: v.boolean(),
  },
  handler: async (
    ctx,
    { userId, subscriptionId, subscriptionEnds, isSubscribed }
  ) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      return null;
    }
    await ctx.db.patch(user._id, {
      subscriptionId,
      subscriptionEnds,
      isSubscribed,
    });
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const toggleUserSuspension = mutation({
  args: { userId: v.string(), suspended: v.boolean() },
  handler: async (ctx, args) => {
    const { userId, suspended } = args;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!user) {
      return { success: false, message: "User not found" };
    }

    await ctx.db.patch(user._id, { suspended });

    return {
      success: true,
      message: suspended
        ? "User suspended successfully"
        : "User activated successfully",
    };
  },
});

export const updateAgentNumber = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
  },
  handler: async (ctx, { userId, phoneNumber }) => {
    // Check if user exists

    console.log("=== UPDATE AGENT NUMBER ===");
    console.log("userId:", userId);
    console.log("phoneNumber:", phoneNumber);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    console.log("existingUser found:", !!existingUser);
    if (existingUser) {
      console.log("existing phoneNumber:", existingUser.phoneNumber);
    }
    try {
      
      if (existingUser) {
        console.log("existing phoneNumber:", existingUser.phoneNumber);
        // Check if phone is already taken by a different user
        if (existingUser.phoneNumber !== phoneNumber) {
          const phoneConflict = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
            .first();
          if (phoneConflict && phoneConflict._id !== existingUser._id) {
            return {
              status: "error",
              message: "This phone number is already registered to another account.",
            } as BackendResponse;
          }
        }
        // Update existing user
        await ctx.db.patch(existingUser._id, {
          phoneNumber,
          normalizedPhoneNumber: normalizePhoneNumber(phoneNumber),
        });

        // Verify the update
        const updatedUser = await ctx.db.get(existingUser._id);
        console.log("updated phoneNumber:", updatedUser?.phoneNumber);
        return {
          status: "success",
          message: "Agent data updated",
        } as BackendResponse;
      }
      return {
        status: "error",
        message: "Agent not found.",
      } as BackendResponse;
    } catch (error) {
      return {
        status: "error",
        message: "Unexpected error. Please try again later.",
      } as BackendResponse;
    }
  },
});

// Pre-check before sending an OTP for a phone-number change — lets the app avoid
// burning an SMS on a request that's going to be rejected anyway. The change itself
// is still re-validated inside changePhoneNumber below (state can shift between
// send-OTP and confirm).
export const checkPhoneAvailability = query({
  args: {
    phoneNumber: v.string(),
    requestingUserId: v.string(),
  },
  handler: async (ctx, { phoneNumber, requestingUserId }) => {
    const conflict = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
      .first();

    if (!conflict || conflict.userId === requestingUserId) {
      return { available: true };
    }

    const activeSession = await ctx.db
      .query("deviceSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (activeSession) {
      return {
        available: false,
        reason: "active_elsewhere",
        message: "This phone number is currently active on another device. Ask that account to log out first, then try again.",
      };
    }

    return { available: true };
  },
});

// Changes the calling account's phone number, reassigning it away from a dormant
// account if one already holds it, and re-keying this account's own phone-indexed
// backend records (device session lock, service/online status, heartbeat, primary
// phoneProfiles entry) so they don't go stale under the old number.
export const changePhoneNumber = mutation({
  args: {
    userId: v.string(),
    newPhoneNumber: v.string(),
  },
  handler: async (ctx, { userId, newPhoneNumber }) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!existingUser) {
      return { status: "error", message: "Account not found." } as BackendResponse;
    }

    if (existingUser.phoneNumber === newPhoneNumber) {
      return { status: "error", message: "This is already your phone number." } as BackendResponse;
    }

    const oldPhoneNumber = existingUser.phoneNumber;

    const conflict = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneNumber"), newPhoneNumber))
      .first();

    if (conflict && conflict._id !== existingUser._id) {
      const activeSession = await ctx.db
        .query("deviceSessions")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", newPhoneNumber))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (activeSession) {
        return {
          status: "error",
          message: "This phone number is currently active on another device. Ask that account to log out first, then try again.",
        } as BackendResponse;
      }

      // Dormant account holding the number — free it up.
      await ctx.db.patch(conflict._id, { phoneNumber: undefined, normalizedPhoneNumber: undefined });
    }

    await ctx.db.patch(existingUser._id, {
      phoneNumber: newPhoneNumber,
      normalizedPhoneNumber: normalizePhoneNumber(newPhoneNumber),
    });

    // Re-key this account's own phone-indexed records so nothing goes silently stale.
    if (oldPhoneNumber) {
      const session = await ctx.db
        .query("deviceSessions")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", oldPhoneNumber))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (session) {
        await ctx.db.patch(session._id, { phoneNumber: newPhoneNumber });
      }

      const svcStatus = await ctx.db
        .query("serviceStatus")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", oldPhoneNumber))
        .first();
      if (svcStatus) {
        await ctx.db.patch(svcStatus._id, { phoneNumber: newPhoneNumber });
      }

      const onlineStatus = await ctx.db
        .query("onlineServiceStatus")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", oldPhoneNumber))
        .first();
      if (onlineStatus) {
        await ctx.db.patch(onlineStatus._id, { phoneNumber: newPhoneNumber });
      }

      const heartbeat = await ctx.db
        .query("deviceHeartbeats")
        .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", oldPhoneNumber))
        .first();
      if (heartbeat) {
        await ctx.db.patch(heartbeat._id, { phoneNumber: newPhoneNumber });
      }
    }

    // Re-key the primary phoneProfiles entry (profileId === ownerId identifies "primary" —
    // a by_owner lookup alone isn't safe since a user can also own additional, non-primary
    // profiles for extra numbers they've added).
    const ownedProfiles = await ctx.db
      .query("phoneProfiles")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const primaryProfile = ownedProfiles.find((p) => p.profileId === p.ownerId);
    if (primaryProfile) {
      await ctx.db.patch(primaryProfile._id, { phoneNumber: newPhoneNumber });
    }

    return { status: "success", message: "Phone number updated." } as BackendResponse;
  },
});

export const activateSubscription = mutation({
  args: {
    checkoutRequestID: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const transaction = await ctx.db
        .query("mpesa_transactions")
        .withIndex("by_checkoutRequestID", (q) =>
          q.eq("checkoutRequestID", args.checkoutRequestID)
        )
        .first();

      if (!transaction || !transaction.subscriptionEnds || !transaction.userId) {
        console.log("Transaction or subscription data not found");
        return;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_user_id", (q) => q.eq("userId", transaction.userId!))
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          isSubscribed: true,
          subscriptionEnds: transaction.subscriptionEnds,
          subscriptionId: args.checkoutRequestID,
        });
      }

      /**const user = await ctx.db
        .query("users")
        .withIndex("by_checkoutRequestID", (q) =>
          q.eq("subscriptionId", args.checkoutRequestID)
        )
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          isSubscribed: true,
        });
      }**/

    } catch (error) {
      console.log("Error Activating User Subscription: ", error);
    }
  },
});

export const deActivateSubscription = mutation({
  args: { checkoutRequestID: v.string() },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_checkoutRequestID", (q) =>
          q.eq("subscriptionId", args.checkoutRequestID)
        )
        .unique();

      if (!user) {
        throw new Error("User not found");
      }

      await ctx.db.patch(user._id, {
        isSubscribed: false,
        subscriptionEnds: undefined,
        subscriptionId: undefined,
        isSubscriptionEndingSMSsent: false,
      });

      return { success: true };
    } catch (error) {
      console.log("Error deactivating user: ", error);
    }
  },
});

// NOTE: unbounded — returns every subscribed user in one shot, so this would still hit Convex's
// 8192-array cap if ever called with a very large subscribed-user count. Currently has no
// caller (checkExpiry below does its own paginated query directly instead) — if this gets a
// real caller in the future, paginate it the same way checkExpiry does rather than assuming it
// can safely return everything (2026-08-11).
export const getAllSubscribedUsers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_isSubscribed", (q) => q.eq("isSubscribed", true))
      .collect();
  },
});

export const checkExpiry = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Math.floor(Date.now() / 1000);
    const oneDayInSeconds = 24 * 60 * 60;

    // Paginated instead of a single unbounded collect() — this used to scan the WHOLE users
    // table via an unindexed filter() every 30 seconds (the cron interval), and would have
    // hard-crashed outright once subscribed users passed Convex's 8192-array cap. Same per-user
    // logic as before, unchanged — just fed in bounded pages via the by_isSubscribed index so
    // every subscribed user is still covered, without ever holding more than one page in memory
    // at a time (2026-08-11).
    let cursor: string | null = null;
    let isDone = false;
    while (!isDone) {
      const result = await ctx.db
        .query("users")
        .withIndex("by_isSubscribed", (q) => q.eq("isSubscribed", true))
        .paginate({ numItems: 200, cursor });

      for (const user of result.page) {
        if (user.subscriptionEnds && user.subscriptionId && user.isSubscribed) {
          const timeUntilExpiry = user.subscriptionEnds - now;

          // Handle notification when subscription is about to expire
          if (
            timeUntilExpiry > 0 &&
            timeUntilExpiry < oneDayInSeconds &&
            user.phoneNumber &&
            (user.isSubscriptionEndingSMSsent === false ||
              user.isSubscriptionEndingSMSsent === undefined)
          ) {
            const formattedDate = new Date(
              user.subscriptionEnds * 1000
            ).toLocaleString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            });

            const smsContent = `Dear ${user.name}, your M-Bingwa subscription expires on ${formattedDate}. Renew to avoid service interruption.`;

            try {
              await ctx.scheduler.runAfter(
                0,
                api.actions.notifications.sendNotificationSMS,
                {
                  smsContent,
                  smsNumber: user.phoneNumber,
                  userId: user.userId,
                }
              );

              await ctx.db.patch(user._id, {
                isSubscriptionEndingSMSsent: true,
              });
            } catch (error) {
              console.error(
                `Failed to send SMS or update user ${user.userId}:`,
                error
              );
            }
          }

          // Handle subscription deactivation only when it has actually expired
          if (timeUntilExpiry <= 0 && user.isSubscribed) {
            try {
              await ctx.runMutation(api.users.deActivateSubscription, {
                checkoutRequestID: user.subscriptionId,
              });

              await ctx.db.patch(user._id, {
                isSubscriptionEndingSMSsent: false,
              });
              console.log(`Deactivated subscription for user ${user.userId}`);
            } catch (error) {
              console.error(
                `Failed to deactivate subscription for user ${user.userId}:`,
                error
              );
            }
          }
        }
      }

      isDone = result.isDone;
      cursor = result.continueCursor;
    }
  },
});

export const setorUnsetAdmin = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();
    if (user) {
      await ctx.db.patch(user._id, {
        isAdmin: !user.isAdmin,
      });
      return {
        status: "success",
        message: `${user.name} priviledges updated.`,
      } as BackendResponse;
    }
    return {
      status: "error",
      message: "User does not exist.",
    } as BackendResponse;
  },
});

export const setAdminByEmail = mutation({
  args: {
    email: v.string(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, { email, isAdmin }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      return {
        status: "error",
        message: "User not found.",
      } as BackendResponse;
    }
    await ctx.db.patch(user._id, { isAdmin });
    return {
      status: "success",
      message: `${user.name} is now ${isAdmin ? "an admin" : "no longer an admin"}.`,
    } as BackendResponse;
  },
});

export const getFullUserData = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get base user document
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!user) return null;

    // Fetch all related data in parallel
    const [bundles, stores, scheduledEvents] = await Promise.all([
      // User's bundles
      ctx.db
        .query("bundles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect()
        .then((items) => items.map(({  _creationTime, ...rest }) => rest)),

      // User's stores
      ctx.db
        .query("stores")
        .withIndex("by_user", (q) => q.eq("storeOwnerId", args.userId))
        .collect()
        .then((items) => items.map(({ _id, _creationTime, ...rest }) => rest)),

      // User's scheduled events
      ctx.db
        .query("scheduled_events")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("status"), "PENDING"))
        .collect()
        .then((items) => items.map(({ _creationTime, ...rest }) => rest)),
    ]);

    return {
      user: {
        ...user,
        // Remove internal fields
        _id: undefined,
        _creationTime: undefined,
        // Explicitly include sensitive fields if needed
        storageID: undefined,
        subscriptionId: undefined,
      },
      bundles,
      stores,
      scheduledEvents,
    };
  },
});


//Tony added these two functions on 2025-07-26
// This function adds a phone number to the blacklist


// Create user if doesn't exist from app side (call this before sending OTP)
export const createUserIfNotExists = mutation({
  args: {
    phoneNumber: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { phoneNumber, name, email, userId: providedUserId }) => {
    // 1. Check by userId first (fast index lookup)
    if (providedUserId) {
      const byUserId = await ctx.db
        .query("users")
        .withIndex("by_user_id", (q) => q.eq("userId", providedUserId))
        .first();

      if (byUserId) {
        // Update phone number if it changed
        if (byUserId.phoneNumber !== phoneNumber) {
          const phoneConflict = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
            .first();
          if (phoneConflict && phoneConflict._id !== byUserId._id) {
            return { status: "phone_taken", message: "This phone number is already registered to another account.", userId: null, isNewUser: false };
          }
          await ctx.db.patch(byUserId._id, { phoneNumber, normalizedPhoneNumber: normalizePhoneNumber(phoneNumber) });
        }
        return { status: "success", message: "User already exists", userId: byUserId.userId, isNewUser: false };
      }
    }

    // 2. Check by phone number (user may exist under an old Clerk userId)
    const byPhone = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
      .first();

    if (byPhone) {
      // Update userId to the new Clerk userId so future lookups work
      if (providedUserId && byPhone.userId !== providedUserId) {
        await ctx.db.patch(byPhone._id, { userId: providedUserId });
        return { status: "success", message: "User already exists", userId: providedUserId, isNewUser: false };
      }
      return { status: "success", message: "User already exists", userId: byPhone.userId, isNewUser: false };
    }

    // 3. Create new user
    const userId = providedUserId || `user_${Math.random().toString(36).substr(2, 25)}`;
    try {
      await ctx.db.insert("users", {
        userId,
        phoneNumber,
        normalizedPhoneNumber: normalizePhoneNumber(phoneNumber),
        name: name || "",
        email: email || "",
        isAdmin: false,
        isSubscribed: false,
        profileImage: "https://img.clerk.com/default_profile_img",
        suspended: false,
      });
      return { status: "success", message: "User created successfully", userId, isNewUser: true };
    } catch (error) {
      console.error("Error creating user:", error);
      return { status: "error", message: "Failed to create user", userId: null, isNewUser: false };
    }
  },
});

// Get userId by phone number for creating stores
// and bundles from app side (for login after OTP verification)
// Helper function to normalize phone numbers for comparison
// Handles formats like: +254712345678, 254712345678, 0712345678, 712345678
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // If starts with 254, keep as is
  if (digitsOnly.startsWith('254')) {
    return digitsOnly;
  }

  // If starts with 0, replace with 254
  if (digitsOnly.startsWith('0')) {
    return '254' + digitsOnly.substring(1);
  }

  // If starts with 7 or 1 (assuming Kenyan number), add 254
  if (digitsOnly.startsWith('7') || digitsOnly.startsWith('1')) {
    return '254' + digitsOnly;
  }

  // Return as is for other cases
  return digitsOnly;
}

export const getUserIdByPhone = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, { phoneNumber }) => {
    // Fast path: direct indexed exact-match lookup.
    let user = await ctx.db
      .query("users")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", phoneNumber))
      .first();

    // Fallback — only reached if the fast path finds nothing. Covers a phone number stored
    // with stray leading/trailing whitespace (an exact-match index lookup can't catch that,
    // since the stored string differs from the trimmed one). Same trimmed comparison this
    // function always fell back to, so behavior can never regress below what it did before
    // this change — only get faster for the common case. (The old "manual fallback search"
    // step is gone: it re-did the exact same equality check the indexed query above already
    // does, over the same data, so it could never have found anything the fast path missed —
    // dead code, not a behavior change to remove it.) (2026-08-11)
    if (!user) {
      const allUsers = await ctx.db.query("users").collect();
      user = allUsers.find(u => u.phoneNumber?.trim() === phoneNumber.trim()) ?? null;
    }

    if (user) {
      return {
        status: "success" as const,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber
      };
    }

    return {
      status: "error" as const,
      message: "User not found",
      userId: null,
      name: null,
      email: null,
      phoneNumber: null
    };
  },
});


// One-time backfill: computes normalizedPhoneNumber for users who don't have it yet (everyone
// created before 2026-08-11, plus a safety net for any write site that might get missed).
// Idempotent — safe to re-run, only touches rows whose stored value is missing or stale.
// Paginated so it can never hit Convex's 8192-row cap regardless of table size. NOT called
// automatically — run this once manually (Convex dashboard/CLI) after deploying this change.
export const backfillNormalizedPhoneNumbers = mutation({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    let isDone = false;
    let updated = 0;
    let skipped = 0;
    while (!isDone) {
      const result = await ctx.db.query("users").paginate({ numItems: 200, cursor });
      for (const user of result.page) {
        if (!user.phoneNumber) {
          skipped++;
          continue;
        }
        const expected = normalizePhoneNumber(user.phoneNumber);
        if (user.normalizedPhoneNumber !== expected) {
          await ctx.db.patch(user._id, { normalizedPhoneNumber: expected });
          updated++;
        } else {
          skipped++;
        }
      }
      isDone = result.isDone;
      cursor = result.continueCursor;
    }
    return { status: "success" as const, updated, skipped };
  },
});

// Query to get user by phone number with normalization (handles any format: +254712345678,
// 254712345678, 0712345678, 712345678, or any of those with stray spaces/dashes).
export const getUserByPhoneNormalized = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, { phoneNumber }) => {
    const normalizedInput = normalizePhoneNumber(phoneNumber);

    // Fast path: direct indexed lookup via the pre-computed normalizedPhoneNumber column.
    let matchedUser = await ctx.db
      .query("users")
      .withIndex("by_normalizedPhoneNumber", (q) => q.eq("normalizedPhoneNumber", normalizedInput))
      .first();

    // Fallback — only reached if the fast path finds nothing. Covers any user whose
    // normalizedPhoneNumber is missing or stale (e.g. backfill hasn't been run yet, or some
    // write site was missed). Identical to the full-scan-and-compare this function always used,
    // so behavior can never regress below what it did before this change — only get faster
    // for the common case (2026-08-11).
    if (!matchedUser) {
      const allUsers = await ctx.db.query("users").collect();
      matchedUser = allUsers.find(user => {
        if (!user.phoneNumber) return false;
        return normalizePhoneNumber(user.phoneNumber) === normalizedInput;
      }) ?? null;
    }

    if (matchedUser) {
      return {
        status: "success" as const,
        userId: matchedUser.userId,
        name: matchedUser.name,
        email: matchedUser.email,
        phoneNumber: matchedUser.phoneNumber,
        isSubscribed: matchedUser.isSubscribed,
        subscriptionEnds: matchedUser.subscriptionEnds,
        suspended: matchedUser.suspended
      };
    }

    return {
      status: "error" as const,
      message: "User not found",
      userId: null,
      name: null,
      email: null,
      phoneNumber: null,
      isSubscribed: null,
      subscriptionEnds: null,
      suspended: null
    };
  },
});

export const registerDeviceSession = mutation({
  args: {
    phoneNumber: v.string(),
    deviceId: v.string(),
    deviceModel: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { phoneNumber, deviceId, deviceModel, userId } = args;

    console.log("REGISTER DEVICE SESSION (BLOCK MODE)");
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Device: ${deviceId} (${deviceModel})`);

    // CRITICAL: Check if phone number has ACTIVE session
    const existingSession = await ctx.db
      .query("deviceSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingSession) {
      // Check if it's the SAME device
      if (existingSession.deviceId === deviceId) {
        // Same device - just refresh the session
        await ctx.db.patch(existingSession._id, {
          lastActiveTimestamp: Date.now(),
        });

        console.log("✅ Same device - session refreshed");
        return {
          status: "success",
          sessionStatus: "session_refreshed",
          userId,
        };
      } else {
        // DIFFERENT device - deactivate old session, let new device in
        console.log("⚠️ ACTIVE SESSION EXISTS ON DIFFERENT DEVICE");
        console.log(`Previous device: ${existingSession.deviceModel} — deactivating`);
        console.log(`New device: ${deviceModel} — allowing in`);

        await ctx.db.patch(existingSession._id, {
          isActive: false,
          lastActiveTimestamp: Date.now(),
        });

        console.log("✅ Old session deactivated — new session will be created");
      }
    }

    // No active session exists - CREATE NEW SESSION
    const newSessionId = await ctx.db.insert("deviceSessions", {
      phoneNumber,
      deviceId,
      deviceModel,
      userId,
      loginTimestamp: Date.now(),
      lastActiveTimestamp: Date.now(),
      isActive: true,
    });

    console.log("✅ New session created");
    console.log(`Session ID: ${newSessionId}`);

    return {
      status: "success",
      sessionStatus: "new_session",
      userId,
    };
  },
});


// Shared handler body, reused by validateDeviceSession and by the combined
// heartbeat+session-validate mutation below (one isolate invocation instead
// of two — see HEARTBEAT_INTERVAL history in HeartbeatService.kt).
export async function performSessionValidation(
  ctx: MutationCtx,
  { phoneNumber, deviceId }: { phoneNumber: string; deviceId: string }
) {
  // Get the current active session for this phone number
  const activeSession = await ctx.db
    .query("deviceSessions")
    .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!activeSession) {
    return {
      isValid: false,
      reason: "no_session_found",
      message: "No active session found. Please login again.",
    };
  }

  if (activeSession.deviceId !== deviceId) {
    return {
      isValid: false,
      reason: "logged_in_from_another_device",
      currentDevice: activeSession.deviceModel,
      loginTimestamp: activeSession.loginTimestamp,
      message: `You logged in from another device: ${activeSession.deviceModel}`,
    };
  }

  // This device is the active one — update timestamp
  await ctx.db.patch(activeSession._id, {
    lastActiveTimestamp: Date.now(),
  });

  // Temporary access limiting — checked on every heartbeat so an
  // already-logged-in user gets blocked within a couple seconds of
  // being removed from the allowlist, not just at next login.
  const allowed = await isAccessAllowed(ctx, {
    userId: activeSession.userId,
    phoneNumber,
  });
  if (!allowed) {
    return {
      isValid: false,
      reason: "access_temporarily_limited",
      message: "Access is temporarily limited while we resolve a few issues.",
    };
  }

  return {
    isValid: true,
    message: "Session is active",
    userId: activeSession.userId,
  };
}

export const validateDeviceSession = mutation({
  args: {
    phoneNumber: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => performSessionValidation(ctx, args),
});

// Combined heartbeat + session-validate — used by the app's 15s heartbeat
// loop so each tick costs one isolate invocation instead of two. Return
// shape matches validateDeviceSession's (what the app already parses);
// the heartbeat write is fire-and-forget from the caller's perspective —
// if it throws, the whole mutation throws and the app's existing catch
// block handles it exactly like a failed heartbeat does today.
export const updateHeartbeatAndValidateSession = mutation({
  args: {
    phoneNumber: v.string(),
    userId: v.string(),
    deviceId: v.string(),
    batteryLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await performHeartbeatUpdate(ctx, {
      phoneNumber: args.phoneNumber,
      userId: args.userId,
      batteryLevel: args.batteryLevel,
    });
    return performSessionValidation(ctx, {
      phoneNumber: args.phoneNumber,
      deviceId: args.deviceId,
    });
  },
});


export const getActiveDevice = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, { phoneNumber }) => {
    const activeSession = await ctx.db
      .query("deviceSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .first();

    if (!activeSession) {
      return {
        status: "no_active_session",
        data: null,
      };
    }

    return {
      status: "success",
      data: {
        deviceId: activeSession.deviceId,
        deviceModel: activeSession.deviceModel,
        loginTimestamp: activeSession.loginTimestamp,
        lastActiveTimestamp: activeSession.lastActiveTimestamp,
        isActive: activeSession.isActive,
      },
    };
  },
});


export const logoutDevice = mutation({
  args: {
    phoneNumber: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const { phoneNumber, deviceId } = args;

    console.log("LOGOUT DEVICE");
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Device: ${deviceId}`);

    // Find the session for this phone and device
    const session = await ctx.db
      .query("deviceSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .filter((q) => 
        q.and(
          q.eq(q.field("deviceId"), deviceId),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (!session) {
      console.log("⚠️ No active session found for this device");
      
      return {
        status: "success",
        message: "No active session to logout",
      };
    }

    // Delete the session (or mark as inactive)
    await ctx.db.delete(session._id);
    
    console.log("✅ Session deleted");

    return {
      status: "success",
      message: "Device logged out successfully",
    };
  },
});

export const clearDeviceSession = mutation({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const { phoneNumber } = args;

    console.log("CLEAR DEVICE SESSION (ADMIN/WEBSITE)");
    console.log(`Phone: ${phoneNumber}`);

    // Find all active sessions for this phone number
    const sessions = await ctx.db
      .query("deviceSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (sessions.length === 0) {
      console.log("⚠️ No active session found");
      
      return {
        status: "error",
        message: "No active session found for this phone number",
      };
    }

    // Delete all active sessions for this phone number
    let deletedCount = 0;
    for (const session of sessions) {
      await ctx.db.delete(session._id);
      console.log(`✅ Deleted session: ${session.deviceModel}`);
      deletedCount++;
    }

    console.log(`✅ Total sessions cleared: ${deletedCount}`);

    return {
      status: "success",
      message: `Cleared ${deletedCount} active session(s)`,
      deletedCount,
    };
  },
});

export const clearUserSubscription = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    console.log("🔥 clearUserSubscription called for:", userId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      console.log("❌ User not found");
      throw new Error("User not found");
    }

    console.log("Before clearing - isSubscribed:", user.isSubscribed);
    console.log("Before clearing - subscriptionEnds:", user.subscriptionEnds);

    // Clear subscription fields
    await ctx.db.patch(user._id, {
      isSubscribed: false,
      subscriptionEnds: undefined,
      subscriptionId: undefined,
    });

    console.log("✅ Subscription cleared successfully");

    return {
      status: "success",
      message: "Subscription cleared",
      userId: user.userId,
      phoneNumber: user.phoneNumber
    };
  }
});

export const updateUserProfile = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      return { status: "error", message: "User not found" };
    }

    const updates: { name?: string; email?: string } = {};
    if (name && name.trim().length > 0) updates.name = name.trim();
    if (email && email.trim().length > 0) updates.email = email.trim();

    if (Object.keys(updates).length === 0) {
      return { status: "error", message: "No fields to update" };
    }

    await ctx.db.patch(user._id, updates);

    return { status: "success", message: "Profile updated successfully" };
  },
});

export const deleteUserByPhone = mutation({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, { phoneNumber }) => {
    console.log("🗑️ deleteUserByPhone called for:", phoneNumber);

    const user = await ctx.db
      .query("users")
      .withIndex("by_phoneNumber", (q) => q.eq("phoneNumber", phoneNumber))
      .first();

    if (!user) {
      console.log("❌ User not found with phone:", phoneNumber);
      throw new Error("User not found");
    }

    console.log("Found user:", user.userId, user.name);

    // Delete the user
    await ctx.db.delete(user._id);

    console.log("✅ User deleted successfully");

    return {
      status: "success",
      message: "User deleted successfully",
      userId: user.userId,
      phoneNumber: user.phoneNumber,
      name: user.name
    };
  }
});

export const registerWebSession = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!user) return { status: "error", error: "User not found" };
    const token = uuidv4();
    await ctx.db.patch(user._id, { webSessionToken: token });
    return { status: "success", token };
  },
});

export const getWebSessionToken = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    return user?.webSessionToken ?? null;
  },
});
