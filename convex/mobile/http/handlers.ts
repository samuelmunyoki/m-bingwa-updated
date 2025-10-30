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

    return createResponse("success", null, "Bundle deleted successfully");
  } catch (error: any) {
    console.error(error);
    return createResponse("error", null, error.message);
  }
});

// HTTP Action for toggling Bundle status
export const toggleBundleStatus = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
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

    const result = await ctx.runMutation(api.features.bundles.toggleBundleStatusFromAPI, {
      id: bundleId,
      userId,
    });

    return createResponse("success", { newStatus: result.newStatus }, result.message);
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

  const { 
    userId, 
    offerName, 
    duration, 
    bundlesUSSD, 
    price, 
    commission = 0,
    status, 
    isMultiSession, 
    isSimpleUSSD,
    responseValidatorText = "",
    autoReschedule = "",
    dialingSIM,
    offerType = "Data"
  } = body

  if (
    !userId ||
    !offerName ||
    !duration ||
    !bundlesUSSD ||
    price === undefined ||
    !status ||
    isMultiSession === undefined ||
    isSimpleUSSD === undefined ||
    !dialingSIM ||
    !offerType
  ) {
    return createResponse("error", null, "Missing required fields in request body")
  }

  if (typeof price !== "number") {
    return createResponse("error", null, "Price must be a number")
  }

  if (commission !== undefined && typeof commission !== "number") {
    return createResponse("error", null, "Commission must be a number")
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

  const validOfferTypes = ["Data", "SMS", "Minutes", "Airtime", "Bundles", "Other"];
  if (!validOfferTypes.includes(offerType)) {
    return createResponse(
      "error",
      null,
      "Invalid offerType. Must be one of: Data, SMS, Minutes, Airtime, Bundles, Other"
    );
  }

  if (typeof isMultiSession !== "boolean") {
    return createResponse("error", null, "isMultiSession must be a boolean")
  }

  if (typeof isSimpleUSSD !== "boolean") {
    return createResponse("error", null, "isSimpleUSSD must be a boolean")
  }

  // Validation: Ensure only one of isMultiSession or isSimpleUSSD is true
  if (isMultiSession && isSimpleUSSD) {
    return createResponse(
      "error", 
      null, 
      "Bundle cannot be both Multi-session and Simple USSD. Please select only one option."
    )
  }

  // If isMultiSession is false, responseValidatorText should be empty
  if (!isMultiSession && responseValidatorText && responseValidatorText.trim() !== "") {
    return createResponse(
      "error", 
      null, 
      "Response Validator Text can only be set when Multi-session is enabled."
    )
  }

  // Validate responseValidatorText format if provided
  if (isMultiSession && responseValidatorText && responseValidatorText.trim() !== "") {
    const parts = responseValidatorText.split(",");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      return createResponse(
        "error", 
        null, 
        "Response Validator Text must be in format: 'step,validation_text' (e.g., '3,250Mbs for 24 hours')"
      )
    }
    
    // Validate step is a number
    if (isNaN(parseInt(parts[0].trim()))) {
      return createResponse(
        "error", 
        null, 
        "Validator step must be a valid number."
      )
    }
  }

  // Validate time format if provided (12-hour format)
  if (autoReschedule && autoReschedule.trim() !== "") {
    const timePattern = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(am|pm|AM|PM)$/
    if (!timePattern.test(autoReschedule.trim())) {
      return createResponse("error", null, "autoReschedule must be in 12-hour format (HH:MM am/pm)")
    }
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
      commission,
      status,
      bundlesUSSD,
      isMultiSession,
      isSimpleUSSD,
      responseValidatorText,
      autoReschedule,
      dialingSIM,
      offerType
    })

    return createResponse("success", { bundleId: newBundleId }, "Bundle created successfully")
  } catch (error) {
    console.error("Error creating bundle:", error)
    return createResponse("error", null, "An error occurred while creating the bundle. Please try again later.")
  }
})

// HTTP Action for Bundle update
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

  const { 
    id, 
    userId, 
    offerName, 
    duration, 
    bundlesUSSD, 
    price, 
    commission,
    status, 
    isMultiSession, 
    isSimpleUSSD,
    responseValidatorText,
    autoReschedule,
    dialingSIM,
    offerType
  } = body

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
  if (commission !== undefined && typeof commission !== "number") {
    return createResponse("error", null, "commission must be a number")
  }
  if (dialingSIM !== undefined && dialingSIM !== "SIM1" && dialingSIM !== "SIM2") {
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
  if (isSimpleUSSD !== undefined && typeof isSimpleUSSD !== "boolean") {
    return createResponse("error", null, "isSimpleUSSD must be a boolean")
  }
  if (responseValidatorText !== undefined && typeof responseValidatorText !== "string") {
    return createResponse("error", null, "responseValidatorText must be a string")
  }
  if (autoReschedule !== undefined && typeof autoReschedule !== "string") {
    return createResponse("error", null, "autoReschedule must be a string")
  }
  if (offerType !== undefined) {
    const validOfferTypes = ["Data", "SMS", "Minutes", "Airtime", "Bundles", "Other"];
    if (!validOfferTypes.includes(offerType)) {
      return createResponse(
        "error",
        null,
        "Invalid offerType. Must be one of: Data, SMS, Minutes, Airtime, Bundles, Other"
      );
    }
  }

  // Validate time format if provided (12-hour format)
  if (autoReschedule && autoReschedule.trim() !== "") {
    const timePattern = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(am|pm|AM|PM)$/
    if (!timePattern.test(autoReschedule.trim())) {
      return createResponse("error", null, "autoReschedule must be in 12-hour format (HH:MM am/pm)")
    }
  }

  try {
    const existingBundle = await ctx.runQuery(api.features.bundles.getBundleByBundleID, {
      bundleId: id,
    })
    
    if (!existingBundle) {
      return createResponse("error", null, "Bundle not found.")
    }
    if (existingBundle.userId !== userId) {
      return createResponse("error", null, "Permission denied.")
    }

    // Validation: Ensure only one of isMultiSession or isSimpleUSSD is true
    const finalIsMultiSession = isMultiSession !== undefined ? isMultiSession : existingBundle.isMultiSession;
    const finalIsSimpleUSSD = isSimpleUSSD !== undefined ? isSimpleUSSD : existingBundle.isSimpleUSSD;
    
    if (finalIsMultiSession && finalIsSimpleUSSD) {
      return createResponse(
        "error", 
        null, 
        "Bundle cannot be both Multi-session and Simple USSD. Please select only one option."
      )
    }

    // If isMultiSession is false, responseValidatorText should be empty
    const finalResponseValidatorText = responseValidatorText !== undefined ? responseValidatorText : existingBundle.responseValidatorText;
    if (finalIsMultiSession && finalResponseValidatorText && finalResponseValidatorText.trim() !== "") {
      const parts = finalResponseValidatorText.split(",");
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
        return createResponse(
          "error", 
          null, 
          "Response Validator Text must be in format: 'step,validation_text' (e.g., '3,250Mbs for 24 hours')"
        )
      }
      
      // Validate step is a number
      if (isNaN(parseInt(parts[0].trim()))) {
        return createResponse(
          "error", 
          null, 
          "Validator step must be a valid number."
        )
      }
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

    await ctx.runMutation(api.features.bundles.updateBundle, {
      id: id as Id<"bundles">,
      userId: userId,
      bundlesUSSD: bundlesUSSD,
      duration: duration,
      offerName: offerName,
      price: price,
      commission: commission,
      status: status,
      isMultiSession: finalIsMultiSession,
      isSimpleUSSD: finalIsSimpleUSSD,
      responseValidatorText: finalResponseValidatorText,
      autoReschedule: autoReschedule,
      dialingSIM: dialingSIM,
      offerType: offerType
    })

    return createResponse("success", null, "Bundle updated successfully")
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

// HTTP action to create a store owner transaction
export const createStoreOwnerTransaction = httpAction(async (ctx, request) => {
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
    storeId,
    storeOwnerId,
    bundlesID,
    bundlesPrice,
    payingNumber,
    receivingNumber,
    paymentMethod,
    paymentAccount,
    CheckoutRequestID
  } = body;

  // Validate required fields
  if (!storeId || !storeOwnerId || !bundlesID || bundlesPrice === undefined ||
      !payingNumber || !receivingNumber || !paymentMethod || !paymentAccount || !CheckoutRequestID) {
    return createResponse(
      "error",
      null,
      "Missing required fields: storeId, storeOwnerId, bundlesID, bundlesPrice, payingNumber, receivingNumber, paymentMethod, paymentAccount, CheckoutRequestID"
    );
  }

  // Validate bundlesPrice is a number
  if (typeof bundlesPrice !== "number") {
    return createResponse("error", null, "bundlesPrice must be a number");
  }

  // Validate payment method
  if (!["TILL", "PAYBILL"].includes(paymentMethod)) {
    return createResponse("error", null, "Invalid paymentMethod. Must be 'TILL' or 'PAYBILL'");
  }

  try {
    await ctx.runMutation(api.features.transactions.createBundlesTransaction, {
      storeId,
      storeOwnerId,
      bundlesID,
      bundlesPrice,
      payingNumber,
      receivingNumber,
      paymentMethod,
      paymentAccount,
      CheckoutRequestID
    });

    return createResponse("success", { message: "Transaction created successfully" }, null);
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return createResponse("error", null, error.message || "Failed to create transaction");
  }
});

// HTTP action to update a store owner transaction status
export const updateStoreOwnerTransaction = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { checkoutRequestID, paymentStatus } = body;

  // Validate required fields
  if (!checkoutRequestID || !paymentStatus) {
    return createResponse(
      "error",
      null,
      "Missing required fields: checkoutRequestID, paymentStatus"
    );
  }

  // Validate payment status
  const validStatuses = ["PENDING", "CANCELLED", "TIMEDOUT", "CONFIRMED", "ERRORED"];
  if (!validStatuses.includes(paymentStatus)) {
    return createResponse(
      "error",
      null,
      "Invalid paymentStatus. Must be one of: PENDING, CANCELLED, TIMEDOUT, CONFIRMED, ERRORED"
    );
  }

  try {
    await ctx.runMutation(api.features.transactions.updateTransactionStatus, {
      checkoutRequestID,
      paymentStatus
    });

    return createResponse("success", { message: "Transaction status updated successfully" }, null);
  } catch (error: any) {
    console.error("Error updating transaction status:", error);
    return createResponse("error", null, error.message || "Failed to update transaction status");
  }
});

// HTTP action to delete all store owner transactions
export const deleteAllStoreOwnerTransactions = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const storeOwnerId = url.searchParams.get("storeOwnerId");
  const limitParam = url.searchParams.get("limit");
  
  if (!storeOwnerId) {
    return createResponse("error", null, "Missing storeOwnerId parameter");
  }

  // Parse limit parameter (default to 20 if not provided or invalid)
  let limit = 20;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
      limit = parsedLimit;
    }
  }

  try {
    const result = await ctx.runMutation(api.features.transactions.deleteAllStoreOwnerTransactions, {
      storeOwnerId,
      limit
    });

    return createResponse("success", { 
      message: result.message, 
      deletedCount: result.deletedCount,
      hasMore: result.hasMore,
      totalProcessed: result.totalProcessed
    }, null);
  } catch (error: any) {
    console.error("Error deleting store owner transactions:", error);
    return createResponse("error", null, error.message || "Failed to delete store owner transactions");
  }
});

// HTTP action to get store owner transaction count
export const getStoreOwnerTransactionCount = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const storeOwnerId = url.searchParams.get("storeOwnerId");

  if (!storeOwnerId) {
    return createResponse("error", null, "Missing storeOwnerId parameter");
  }

  try {
    const result = await ctx.runQuery(api.features.transactions.getStoreOwnerTransactionCount, {
      storeOwnerId
    });

    return createResponse("success", result, null);
  } catch (error: any) {
    console.error("Error getting store owner transaction count:", error);
    return createResponse("error", null, error.message || "Failed to get transaction count");
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

  console.log("🏪 getStoreByUserId called");
  console.log("userId:", userId);

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    console.log("Calling api.features.stores.getStore...");
    const store = await ctx.runQuery(api.features.stores.getStore, { userId });
    
    console.log("Store query result:", store);
    console.log("Store is null:", store === null);
    console.log("Store is undefined:", store === undefined);
    
    if (!store) {
      // FIXED: Return null instead of error when no store exists
      console.log("No store found - returning null");
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    console.log("Store found, returning store data");
    console.log("Store details:", {
      _id: store._id,
      storeName: store.storeName,
      storeOwnerId: store.storeOwnerId,
      status: store.status
    });
    
    // Return the store directly, not wrapped in a data object
    return new Response(JSON.stringify(store), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Exception in getStoreByUserId:", error);
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

  // CHANGED: Get userId from query parameter instead of body
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  console.log("🗑️ DELETE STORE called");
  console.log("userId from query:", userId);

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
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

//Tony exposed these two functions on 2025-07-26 to be accessed via HTTP from the Android app
// This function adds a phone number to the blacklist

export const createUserIfNotExists = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    const errorResponse = {
      status: "error",
      message: "Method not allowed",
      userId: null,
      isNewUser: false
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    const errorResponse = {
      status: "error",
      message: "Invalid JSON body",
      userId: null,
      isNewUser: false
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { phoneNumber, name, email } = body;

  if (!phoneNumber) {
    const errorResponse = {
      status: "error",
      message: "Missing phoneNumber in request body",
      userId: null,
      isNewUser: false
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Validate phone number format (basic validation)
  if (typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
    const errorResponse = {
      status: "error",
      message: "Invalid phoneNumber format",
      userId: null,
      isNewUser: false
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    console.log("createUserIfNotExists HTTP called");
    console.log("phoneNumber:", phoneNumber);
    console.log("name:", name);
    console.log("email:", email);
    
    // Call your Convex mutation
    const result = await ctx.runMutation(api.users.createUserIfNotExists, {
      phoneNumber,
      name,
      email
    });
    
    console.log("=== MUTATION RESULT ===");
    console.log("Raw result:", JSON.stringify(result, null, 2));
    console.log("Result status:", result?.status);
    console.log("Result userId:", result?.userId);
    console.log("Result isNewUser:", result?.isNewUser);
    console.log("=== END MUTATION RESULT ===");
    
    // Return the result directly (don't wrap in another data object)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Exception in createUserIfNotExists:", error);
    
    const errorResponse = {
      status: "error",
      message: "Internal server error",
      userId: null,
      isNewUser: false
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
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
    
    // Call your Convex query
    const result = await ctx.runQuery(api.users.getUserIdByPhone, {
      phoneNumber
    });

    console.log("=== QUERY RESULT FROM users.ts ===");
    console.log("Raw result:", JSON.stringify(result, null, 2));
    console.log("Result type:", typeof result);
    console.log("Result status:", result?.status);
    console.log("Result userId:", result?.userId);
    console.log("Result name:", result?.name);
    console.log("Result email:", result?.email);
    console.log("Result phoneNumber:", result?.phoneNumber);
    console.log("=== END QUERY RESULT ===");
    
    if (result && result.status === "success") {
      console.log("✅ Success result from Convex:");
      console.log("- userId:", result.userId);
      console.log("- name:", result.name);
      console.log("- email:", result.email);
      console.log("- phoneNumber:", result.phoneNumber);

      // CRITICAL FIX: Make sure we're extracting the right fields
      const responseData = {
        status: "success",
        userId: result.userId,
        name: result.name,
        email: result.email,
        phoneNumber: result.phoneNumber
      };
      
      console.log("=== HTTP RESPONSE DATA ===");
      console.log("Creating response with data:", JSON.stringify(responseData, null, 2));
      console.log("ResponseData userId:", responseData.userId);
      console.log("=== END HTTP RESPONSE DATA ===");
      
      // Return the full response data, not wrapped in another data object
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    } else {
      console.log("❌ Query returned error status or no result");
      console.log("Result status:", result?.status);
      console.log("Result message:", result?.message);
      
      const errorResponse = {
        status: "error",
        message: result?.message || "User not found",
        userId: null,
        name: null,
        email: null,
        phoneNumber: null
      };
      
      return new Response(JSON.stringify(errorResponse), {
        status: 200, // Still return 200 OK for application-level errors
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
  } catch (error) {
    console.error("❌ Exception in getUserIdByPhone HTTP action:", error);
    
    const errorResponse = {
      status: "error",
      message: "Internal server error",
      userId: null,
      name: null,
      email: null,
      phoneNumber: null
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
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

  const { userId, name, amount, phoneNumber, senderId, time, transactionId, processed } = body;

  if (!userId || !name || amount === undefined || !phoneNumber || !senderId || time === undefined) {
    return createResponse("error", null, "Missing required fields: userId, name, amount, phoneNumber, senderId, time");
  }

  if (typeof amount !== "number") {
    return createResponse("error", null, "Amount must be a number");
  }

  if (typeof time !== "number") {
    return createResponse("error", null, "Time must be a number (timestamp)");
  }

  // Validate processed field if provided
  if (processed && !["pending", "successful", "failed"].includes(processed)) {
    return createResponse("error", null, "Invalid processed status. Must be 'pending', 'successful', or 'failed'");
  }

  try {
    const createdMessage = await ctx.runMutation(api.features.mpesaMessages.createMpesaMessage, {
      userId,
      name,
      amount,
      phoneNumber,
      senderId,
      time,
      transactionId,
      processed: processed || "pending" // Use provided value or default to "pending"
    });

    return createResponse("success", {
      message: "Mpesa message created successfully",
      data: createdMessage
    }, null);
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

// HTTP action to update mpesa message
export const updateMpesaMessage = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { messageId, name, amount, phoneNumber, senderId, time, processed } = body;

  if (!messageId) {
    return createResponse("error", null, "Missing messageId parameter");
  }

  // Validate processed field if provided
  if (processed && !["pending", "successful", "failed"].includes(processed)) {
    return createResponse("error", null, "Invalid processed status. Must be pending, successful, or failed");
  }

  try {
    const updatedMessage = await ctx.runMutation(api.features.mpesaMessages.updateMpesaMessage, {
      messageId,
      name,
      amount,
      phoneNumber,
      senderId,
      time,
      processed
    });
    
    return createResponse("success", { message: updatedMessage }, null);
  } catch (error: any) {
    console.error("Error updating mpesa message:", error);
    return createResponse("error", null, error.message || "Failed to update mpesa message");
  }
});

// HTTP action to update mpesa message processed status
export const updateMpesaMessageProcessedStatus = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { messageId, processed } = body;

  if (!messageId) {
    return createResponse("error", null, "Missing messageId parameter");
  }

  if (!processed || !["pending", "successful", "failed"].includes(processed)) {
    return createResponse("error", null, "Invalid processed status. Must be pending, successful, or failed");
  }

  try {
    const updatedMessage = await ctx.runMutation(api.features.mpesaMessages.updateMpesaMessageProcessedStatus, {
      messageId,
      processed
    });
    
    return createResponse("success", { message: updatedMessage }, null);
  } catch (error: any) {
    console.error("Error updating mpesa message processed status:", error);
    return createResponse("error", null, error.message || "Failed to update mpesa message processed status");
  }
});

// HTTP action to get subscription price
export const getSubscriptionPrice = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return createResponse("error", null, "Method not allowed");
  }

  try {
    // Correct path: features.subscription_price.querySubscriptionPrice
    const price = await ctx.runQuery(api.features.subscription_price.querySubscriptionPrice);
    
    if (!price) {
      return createResponse("error", null, "No subscription price found");
    }
    
    return createResponse("success", { price }, null);
  } catch (error: any) {
    console.error("Error fetching subscription price:", error);
    return createResponse("error", null, error.message || "Failed to fetch subscription price");
  }
});


// HTTP action to update subscription
/**export const updateSubscription = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  // Validate required fields
  if (!body || !body.userId || !body.phoneNumber || !body.amount || !body.subscriptionEnds) {
    return createResponse(
      "error", 
      null, 
      "Missing required fields: userId, phoneNumber, amount, subscriptionEnds"
    );
  }

  // Validate data types
  if (typeof body.subscriptionEnds !== "number") {
    return createResponse("error", null, "subscriptionEnds must be a number (timestamp)");
  }

  if (typeof body.amount !== "string") {
    return createResponse("error", null, "amount must be a string");
  }

  try {
    const { userId, phoneNumber, amount, subscriptionEnds } = body;

    // Call the updateSubscription action
    await ctx.runAction(api.actions.subscriptions.updateSubscription, {
      userId,
      phoneNumber,
      amount,
      subscriptionEnds,
    });

    return createResponse(
      "success", 
      { 
        message: "Subscription update initiated successfully",
        userId,
        subscriptionEnds 
      }, 
      null
    );
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return createResponse("error", null, error.message || "Failed to update subscription");
  }
});**/

export const updateSubscription = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  if (!body || !body.userId || !body.phoneNumber || !body.amount || !body.subscriptionEnds) {
    return createResponse(
      "error", 
      null, 
      "Missing required fields: userId, phoneNumber, amount, subscriptionEnds"
    );
  }

  if (typeof body.subscriptionEnds !== "number") {
    return createResponse("error", null, "subscriptionEnds must be a number (timestamp)");
  }

  if (typeof body.amount !== "string") {
    return createResponse("error", null, "amount must be a string");
  }

  try {
    const { userId, phoneNumber, amount, subscriptionEnds } = body;

    // Call the action and GET the response
    const result = await ctx.runAction(api.actions.subscriptions.updateSubscription, {
      userId,
      phoneNumber,
      amount,
      subscriptionEnds,
    });

    // Check if STK push was successful
    if (result.success) {
      return createResponse(
        "success", 
        { 
          message: result.customerMessage || "STK push sent successfully",
          checkoutRequestID: result.checkoutRequestID,
          merchantRequestID: result.merchantRequestID,
          responseCode: result.responseCode
        }, 
        null
      );
    } else {
      return createResponse(
        "error", 
        null, 
        result.responseDescription || "Failed to initiate STK push"
      );
    }
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return createResponse("error", null, error.message || "Failed to update subscription");
  }
});

export const getUserSubscription = httpAction(async (ctx, request) => {
  console.log("🔍 getUserSubscription HTTP ACTION called");

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  
  // Extract userId from URL path: /api/users/{userId}/subscription/
  let userId = null;
  const userIdIndex = pathParts.indexOf('users') + 1;
  if (userIdIndex > 0 && userIdIndex < pathParts.length) {
    userId = pathParts[userIdIndex];
  }
  
  // Fallback: try to get from query parameters
  if (!userId) {
    userId = url.searchParams.get('userId');
  }

  console.log("Request URL:", request.url);
  console.log("Extracted userId:", userId);

  if (!userId) {
    console.log("❌ Missing userId parameter");
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    console.log("📊 Calling ctx.runAction for subscription status");
    
    // CHANGED: Use runAction instead of runQuery to call your action function
    const result = await ctx.runAction(api.actions.subscriptions.getUserSubscriptionStatusAction, {
      userId
    });

    console.log("=== SUBSCRIPTION ACTION RESULT ===");
    console.log("Raw result:", JSON.stringify(result, null, 2));
    console.log("Result status:", result?.status);
    console.log("Result data:", result?.data);
    console.log("=== END SUBSCRIPTION RESULT ===");
    
    if (result && result.status === "success") {
      console.log("✅ Success result from subscription action");
      console.log("- isSubscribed:", result.data?.isSubscribed);
      console.log("- subscriptionEnds:", result.data?.subscriptionEnds);
      console.log("- remainingDays:", result.data?.remainingDays);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    } else {
      console.log("❌ Action returned error status");
      console.log("Error message:", result?.error);
      
      return new Response(JSON.stringify(result), {
        status: 200, // Still return 200 OK for application-level errors
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
  } catch (error) {
    console.error("❌ Exception in getUserSubscription:", error);
    return createResponse("error", null, "Failed to fetch subscription status");
  }
});

// HTTP action to get user subscription by phone number (alternative method)
export const getUserSubscriptionByPhone = httpAction(async (ctx, request) => {
  console.log("📱 getUserSubscriptionByPhone HTTP ACTION called");

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
    console.log("📞 Calling ctx.runAction for subscription by phone");
    
    // CHANGED: Use runAction instead of runQuery to call your action function
    const result = await ctx.runAction(api.actions.subscriptions.getUserSubscriptionByPhoneAction, {
      phoneNumber
    });

    console.log("=== SUBSCRIPTION BY PHONE ACTION RESULT ===");
    console.log("Raw result:", JSON.stringify(result, null, 2));
    console.log("Result status:", result?.status);
    console.log("Result data:", result?.data);
    console.log("=== END SUBSCRIPTION BY PHONE RESULT ===");
    
    if (result && result.status === "success") {
      console.log("✅ Success result from subscription by phone action");
      console.log("- isSubscribed:", result.data?.isSubscribed);
      console.log("- userId:", result.data?.userId);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    } else {
      console.log("❌ Action returned error status");
      console.log("Error message:", result?.error);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
  } catch (error) {
    console.error("❌ Exception in getUserSubscriptionByPhone:", error);
    return createResponse("error", null, "Failed to fetch subscription status by phone");
  }
});

// HTTP action to handle CORS preflight requests for subscription endpoints
export const handleSubscriptionOptions = httpAction(async (ctx, request) => {
  console.log("🌐 CORS OPTIONS request for subscription endpoints");
  
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
});

// HTTP action to create a new scheduled task
export const createScheduledEvent = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only POST is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "POST",
        },
      }
    );
  }

  try {
    const { 
      ussdCode, 
      userId, 
      repeatDays, 
      status, 
      scheduledTimeStamp, 
      repeatDaily, 
      messageId,
      offerId,
      offerName,
      offerDuration,
      offerPrice,
      offerNum
    } = await request.json();

    const result = await ctx.runMutation(api.features.scheduled_events.createScheduledEvent, {
      ussdCode,
      userId,
      repeatDays,
      status,
      scheduledTimeStamp,
      repeatDaily,
      messageId,
      offerId,
      offerName,
      offerDuration,
      offerPrice,
      offerNum
    });

    // Format response to match what Android expects
    return new Response(JSON.stringify({
      status: result.status,
      message: result.message,
      data: result.data ? [result.data] : null  // Wrap in array
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error creating scheduled event:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to create scheduled event",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// HTTP action to get all scheduled events by userId
export const getScheduledEvents = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only GET is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "GET",
        },
      }
    );
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "userId parameter is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const events = await ctx.runQuery(api.features.scheduled_events.getScheduledEvents, {
      userId,
    });

    return new Response(JSON.stringify({
      status: "success",
      data: events,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error getting scheduled events:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to get scheduled events",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// HTTP action to get pending scheduled events by userId
export const getPendingScheduledEvents = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only GET is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "GET",
        },
      }
    );
  }

  try {
    const events = await ctx.runQuery(api.features.scheduled_events.getPendingScheduledEvents, {});

    return new Response(JSON.stringify({
      status: "success",
      data: events,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error getting pending scheduled events:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to get pending scheduled events",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// HTTP action to get scheduled events by message ID
export const getScheduledEventsByMessageID = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only GET is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "GET",
        },
      }
    );
  }

  try {
    const url = new URL(request.url);
    const messageId = url.searchParams.get("messageId");

    if (!messageId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "messageId parameter is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const event = await ctx.runQuery(api.features.scheduled_events.getScheduledEventsByMessageID, {
      messageId,
    });

    return new Response(JSON.stringify({
      status: "success",
      data: event,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error getting scheduled event by message ID:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to get scheduled event by message ID",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// HTTP action to handle update event status
export const updateEventStatus = httpAction(async (ctx, request) => {
  if (request.method !== "PUT") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only PUT is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "PUT",
        },
      }
    );
  }

  try {
    const { id, status, messageId } = await request.json();

    if (!id || !status) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "id and status are required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    await ctx.runMutation(api.features.scheduled_events.updateEventStatus, {
      id,
      status,
      messageId,
    });

    return new Response(JSON.stringify({
      status: "success",
      message: "Event status updated successfully",
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error updating event status:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to update event status",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

export const updateScheduledEvent = httpAction(async (ctx, request) => {
  if (request.method !== "PUT") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only PUT is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "PUT",
        },
      }
    );
  }

  try {
    const { 
      id, 
      status, 
      messageId, 
      userId,
      ussdCode,
      isDynamicUSSD,
      scheduleTime,
      isRepetitive,
      repeatDays,
      offerId,
      offerName,
      offerDuration,
      offerPrice,
      offerNum
    } = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "id is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const result = await ctx.runMutation(api.features.scheduled_events.updateScheduledEvent, {
      id,
      status,
      messageId,
      userId,
      ussdCode,
      isDynamicUSSD,
      scheduleTime,
      isRepetitive,
      repeatDays,
      offerId,
      offerName,
      offerDuration,
      offerPrice,
      offerNum
    });

    return new Response(JSON.stringify({
      status: result.status,
      message: result.message,
    }), {
      status: result.status === "success" ? 200 : 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error updating scheduled event:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to update scheduled event",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// HTTP action to check scheduled events
export const checkScheduledEvents = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only GET is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "GET",
        },
      }
    );
  }

  try {
    await ctx.runMutation(api.features.scheduled_events.checkScheduledEvents, {});

    return new Response(JSON.stringify({
      status: "success",
      message: "Scheduled events checked successfully",
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error checking scheduled events:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to check scheduled events",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// HTTP ation to delete a scheduled event
export const deleteScheduledEvent = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Only DELETE is supported.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "DELETE",
        },
      }
    );
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "id parameter is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const result = await ctx.runMutation(api.features.scheduled_events.deleteScheduledEvent, {
      id: id as Id<"scheduled_events">,
    });

    console.log("Mutation result:", result);

    return new Response(JSON.stringify({
    status: "success",
    message: "Scheduled event deleted successfully",
    data: null,
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
  } catch (error) {
    console.error("Error deleting scheduled event:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to delete scheduled event",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// HTTP action for debugging phone number
export const debugPhoneTest = httpAction(async (ctx, request) => {
  console.log("🐛 Debug phone test called");
  
  try {
    const result = await ctx.runQuery(api.users.debugPhoneNumber0706021479);
    
    console.log("Debug result:", result);
    
    return createResponse("success", result, null);
  } catch (error) {
    console.error("Debug error:", error);
    return createResponse("error", null, "Debug failed");
  }
});

// HTTP action to create or update user-sender relation
export const createOrUpdateUserSenderRelation = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, senderId, lastUpdateTimeStamp } = body;

  if (!userId || !senderId || lastUpdateTimeStamp === undefined) {
    return createResponse("error", null, "Missing required fields: userId, senderId, lastUpdateTimeStamp");
  }

  if (typeof lastUpdateTimeStamp !== "number") {
    return createResponse("error", null, "lastUpdateTimeStamp must be a number (timestamp)");
  }

  try {
    const relationId = await ctx.runMutation(api.features.userSenderRelations.createOrUpdateUserSenderRelation, {
      userId,
      senderId,
      lastUpdateTimeStamp
    });

    return createResponse("success", { 
      message: "User-sender relation created/updated successfully", 
      relationId 
    }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to create/update user-sender relation");
  }
});

// HTTP action to get user-sender relations by userId
export const getUserSenderRelationsByUserId = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const relations = await ctx.runQuery(api.features.userSenderRelations.getUserSenderRelationsByUserId, { userId });
    return createResponse("success", { relations }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to fetch user-sender relations");
  }
});

// HTTP action to update lastUpdateTimeStamp for a user-sender relation
export const updateLastUpdateTimeStamp = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, senderId, lastUpdateTimeStamp } = body;

  if (!userId || !senderId || lastUpdateTimeStamp === undefined) {
    return createResponse("error", null, "Missing required fields: userId, senderId, lastUpdateTimeStamp");
  }

  if (typeof lastUpdateTimeStamp !== "number") {
    return createResponse("error", null, "lastUpdateTimeStamp must be a number (timestamp)");
  }

  try {
    // Use createOrUpdateUserSenderRelation which handles both create and update cases
    const relationId = await ctx.runMutation(api.features.userSenderRelations.createOrUpdateUserSenderRelation, {
      userId,
      senderId,
      lastUpdateTimeStamp
    });

    return createResponse("success", { 
      message: "LastUpdateTimeStamp updated/created successfully", 
      relationId 
    }, null);
  } catch (error: any) {
    console.error(error);
    return createResponse("error", null, error.message || "Failed to update/create lastUpdateTimeStamp");
  }
});

// HTTP action to delete user-sender relation
export const deleteUserSenderRelation = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, senderId } = body;

  if (!userId || !senderId) {
    return createResponse("error", null, "Missing required fields: userId, senderId");
  }

  try {
    const result = await ctx.runMutation(api.features.userSenderRelations.deleteUserSenderRelation, {
      userId,
      senderId
    });

    return createResponse("success", { message: result.message }, null);
  } catch (error: any) {
    console.error(error);
    return createResponse("error", null, error.message || "Failed to delete user-sender relation");
  }
});

// HTTP action to delete all mpesa messages for a specific user
export const deleteAllMpesaMessages = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const result = await ctx.runMutation(api.features.mpesaMessages.deleteAllMpesaMessages, { userId });

    return createResponse("success", {
      message: result.message,
      deletedCount: result.deletedCount,
      userId: result.userId
    }, null);
  } catch (error) {
    console.error(error);
    return createResponse("error", null, "Failed to delete mpesa messages for user");
  }
});