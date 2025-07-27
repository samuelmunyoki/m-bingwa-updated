import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { httpAction } from "../../_generated/server";

// Helper function to create a standardized response format
const createResponse = (
  status: "success" | "error",
  data: any = null,
  error: string | null = null
) => {
  return new Response(
    JSON.stringify({
      status,
      data,
      error,
      timestamp: Date.now(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
};

// HTTP action to download user data
export const downloadUserData = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    // Fetch fresh user data from dependencies
    const userData = await ctx.runQuery(api.users.getFullUserData, { userId });

    if (!userData?.user) {
      return createResponse("error", null, "User not found");
    }

    return createResponse("success", {
      user: userData.user,
      bundles: userData.bundles,
      stores: userData.stores,
      scheduledEvents: userData.scheduledEvents,
    });
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch user data");
  }
});

// HTTP action to update user data
// export const updateUserData = httpAction(async (ctx, request) => {
//   if (request.method !== "POST") {
//     return createResponse("error", null, "Method not allowed");
//   }

//   let body;
//   try {
//     body = await request.json();
//   } catch (error) {
//     return createResponse("error", null, "Invalid JSON body");
//   }

//   const { data } = body;
//   if (!data || !data.user || !data.user.userId) {
//     return createResponse(
//       "error",
//       null,
//       "Missing user data or userId in request body"
//     );
//   }

//   const { user, bundles, stores, scheduledEvents } = data;

//   try {
//     const updateResults: {
//       bundles?: {
//         updatedBundles: any[];
//         errors: any[];
//       };
//       stores?: {
//         updatedStores: any[];
//         errors: any[];
//       };
//       scheduledEvents?: {
//         updatedEvents: any[];
//         errors: any[];
//       };
//     } = {};

//     // Update bundles if provided
//     if (Array.isArray(bundles)) {
//       updateResults.bundles = await ctx.runMutation(
//         api.mobile.actions.update_user_data.updateBundles,
//         {
//           userId: user.userId,
//           bundles,
//         }
//       );
//       if (updateResults.bundles.errors.length > 0) {
//         console.error("Errors updating bundles:", updateResults.bundles.errors);
//       }
//     }

//     // Update stores if provided
//     if (Array.isArray(stores)) {
//       updateResults.stores = await ctx.runMutation(
//         api.mobile.actions.update_user_data.updateStores,
//         {
//           userId: user.userId,
//           stores,
//         }
//       );
//       if (updateResults.stores.errors.length > 0) {
//         console.error("Errors updating stores:", updateResults.stores.errors);
//       }
//     }

//     // Update scheduled events if provided
//     if (Array.isArray(scheduledEvents)) {
//       updateResults.scheduledEvents = await ctx.runMutation(
//         api.mobile.actions.update_user_data.updateScheduledEvents,
//         {
//           userId: user.userId,
//           scheduledEvents,
//         }
//       );
//       if (updateResults.scheduledEvents.errors.length > 0) {
//         console.error(
//           "Errors updating scheduled events:",
//           updateResults.scheduledEvents.errors
//         );
//       }
//     }

//     return createResponse("success", {
//       message: "User data updated",
//       results: updateResults,
//     });
//   } catch (error: any) {
//     console.error(error);
//     return createResponse(
//       "error",
//       null,
//       `Failed to update user data: ${error.message}`
//     );
//   }
// });

// HTTP Action for OTP Verification
export const verifyOtpCode = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  if (!body || !body.otpCode) {
    return createResponse("error", null, "Missing otpCode in request body");
  }

  try {
    const { otpCode } = body;

    const response = await ctx.runMutation(api.features.otps.verifyOtp, {
      otpCode,
    });

    if (response.success) {
      // On success, return the userId (or null if not provided).
      return createResponse("success", {
        message: response.message,
        userId: response.userId || null,
      });
    } else {
      // On failure, return null for userId.
      return createResponse("error", {
        message: response.message,
        userId: null,
      });
    }
  } catch (error: any) {
    console.error(error);
    return createResponse(
      "error",
      null,
      `Failed to verify OTP: ${error.message}`
    );
  }
});

// HTTP Action for deleting Bundle with ID
export const deleteBundle = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  if (!body || !body.bundleId || !body.userId) {
    return createResponse(
      "error",
      null,
      "Missing bundleId or userId in request body"
    );
  }

  try {
    const { bundleId, userId } = body;

    await ctx.runMutation(api.features.bundles.deleteBundleFromAPI, {
      id: bundleId,
      userId,
    });

    // On success, return the userId (or null if not provided).
    return createResponse("success", null, null);
  } catch (error: any) {
    console.error(error);
    return createResponse("error", null, error.message);
  }
});

// HTTP Action for Bundle creation
export const createBundle = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed")
  }

  let body
  try {
    body = await request.json()
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body")
  }

  const { userId, offerName, duration, bundlesUSSD, price, status, isMultiSession, dialingSIM } = body

  if (
    !userId ||
    !offerName ||
    !duration ||
    !bundlesUSSD ||
    price === undefined ||
    !status ||
    isMultiSession === undefined ||
    !dialingSIM
  ) {
    return createResponse("error", null, "Missing required fields in request body")
  }

  if (typeof price !== "number") {
    return createResponse("error", null, "Price must be a number")
  }

  if (status !== "available" && status !== "disabled") {
    return createResponse("error", null, "Invalid status. Must be 'available' or 'disabled'")
  }

   if (dialingSIM !== "SIM1" && dialingSIM !== "SIM2") {
     return createResponse(
       "error",
       null,
       "Invalid dialingSIM. Must be 'SIM1' or 'SIM2'"
     );
   }

  if (typeof isMultiSession !== "boolean") {
    return createResponse("error", null, "isMultiSession must be a boolean")
  }


  try {
    // Check for existing bundle with the same name or price for this user
    const existingBundle = await ctx.runQuery(api.features.bundles.getBundleByUserAndNameOrPrice, {
      userId,
      offerName,
      price,
    })

    if (existingBundle) {
      if (existingBundle.offerName === offerName) {
        return createResponse(
          "error",
          null,
          `A bundle with the name "${offerName}" already exists. Please choose a different name.`,
        )
      } else {
        return createResponse(
          "error",
          null,
          `A bundle with the price ${price} already exists. Please choose a different price.`,
        )
      }
    }

    const newBundleId = await ctx.runMutation(api.features.bundles.createBundleFromAPI, {
      userId,
      offerName,
      duration,
      price,
      status,
      bundlesUSSD,
      isMultiSession,
      dialingSIM
    })

    return createResponse("success", { bundleId: newBundleId }, null)
  } catch (error: any) {
    console.error("Error creating bundle:", error)
    return createResponse("error", null, "An error occurred while creating the bundle. Please try again later.")
  }
})

export const updateBundle = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed")
  }

  let body
  try {
    body = await request.json()
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body")
  }

  const { id, userId, offerName, duration, bundlesUSSD, price, status, isMultiSession, dialingSIM } = body

  if (!id || !userId) {
    return createResponse("error", null, "Missing required fields: id and userId")
  }

  // Validate id
  if (typeof id !== "string") {
    return createResponse("error", null, "Invalid id format")
  }

  // Validate optional fields
  if (offerName !== undefined && typeof offerName !== "string") {
    return createResponse("error", null, "offerName must be a string")
  }
  if (duration !== undefined && typeof duration !== "string") {
    return createResponse("error", null, "duration must be a string")
  }
  if (bundlesUSSD !== undefined && typeof bundlesUSSD !== "string") {
    return createResponse("error", null, "bundlesUSSD must be a string")
  }
  if (price !== undefined && typeof price !== "number") {
    return createResponse("error", null, "price must be a number")
  }
    if (dialingSIM !== "SIM1" && dialingSIM !== "SIM2") {
      return createResponse(
        "error",
        null,
        "Invalid dialingSIM. Must be 'SIM1' or 'SIM2'"
      );
    }
  if (status !== undefined && status !== "available" && status !== "disabled") {
    return createResponse("error", null, "status must be 'available' or 'disabled'")
  }
  if (isMultiSession !== undefined && typeof isMultiSession !== "boolean") {
    return createResponse("error", null, "isMultiSession must be a boolean")
  }

  try {
    const existingBundle = await ctx.runQuery(api.features.bundles.getBundleByBundleID, {
      bundleId: id as Id<"bundles">,
    })
    if (!existingBundle) {
      return createResponse("error", null, "Bundle not found.")
    }
    if (!existingBundle || existingBundle.userId !== userId) {
      return createResponse("error", null, "Permission denied.")
    }

    if (offerName || price !== undefined) {
      const duplicateBundle = await ctx.runQuery(api.features.bundles.getDuplicateBundle, {
        userId,
        offerName,
        price,
        excludeId: id as Id<"bundles">,
      })

      if (duplicateBundle) {
        if (offerName && duplicateBundle.offerName === offerName) {
          return createResponse(
            "error",
            null,
            `A bundle with the name "${offerName}" already exists. Please choose a different name.`,
          )
        } else {
          return createResponse(
            "error",
            null,
            `A bundle with the price ${price} already exists. Please choose a different price.`,
          )
        }
      }
    }

    const updatedBundle = await ctx.runMutation(api.features.bundles.updateBundle, {
      id: id as Id<"bundles">,
      userId: userId,
      bundlesUSSD: bundlesUSSD,
      duration: duration,
      offerName: offerName,
      price: price,
      status: status,
      isMultiSession: isMultiSession,
      dialingSIM: dialingSIM
    })

    return createResponse("success", null, null)
  } catch (error) {
    console.error("Error updating bundle:", error)
    return createResponse("error", null, "An error occurred while updating the bundle. Please try again later.")
  }
})


// HTTP action to get all transactions by userId
// HTTP action to get all transactions by storeOwnerId
export const getStoreOwnerTransactions = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const storeOwnerId = url.searchParams.get("storeOwnerId");

  if (!storeOwnerId) {
    return createResponse("error", null, "Missing storeOwnerId parameter");
  }

  try {
    // Fetch all transactions for the store owner
    const transactions = await ctx.runQuery(api.features.transactions.getTransactionsByStoreOwnerId, { storeOwnerId });

    return createResponse("success", { transactions }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch transactions");
  }
});


// HTTP action to fetch all users
export const getAllUsers = httpAction(async (ctx, request) => {
  try {
    const users = await ctx.runQuery(api.users.getAllUsers, {});
    return createResponse("success", { users }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch users");
  }
});

// HTTP action to get Store by name
export const getStoreByStoreName = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const storeName = url.searchParams.get("storeName");

  if (!storeName) {
    return createResponse("error", null, "Missing storeName parameter");
  }

  try {
    // Call the correct API function
    const storeData = await ctx.runQuery(api.features.stores.getStoreByStoreName, { 
      storeName 
    });
    
    if (!storeData) {
      return createResponse("error", null, "Store not found");
    }
    
    return createResponse("success", storeData, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch store");
  }
});

// HTTP action to get store by userId
export const getStoreByUserId = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const store = await ctx.runQuery(api.features.stores.getStore, { userId });
    
    if (!store) {
      return createResponse("error", null, "Store not found");
    }
    
    return createResponse("success", { store }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch store");
  }
});

// HTTP action to update a store
export const updateStore = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { 
    userId, 
    storeName, 
    status, 
    statusDescription, 
    paymentAccount, 
    paymentMethod 
  } = body;

  // Validate required fields
  if (!userId || !storeName || !status || !paymentAccount || !paymentMethod) {
    return createResponse("error", null, "Missing required fields");
  }

  // Validate status
  if (!["available", "disabled", "maintenance"].includes(status)) {
    return createResponse("error", null, "Invalid status. Must be 'available', 'disabled', or 'maintenance'");
  }

  // Validate payment method
  if (!["TILL", "PAYBILL"].includes(paymentMethod)) {
    return createResponse("error", null, "Invalid paymentMethod. Must be 'TILL' or 'PAYBILL'");
  }

  try {
    const result = await ctx.runMutation(api.features.stores.updateStore, {
      userId,
      storeName,
      status,
      statusDescription: statusDescription || "",
      paymentAccount,
      paymentMethod
    });

    if (result.status === "error") {
      return createResponse("error", null, result.message);
    }

    return createResponse("success", { message: result.message }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to update store");
  }
});

// HTTP action to delete a store
export const deleteStore = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId } = body;

  if (!userId) {
    return createResponse("error", null, "Missing userId in request body");
  }

  try {
    await ctx.runMutation(api.features.stores.deleteStore, { userId });
    return createResponse("success", { message: "Store deleted successfully" }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to delete store");
  }
});

// HTTP action to create a store
export const createStore = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { 
    userId, 
    storeName, 
    status = "available", 
    statusDescription = "", 
    paymentAccount, 
    paymentMethod 
  } = body;

  if (!userId || !storeName || !paymentAccount || !paymentMethod) {
    return createResponse("error", null, "Missing required fields: userId, storeName, paymentAccount, paymentMethod");
  }

  // Validate status
  if (!["available", "disabled", "maintenance"].includes(status)) {
    return createResponse("error", null, "Invalid status. Must be 'available', 'disabled', or 'maintenance'");
  }

  // Validate payment method
  if (!["TILL", "PAYBILL"].includes(paymentMethod)) {
    return createResponse("error", null, "Invalid paymentMethod. Must be 'TILL' or 'PAYBILL'");
  }

  try {
    const result = await ctx.runMutation(api.features.stores.createStore, {
      userId,
      storeName,
      status,
      statusDescription,
      paymentAccount,
      paymentMethod
    });

    if (result.status === "error") {
      return createResponse("error", null, result.message);
    }

    return createResponse("success", { message: result.message }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to create store");
  }
});

// HTTP action to get all bundles
export const getAllBundles = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const bundles = await ctx.runQuery(api.features.bundles.getAllBundles, { userId });
    return createResponse("success", { bundles }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch bundles");
  }
});

//Tony exposed these two functions on 2025-07-26 to be accessed via HTTP from the Android app
// This function adds a phone number to the blacklist

export const createUserIfNotExists = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { phoneNumber, name, email } = body;

  if (!phoneNumber) {
    return createResponse("error", null, "Missing phoneNumber in request body");
  }

  // Validate phone number format (basic validation)
  if (typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
    return createResponse("error", null, "Invalid phoneNumber format");
  }

  try {
    console.log("createUserIfNotExists HTTP called");
    console.log("phoneNumber:", phoneNumber);
    
    // Call your existing Convex mutation (you'll need to create this)
    const result = await ctx.runMutation(api.users.createUserIfNotExists, {
      phoneNumber,
      name,
      email
    });
    
    return createResponse("success", {
      message: result.message,
      userId: result.userId,
      isNewUser: result.isNewUser
    }, null);
  } catch (error) {
    console.error("Exception in createUserIfNotExists:", error);
    return createResponse("error", null, "Internal server error");
  }
});

// HTTP action to get userId by phone number (for login after OTP verification)
export const getUserIdByPhone = httpAction(async (ctx, request) => {
  console.log("🌐 getUserIdByPhone HTTP ACTION called in handlers.ts");

  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get("phoneNumber");

  console.log("Request URL:", request.url);
  console.log("Extracted phoneNumber:", phoneNumber);

  if (!phoneNumber) {
    console.log("❌ Missing phoneNumber parameter");
    return createResponse("error", null, "Missing phoneNumber parameter");
  }

  // Validate phone number format
  if (typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
    console.log("❌ Invalid phoneNumber format");
    return createResponse("error", null, "Invalid phoneNumber format");
  }

  try {
    console.log("📞 Calling ctx.runQuery with phoneNumber:", phoneNumber);
    // Call your existing Convex query (you'll need to create this)
    const result = await ctx.runQuery(api.users.getUserIdByPhone, {
      phoneNumber
    });

    console.log("=== QUERY RESULT FROM users.ts ===");
    console.log("Raw result:", result);
    console.log("Result type:", typeof result);
    console.log("Result status:", result?.status);
    console.log("=== END QUERY RESULT ===");
    
    if (result && result.status === "success") {
      console.log("✅ Success result:");
      console.log("- userId:", result.userId);
      console.log("- name:", result.name);
      console.log("- email:", result.email);
      console.log("- phoneNumber:", result.phoneNumber);

      const responseData = {
        userId: result.userId,
        name: result.name,
        email: result.email,
        phoneNumber: result.phoneNumber
      };
      
      console.log("=== HTTP RESPONSE DATA ===");
      console.log("Creating response with data:", responseData);
      console.log("ResponseData userId:", responseData.userId);
      console.log("=== END HTTP RESPONSE DATA ===");
      
      return createResponse("success", responseData, null);
    } else {
      console.log("❌ Query returned error status");
      if (result && result.status === "error") {
        console.log("Error message:", result.message);
        return createResponse("error", null, result.message);
      } else {
        console.log("Unknown result structure:", result);
        return createResponse("error", null, "User not found");
      }
    }
  } catch (error) {
    console.error("❌ Exception in getUserIdByPhone HTTP action:", error);
    return createResponse("error", null, "Internal server error");
  }
});


export const testLogging = httpAction(async (ctx, request) => {
  console.log("🚨 TEST LOG - This should appear in Convex console!");
  console.log("🚨 Current timestamp:", new Date().toISOString());
  console.log("🚨 Request URL:", request.url);
  
  return createResponse("success", { 
    message: "Test logging function called",
    timestamp: new Date().toISOString()
  }, null);
});


// HTTP action to create a new mpesa message
export const createMpesaMessage = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, name, amount, phoneNumber, senderId, time } = body;

  if (!userId || !name || amount === undefined || !phoneNumber || !senderId || time === undefined) {
    return createResponse("error", null, "Missing required fields: userId, name, amount, phoneNumber, senderId, time");
  }

  if (typeof amount !== "number") {
    return createResponse("error", null, "Amount must be a number");
  }

  if (typeof time !== "number") {
    return createResponse("error", null, "Time must be a number (timestamp)");
  }

  try {
    await ctx.runMutation(api.features.mpesaMessages.createMpesaMessage, {
      userId,
      name,
      amount,
      phoneNumber,
      senderId,
      time
    });

    return createResponse("success", { message: "Mpesa message created successfully" }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to create mpesa message");
  }
});

// HTTP action to get mpesa messages by userId
export const getMpesaMessagesByUserId = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const messages = await ctx.runQuery(api.features.mpesaMessages.getMpesaMessagesByUserId, { userId });
    return createResponse("success", { messages }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch mpesa messages");
  }
});