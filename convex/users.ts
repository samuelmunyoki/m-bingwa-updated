import { addPhoneNumber } from "./features/blacklist";
import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { BackendResponse } from "../lib/custom_types";
import { api } from "./_generated/api";

export const updateOrcreateUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    profileImage: v.string(),
  },
  handler: async (ctx, { userId, name, email, profileImage }) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name,
        email,
        profileImage,
      });
      return { userId: existingUser.userId };
    }

    // Create new user
    await ctx.db.insert("users", {
      userId: userId,
      name: name,
      email: email,
      isAdmin: false,
      profileImage: profileImage,
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
    console.log("👤 getUserById CALLED");
    console.log("searching for userId:", userId);
    console.log("userId length:", userId.length);
    console.log("userId type:", typeof userId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      console.log("NO USER FOUND with userId:", userId);
      return null; // Return null if user is not found
    }

    console.log("user._id:", user._id);
    console.log("user.name:", user.name);
    console.log("user.email:", user.email);
    console.log("user.phoneNumber:", user.phoneNumber);
    console.log("phoneNumber type:", typeof user.phoneNumber);

    const allUsers = await ctx.db.query("users").collect();
    console.log("Total users in database:", allUsers.length);
    console.log("Existing userIds:", allUsers.map(u => u.userId));
    // Return only the necessary fields
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
        // Update existing user
        await ctx.db.patch(existingUser._id, {
          phoneNumber,
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

export const getAllSubscribedUsers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isSubscribed"), true))

      .collect();
  },
});

export const checkExpiry = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Math.floor(Date.now() / 1000);
    const oneDayInSeconds = 24 * 60 * 60;
    const users = await ctx.runQuery(api.users.getAllSubscribedUsers);

    for (const user of users) {
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
  },
  handler: async (ctx, { phoneNumber, name, email }) => {
    console.log("createUserIfNotExists CALLED");
    console.log("phoneNumber:", phoneNumber);
    console.log("name:", name);
    console.log("email:", email);
    
    // Check if user already exists using the same logic as getUserIdByPhone
    const allUsers = await ctx.db.query("users").collect();
    console.log("Checking against", allUsers.length, "users");
    
    // Try direct query first
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
      .first();
    
    // If direct query fails, try manual search
    let finalExistingUser = existingUser || null;
    if (!existingUser) {
      console.log("Direct query failed, trying manual search...");
      const manualMatch = allUsers.find(u => u.phoneNumber === phoneNumber);
      finalExistingUser = manualMatch || null;
      if (finalExistingUser) {
        console.log("Manual search found existing user!");
      }
    }
    
    if (finalExistingUser) {
      console.log("User already exists with userId:", finalExistingUser.userId);
      console.log("User phoneNumber:", finalExistingUser.phoneNumber);
      return {
        status: "success",
        message: "User already exists",
        userId: finalExistingUser.userId,
        isNewUser: false
      };
    }
    
    // Generate a unique userId
    const userId = `user_${Math.random().toString(36).substr(2, 25)}`;
    console.log("🆕 Creating new user with userId:", userId);
    
    try {
      await ctx.db.insert("users", {
        userId: userId,
        phoneNumber: phoneNumber,
        name: name || "",
        email: email || "",
        isAdmin: false,
        isSubscribed: false,
        profileImage: "https://img.clerk.com/default_profile_img",
        suspended: false
      });
      
      console.log("New user created successfully");
      return {
        status: "success",
        message: "User created successfully",
        userId: userId,
        isNewUser: true
      };
    } catch (error) {
      console.error("Error creating user:", error);
      return {
        status: "error",
        message: "Failed to create user",
        userId: null,
        isNewUser: false
      };
    }
  },
});

// DEBUG FUNCTION: Add this to test the specific phone number
export const debugPhoneNumber0706021479 = query({
  args: {},
  handler: async (ctx) => {
    const targetPhone = "0706021479";
    console.log("=== DEBUGGING PHONE NUMBER", targetPhone, "===");
    
    const allUsers = await ctx.db.query("users").collect();
    console.log("Total users:", allUsers.length);
    
    const targetUser = allUsers.find(u => u.phoneNumber === targetPhone) || null;
    
    if (targetUser) {
      console.log("✅ Found target user:");
      console.log("_id:", targetUser._id);
      console.log("userId:", targetUser.userId);
      console.log("phoneNumber:", targetUser.phoneNumber);
      console.log("name:", targetUser.name);
      
      return {
        found: true,
        user: {
          _id: targetUser._id,
          userId: targetUser.userId,
          phoneNumber: targetUser.phoneNumber,
          name: targetUser.name,
          email: targetUser.email
        }
      };
    } else {
      console.log("❌ Target user not found");
      return {
        found: false,
        allPhoneNumbers: allUsers.map(u => u.phoneNumber)
      };
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
    console.log("🔍 getUserIdByPhone QUERY called in users.ts");
    console.log("phoneNumber:", phoneNumber);
    console.log("phoneNumber type:", typeof phoneNumber);
    console.log("phoneNumber length:", phoneNumber.length);

    // Debug: Let's see all users first
    const allUsers = await ctx.db.query("users").collect();
    console.log("=== ALL USERS DEBUG ===");
    console.log("Total users in database:", allUsers.length);
    allUsers.forEach((u, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  _id: ${u._id}`);
      console.log(`  userId: ${u.userId}`);
      console.log(`  phoneNumber: "${u.phoneNumber}"`);
      console.log(`  phoneNumber type: ${typeof u.phoneNumber}`);
      console.log(`  phoneNumber === "${phoneNumber}": ${u.phoneNumber === phoneNumber}`);
      console.log(`  name: ${u.name}`);
    });
    console.log("=== END DEBUG ===");

    // Try the query
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
      .first();

    console.log("=== DATABASE QUERY RESULT ===");
    console.log("User found by query:", !!user);

    if (user) {
      console.log("✅ FOUND USER:");
      console.log("user._id:", user._id);
      console.log("user.userId:", user.userId);
      console.log("user.name:", user.name);
      console.log("user.email:", user.email);
      console.log("user.phoneNumber:", user.phoneNumber);
      console.log("typeof user.userId:", typeof user.userId);
      console.log("userId is null?:", user.userId === null);
      console.log("userId is undefined?:", user.userId === undefined);
      console.log("userId is empty string?:", user.userId === "");

      const successResponse = {
        status: "success" as const,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber
      };

      console.log("=== QUERY SUCCESS RESPONSE ===");
      console.log("Response object:", successResponse);
      console.log("Response userId:", successResponse.userId);
      console.log("=== END QUERY RESPONSE ===");

      return successResponse;
    } else {
      console.log("❌ No user found by query");

      // Manual fallback search
      console.log("🔧 Trying manual search...");
      const manualMatch = allUsers.find(u => u.phoneNumber === phoneNumber) || null;

      if (manualMatch) {
        console.log("🎯 MANUAL SEARCH FOUND USER!");
        console.log("This means there's a query issue, but user exists");
        console.log("Manual match userId:", manualMatch.userId);

        const successResponse = {
          status: "success" as const,
          userId: manualMatch.userId,
          name: manualMatch.name,
          email: manualMatch.email,
          phoneNumber: manualMatch.phoneNumber
        };

        console.log("Returning manual search result:", successResponse);
        return successResponse;
      }

      // Also try trimmed search
      const trimmedMatch = allUsers.find(u => u.phoneNumber?.trim() === phoneNumber.trim()) || null;
      if (trimmedMatch) {
        console.log("🎯 TRIMMED SEARCH FOUND USER!");
        return {
          status: "success" as const,
          userId: trimmedMatch.userId,
          name: trimmedMatch.name,
          email: trimmedMatch.email,
          phoneNumber: trimmedMatch.phoneNumber
        };
      }

      console.log("❌ User truly not found");

      const errorResponse = {
        status: "error" as const,
        message: "User not found",
        userId: null,
        name: null,
        email: null,
        phoneNumber: null
      };

      console.log("❌ Returning error response:", errorResponse);
      return errorResponse;
    }
  },
});


// New query to get user by phone number with normalization (handles any format)
export const getUserByPhoneNormalized = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, { phoneNumber }) => {
    console.log("📱 getUserByPhoneNormalized called");
    console.log("Original phoneNumber:", phoneNumber);

    // Normalize the input phone number
    const normalizedInput = normalizePhoneNumber(phoneNumber);
    console.log("Normalized input:", normalizedInput);

    // Get all users and normalize their phone numbers for comparison
    const allUsers = await ctx.db.query("users").collect();

    console.log(`Searching through ${allUsers.length} users`);

    // Find user by normalized phone number
    const matchedUser = allUsers.find(user => {
      if (!user.phoneNumber) return false;
      const normalizedUserPhone = normalizePhoneNumber(user.phoneNumber);
      console.log(`Comparing: ${normalizedUserPhone} === ${normalizedInput}`);
      return normalizedUserPhone === normalizedInput;
    });

    if (matchedUser) {
      console.log("✅ User found!");
      console.log("User details:", {
        userId: matchedUser.userId,
        name: matchedUser.name,
        phoneNumber: matchedUser.phoneNumber
      });

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

    console.log("❌ No user found with phone number:", phoneNumber);
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
        // DIFFERENT device - BLOCK login
        console.log("⚠️ ACTIVE SESSION EXISTS ON DIFFERENT DEVICE");
        console.log(`Active device: ${existingSession.deviceModel}`);
        console.log(`Attempting device: ${deviceModel}`);
        console.log("🚫 LOGIN BLOCKED");

        return {
          status: "error",
          error: "already_logged_in",
          activeDevice: existingSession.deviceModel,
          message: `Already logged in on ${existingSession.deviceModel}`,
        };
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


export const validateDeviceSession = mutation({
  args: {
    phoneNumber: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, { phoneNumber, deviceId }) => {
    // STEP 1: Get the active session for this phone number
    const activeSession = await ctx.db
      .query("deviceSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
      .first();

    if (!activeSession) {
      // No session found - user needs to login
      console.log(`❌ No session found for phone: ${phoneNumber}`);
      return {
        isValid: false,
        reason: "no_session_found",
        message: "No active session found. Please login again.",
      };
    }

    // STEP 2: Check if the device ID matches
    if (activeSession.deviceId !== deviceId) {
      // Device ID doesn't match - user logged in from another device
      console.log(
        `❌ Device mismatch: stored=${activeSession.deviceId}, received=${deviceId}`
      );
      return {
        isValid: false,
        reason: "logged_in_from_another_device",
        currentDevice: activeSession.deviceModel,
        loginTimestamp: activeSession.loginTimestamp,
        message: `You logged in from another device: ${activeSession.deviceModel}`,
      };
    }

    // STEP 3: Check if session is still active
    if (!activeSession.isActive) {
      console.log(`❌ Session is inactive for device: ${deviceId}`);
      return {
        isValid: false,
        reason: "session_inactive",
        message: "Your session has been deactivated. Please login again.",
      };
    }

    // STEP 4: Session is valid - update last active timestamp
    await ctx.db.patch(activeSession._id, {
      lastActiveTimestamp: Date.now(),
    });

    console.log(`✅ Session validated for device: ${deviceId}`);
    return {
      isValid: true,
      message: "Session is active",
      userId: activeSession.userId,
    };
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
      .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
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
