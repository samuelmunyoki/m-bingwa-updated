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
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name,
        email,
        profileImage,
      });
      return existingUser._id;
    }

    // Create new user
    const newUserId = await ctx.db.insert("users", {
      userId: userId,
      name: name,
      email: email,
      isAdmin: false,
      profileImage: profileImage,
      suspended: false,
      isSubscribed: false,
    });
    return newUserId;
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
      const user = await ctx.db
        .query("users")
        .withIndex("by_checkoutRequestID", (q) =>
          q.eq("subscriptionId", args.checkoutRequestID)
        )
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          isSubscribed: true,
        });
      }
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
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
      .first();
    
    if (existingUser) {
      console.log("User already exists with userId:", existingUser.userId);
      return {
        status: "success",
        message: "User already exists",
        userId: existingUser.userId,
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
        profileImage: "",
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

// Get userId by phone number for creating stores 
// and bundles from app side (for login after OTP verification)
export const getUserIdByPhone = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, { phoneNumber }) => {
    console.log("🔍 getUserIdByPhone QUERY called in users.ts");
    console.log("phoneNumber:", phoneNumber);
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("phoneNumber"), phoneNumber))
      .first();
    
    console.log("=== DATABASE QUERY RESULT ===");
    console.log("User found:", !!user);
    if (user) {
      console.log("user._id:", user._id);
      console.log("user.userId:", user.userId);
      console.log("user.name:", user.name);
      console.log("user.email:", user.email);
      console.log("user.phoneNumber:", user.phoneNumber);
      console.log("typeof user.userId:", typeof user.userId);

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
      console.log("❌ No user found in database");
      
      const allUsers = await ctx.db.query("users").collect();
      console.log("Total users in database:", allUsers.length);
      console.log("All phone numbers:", allUsers.map(u => u.phoneNumber));
      
      const errorResponse = {
        status: "error" as const,
        message: "User not found",
        userId: null
      };
      
      console.log("❌ Returning error response:", errorResponse);
      return errorResponse;
    }
  },
});

