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

  const { userId, name, amount, phoneNumber, senderId, time, transactionId, processed, fullMessage, processResponse, offerName, processedUSSD } = body;

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
  if (processed && !["pending", "successful", "failed", "not-viable"].includes(processed)) {
    return createResponse("error", null, "Invalid processed status. Must be 'pending', 'successful', 'failed', or 'not-viable'");
  }

  // Validate optional string fields
  if (fullMessage && typeof fullMessage !== "string") {
    return createResponse("error", null, "fullMessage must be a string");
  }

  if (processResponse && typeof processResponse !== "string") {
    return createResponse("error", null, "processResponse must be a string");
  }

  if (offerName && typeof offerName !== "string") {
    return createResponse("error", null, "offerName must be a string");
  }

  if (processedUSSD && typeof processedUSSD !== "string") {
    return createResponse("error", null, "processedUSSD must be a string");
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
      processed: processed || "pending", // Use provided value or default to "pending"
      fullMessage,
      processResponse,
      offerName,
      processedUSSD
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

  const { messageId, name, amount, phoneNumber, senderId, time, processed, fullMessage, processResponse, offerName, processedUSSD ,verified} = body;

  if (!messageId) {
    return createResponse("error", null, "Missing messageId parameter");
  }

  // Validate processed field if provided
  if (processed && !["pending", "successful", "failed", "not-viable", "disabled"].includes(processed)) {
    return createResponse("error", null, "Invalid processed status. Must be 'pending', 'successful', 'failed', 'not-viable', or 'disabled'");
  }

  // Validate optional string fields
  if (fullMessage !== undefined && typeof fullMessage !== "string") {
    return createResponse("error", null, "fullMessage must be a string");
  }

  if (processResponse !== undefined && typeof processResponse !== "string") {
    return createResponse("error", null, "processResponse must be a string");
  }

  if (offerName !== undefined && typeof offerName !== "string") {
    return createResponse("error", null, "offerName must be a string");
  }

  if (processedUSSD !== undefined && typeof processedUSSD !== "string") {
    return createResponse("error", null, "processedUSSD must be a string");
  }

  if (verified !== undefined && typeof verified !== "boolean") {
    return createResponse("error", null, "verified must be a boolean");
  }
  try {
    const updatedMessage = await ctx.runMutation(api.features.mpesaMessages.updateMpesaMessage, {
      messageId,
      name,
      amount,
      phoneNumber,
      senderId,
      time,
      processed,
      fullMessage,
      processResponse,
      offerName,
      processedUSSD,
      verified
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

  const { messageId, processed, processResponse, offerName, processedUSSD } = body;

  if (!messageId) {
    return createResponse("error", null, "Missing messageId parameter");
  }

  if (!processed || !["pending", "successful", "failed", "not-viable", "disabled"].includes(processed)) {
    return createResponse("error", null, "Invalid processed status. Must be 'pending', 'successful', 'failed', 'not-viable', or 'disabled'");
  }

  try {
    // Prepare mutation arguments
    const mutationArgs: any = {
      messageId,
      processed
    };
    
    // Add processResponse if provided
    if (processResponse !== undefined) {
      mutationArgs.processResponse = processResponse;
    }
    
    // Add offerName if provided
    if (offerName !== undefined) {
      mutationArgs.offerName = offerName;
    }
    
    // Add processedUSSD if provided
    if (processedUSSD !== undefined) {
      mutationArgs.processedUSSD = processedUSSD;
    }
    
    const updatedMessage = await ctx.runMutation(api.features.mpesaMessages.updateMpesaMessageProcessedStatus, mutationArgs);
    
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
      offerNum,
      dialingSim,
      isMultiSession,
      isSimpleUSSD,
      responseValidatorText
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
      offerNum,
      dialingSim,
      isMultiSession,
      isSimpleUSSD,
      responseValidatorText
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
      offerNum,
      dialingSim,
      isMultiSession,
      isSimpleUSSD,
      responseValidatorText
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
      offerNum,
      dialingSim,
      isMultiSession,
      isSimpleUSSD,
      responseValidatorText
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

// HTTP action to delete mpesa message by ID
export const deleteMpesaMessage = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { messageId } = body;

  if (!messageId) {
    return createResponse("error", null, "Missing messageId parameter");
  }

  try {
    // First check if the message exists
    const message = await ctx.runQuery(api.features.mpesaMessages.getMpesaMessageById, {
      messageId
    });

    if (!message) {
      return createResponse("error", null, "Message not found");
    }

    // Delete the message
    await ctx.runMutation(api.features.mpesaMessages.deleteMpesaMessage, {
      messageId
    });

    return createResponse("success", {
      message: "Mpesa message deleted successfully",
      deletedMessageId: messageId
    }, null);
  } catch (error: any) {
    console.error("Error deleting mpesa message:", error);
    return createResponse("error", null, error.message || "Failed to delete mpesa message");
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

// HTTP action to run migration for mpesa messages
export const migrateMpesaMessages = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  try {
    const result = await ctx.runMutation(api.features.mpesaMessages.migrateMpesaMessagesAddNewFields);
    
    return createResponse("success", {
      message: result.message,
      totalMessages: result.totalMessages,
      updatedMessages: result.updatedMessages
    }, null);
  } catch (error) {
    console.error("Migration error:", error);
    return createResponse("error", null, "Failed to run migration");
  }
});

// HTTP action to get user by phone number (with normalization to handle any format)
export const getUserByPhoneNormalized = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get("phoneNumber");

  console.log("📱 getUserByPhoneNormalized HTTP ACTION called");
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

    // Call the Convex query
    const result = await ctx.runQuery(api.users.getUserByPhoneNormalized, {
      phoneNumber
    });

    console.log("=== QUERY RESULT ===");
    console.log("Raw result:", JSON.stringify(result, null, 2));
    console.log("Result status:", result?.status);
    console.log("=== END QUERY RESULT ===");

    if (result && result.status === "success") {
      console.log("✅ Success result:");
      console.log("- userId:", result.userId);
      console.log("- name:", result.name);
      console.log("- phoneNumber:", result.phoneNumber);

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
      console.log("❌ Query returned error status or no result");
      console.log("Result message:", result?.message);

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
    console.error("❌ Exception in getUserByPhoneNormalized:", error);

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

// HTTP action to delete all mpesa messages for a specific phone number
// This endpoint: 1) Gets userId by phone number, 2) Deletes all mpesa messages for that userId
export const deleteMpesaMessagesByPhoneNumber = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get("phoneNumber");

  if (!phoneNumber) {
    return createResponse("error", null, "Missing phoneNumber parameter");
  }

  // Validate phone number format
  if (typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
    return createResponse("error", null, "Invalid phoneNumber format");
  }

  console.log("🗑️ Deleting mpesa messages by phone number:");
  console.log("  phoneNumber:", phoneNumber);

  try {
    // Step 1: Get user by phone number (with normalization)
    console.log("Step 1: Looking up user by phone number...");
    const userResult = await ctx.runQuery(api.users.getUserByPhoneNormalized, {
      phoneNumber
    });

    if (!userResult || userResult.status !== "success" || !userResult.userId) {
      console.log("❌ User not found for phone number:", phoneNumber);
      return createResponse("error", null, `No user found with phone number: ${phoneNumber}`);
    }

    const userId = userResult.userId;
    console.log("✅ User found:");
    console.log("  userId:", userId);
    console.log("  name:", userResult.name);
    console.log("  phoneNumber:", userResult.phoneNumber);

    // Step 2: Delete all mpesa messages for this userId
    console.log("Step 2: Deleting all mpesa messages for userId:", userId);
    const deleteResult = await ctx.runMutation(api.features.mpesaMessages.deleteAllMpesaMessages, {
      userId
    });

    console.log("✅ Deletion result:");
    console.log("  deletedCount:", deleteResult.deletedCount);
    console.log("  message:", deleteResult.message);

    return createResponse("success", {
      message: `Successfully deleted ${deleteResult.deletedCount} mpesa messages for phone number ${phoneNumber}`,
      deletedCount: deleteResult.deletedCount,
      phoneNumber: phoneNumber,
      userId: userId,
      userName: userResult.name
    }, null);
  } catch (error) {
    console.error("❌ Error deleting mpesa messages:", error);
    return createResponse("error", null, "Failed to delete mpesa messages for phone number");
  }
});

/**
 * Create a new promo code
 * POST /api/promo-codes/create/
 */
export const createPromoCode = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { promoCode, validDays, description, endDate, maxUsages } = body;

  // Validate required fields
  if (!promoCode || typeof promoCode !== "string") {
    return createResponse("error", null, "Missing or invalid promoCode");
  }

  if (!validDays || typeof validDays !== "number") {
    return createResponse("error", null, "Missing or invalid validDays");
  }

  try {
    const result = await ctx.runMutation(api.features.promo_codes.createPromoCode, {
      promoCode,
      validDays,
      description: description || undefined,
      endDate: endDate || undefined,
      maxUsages: maxUsages || undefined,
    });

    return createResponse("success", result, null);
  } catch (error: any) {
    console.error("Error creating promo code:", error);
    return createResponse("error", null, error.message || "Failed to create promo code");
  }
});

/**
 * Validate promo code
 * GET /api/promo-codes/validate?code={CODE}&userId={USER_ID}
 */
export const validatePromoCode = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const promoCode = url.searchParams.get("code");
  const userId = url.searchParams.get("userId");

  if (!promoCode || !userId) {
    return createResponse("error", null, "Missing promoCode or userId parameter");
  }

  try {
    const result = await ctx.runQuery(api.features.promo_codes.validatePromoCode, {
      promoCode,
      userId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: any) {
    console.error("Error validating promo code:", error);
    return createResponse("error", null, error.message || "Failed to validate promo code");
  }
});

/**
 * Get all promo codes
 * GET /api/promo-codes/all
 */
export const getAllPromoCodes = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return createResponse("error", null, "Method not allowed");
  }

  try {
    const promoCodes = await ctx.runQuery(api.features.promo_codes.getAllPromoCodes, {});

    return createResponse("success", { promoCodes }, null);
  } catch (error: any) {
    console.error("Error fetching promo codes:", error);
    return createResponse("error", null, error.message || "Failed to fetch promo codes");
  }
});

/**
 * Get promo code by code
 * GET /api/promo-codes/get?code={CODE}
 */
export const getPromoCodeByCode = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const promoCode = url.searchParams.get("code");

  if (!promoCode) {
    return createResponse("error", null, "Missing promo code parameter");
  }

  try {
    const promo = await ctx.runQuery(api.features.promo_codes.getPromoCodeByCode, {
      promoCode: promoCode.toUpperCase(),
    });

    if (!promo) {
      return createResponse("error", null, "Promo code not found");
    }

    return createResponse("success", { promoCode: promo }, null);
  } catch (error: any) {
    console.error("Error fetching promo code:", error);
    return createResponse("error", null, error.message || "Failed to fetch promo code");
  }
});

/**
 * Get promo code usage statistics
 * GET /api/promo-codes/stats?code={CODE} (optional code parameter)
 */
export const getPromoCodeStats = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const promoCode = url.searchParams.get("code");

  try {
    const stats = await ctx.runQuery(api.features.promo_codes.getPromoCodeStats, {
      promoCode: promoCode?.toUpperCase() || undefined,
    });

    return createResponse("success", { stats }, null);
  } catch (error: any) {
    console.error("Error fetching promo stats:", error);
    return createResponse("error", null, error.message || "Failed to fetch stats");
  }
});

/**
 * Create airtime transaction
 * POST /api/airtime-transactions
 */
export const createAirtimeTransaction = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const requiredFields = [
    "userId",
    "phoneNumber",
    "recipientNumber",
    "amount",
    "ussdCode",
    "ussdResponse",
    "status",
    "subscriptionEnds",
    "subscriptionDays",
    "paidDays",
    "simSlot",
  ];

  for (const field of requiredFields) {
    if (!body[field] && body[field] !== 0) {
      return new Response(
        JSON.stringify({ 
          status: "error", 
          error: `Missing required field: ${field}` 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    const result = await ctx.runMutation(
      api.features.airtime_transactions.createAirtimeTransaction,
      body
    );

    // If promo code was used and transaction is successful, record it
    if (body.status === "SUCCESS" && body.promoCode) {
      await ctx.runMutation(api.features.promo_codes.recordPromoCodeUsage, {
        userId: body.userId,
        promoCode: body.promoCode,
        subscriptionExtended: body.promoDays || 0,
        subscriptionEnds: body.subscriptionEnds,
      });
    }

    return new Response(
      JSON.stringify({
        status: "success",
        transactionId: result.transactionId,
        message: result.message,
        error: null
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error creating airtime transaction:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "Failed to create transaction"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});


/**
 * Get user airtime transactions
 * GET /api/users/{userId}/airtime-transactions
 */
export const getUserAirtimeTransactions = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return createResponse("error", null, "Method not allowed");
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");

  let userId = null;
  const userIdIndex = pathParts.indexOf("users") + 1;
  if (userIdIndex > 0 && userIdIndex < pathParts.length) {
    userId = pathParts[userIdIndex];
  }

  if (!userId) {
    userId = url.searchParams.get("userId");
  }

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const transactions = await ctx.runQuery(
      api.features.airtime_transactions.getUserAirtimeTransactions,
      { userId }
    );

    return createResponse("success", { transactions }, null);
  } catch (error: any) {
    console.error("Error fetching airtime transactions:", error);
    return createResponse("error", null, error.message || "Failed to fetch transactions");
  }
});

/**
 * CORS preflight handler
 */
export const handleCorsOptions = httpAction(async (ctx, request) => {
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

/**
 * CORS preflight handler for promo codes
 */
export const handlePromoCodeOptions = httpAction(async (ctx, request) => {
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

/**
 * CORS preflight handler for airtime transactions
 */
export const handleAirtimeTransactionOptions = httpAction(async (ctx, request) => {
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


/**
 * Record promo code usage after successful payment
 * POST /api/promo-codes/record-usage/
 * */
export const recordPromoCodeUsage = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, promoCode, subscriptionExtended, subscriptionEnds } = body;

  // Validate required fields
  if (!userId || typeof userId !== "string") {
    return createResponse("error", null, "Missing or invalid userId");
  }

  if (!promoCode || typeof promoCode !== "string") {
    return createResponse("error", null, "Missing or invalid promoCode");
  }

  if (subscriptionExtended === undefined || typeof subscriptionExtended !== "number") {
    return createResponse("error", null, "Missing or invalid subscriptionExtended");
  }

  if (subscriptionEnds === undefined || typeof subscriptionEnds !== "number") {
    return createResponse("error", null, "Missing or invalid subscriptionEnds");
  }

  try {
    const result = await ctx.runMutation(api.features.promo_codes.recordPromoCodeUsage, {
      userId,
      promoCode,
      subscriptionExtended,
      subscriptionEnds,
    });

    return createResponse("success", result, null);
  } catch (error: any) {
    console.error("Error recording promo code usage:", error);
    return createResponse("error", null, error.message || "Failed to record promo code usage");
  }
});


/**
 * Apply promo code standalone (no payment)
 * POST /api/promo-codes/apply-standalone/
 */
export const applyPromoCodeStandalone = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { userId, promoCode } = body;

  if (!userId || !promoCode) {
    return new Response(
      JSON.stringify({ 
        status: "error", 
        error: "Missing required fields: userId, promoCode" 
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await ctx.runMutation(
      api.features.promo_codes.applyPromoCodeStandalone,
      { userId, promoCode }
    );

    return new Response(
      JSON.stringify(result),
      {
        status: result.status === "success" ? 200 : 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error applying standalone promo code:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "Failed to apply promo code"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});


/** 
 * Register Device Session
 * POST /api/register-device-session
  */
export const registerDeviceSession = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { phoneNumber, deviceId, deviceModel, userId } = body;

  // Validate required fields
  if (!phoneNumber || !deviceId || !deviceModel || !userId) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Missing required fields: phoneNumber, deviceId, deviceModel, userId",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await ctx.runMutation(
      api.users.registerDeviceSession,
      {
        phoneNumber,
        deviceId,
        deviceModel,
        userId,
      }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error registering device session:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "Failed to register device session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * HTTP ACTION 2: Validate Device Session
 * POST /api/validate-device-session
 */
export const validateDeviceSession = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { phoneNumber, deviceId } = body;

  // Validate required fields
  if (!phoneNumber || !deviceId) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Missing required fields: phoneNumber, deviceId",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await ctx.runMutation(
      api.users.validateDeviceSession,
      {
        phoneNumber,
        deviceId,
      }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error validating device session:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "Failed to validate device session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * HTTP ACTION 3: Logout Device
 * POST /api/logout-device
 */
export const logoutDevice = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { phoneNumber, deviceId } = body;

  // Validate required fields
  if (!phoneNumber || !deviceId) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Missing required fields: phoneNumber, deviceId",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await ctx.runMutation(api.users.logoutDevice, {
      phoneNumber,
      deviceId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error logging out device:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "Failed to logout device",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

export const clearDeviceSession = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { phoneNumber } = body;

  // Validate required fields
  if (!phoneNumber) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: "Missing required field: phoneNumber",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await ctx.runMutation(api.users.clearDeviceSession, {
      phoneNumber,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error clearing device session:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "Failed to clear device session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});




// ============= BRIDGE OFFERS HTTP ACTIONS =============

export const createBridgeOffer = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, phoneNumber, name, type, price } = body;

  if (!userId || !phoneNumber || !name || !type || price === undefined) {
    return createResponse("error", null, "Missing required fields");
  }

  const validTypes = ["Data", "SMS", "Minutes"];
  if (!validTypes.includes(type)) {
    return createResponse("error", null, "Invalid offer type");
  }

  if (typeof price !== "number" || price <= 0) {
    return createResponse("error", null, "Invalid price");
  }

  try {
    const offerId = await ctx.runMutation(api.features.bridge.createBridgeOffer, {
      userId,
      phoneNumber,
      name,
      type,
      price
    });

    return createResponse("success", { offerId }, "Offer created successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getBridgeOffers = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const offers = await ctx.runQuery(api.features.bridge.getBridgeOffers, { userId });
    return createResponse("success", { offers }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const updateBridgeOffer = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { offerId, userId, name, type, price } = body;

  if (!offerId || !userId) {
    return createResponse("error", null, "Missing offerId or userId");
  }

  try {
    await ctx.runMutation(api.features.bridge.updateBridgeOffer, {
      offerId: offerId as Id<"bridgeOffers">,
      userId,
      name,
      type,
      price
    });

    return createResponse("success", null, "Offer updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const deleteBridgeOffer = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { offerId, userId } = body;

  if (!offerId || !userId) {
    return createResponse("error", null, "Missing offerId or userId");
  }

  try {
    await ctx.runMutation(api.features.bridge.deleteBridgeOffer, {
      offerId: offerId as Id<"bridgeOffers">,
      userId
    });

    return createResponse("success", null, "Offer deleted successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

// ============= BRIDGE DEVICES HTTP ACTIONS =============

export const createBridgeDevice = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, phoneNumber, deviceName, devicePhoneNumber, selectedOfferIds } = body;

  if (!userId || !phoneNumber || !deviceName || !devicePhoneNumber || !selectedOfferIds) {
    return createResponse("error", null, "Missing required fields");
  }

  try {
    const deviceId = await ctx.runMutation(api.features.bridge.createBridgeDevice, {
      userId,
      phoneNumber,
      deviceName,
      devicePhoneNumber,
      selectedOfferIds
    });

    return createResponse("success", { deviceId }, "Device created successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getBridgeDevices = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const devices = await ctx.runQuery(api.features.bridge.getBridgeDevices, { userId });
    return createResponse("success", { devices }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const updateBridgeDevice = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { deviceId, userId, deviceName, devicePhoneNumber, selectedOfferIds } = body;

  if (!deviceId || !userId) {
    return createResponse("error", null, "Missing deviceId or userId");
  }

  try {
    await ctx.runMutation(api.features.bridge.updateBridgeDevice, {
      deviceId: deviceId as Id<"bridgeDevices">,
      userId,
      deviceName,
      devicePhoneNumber,
      selectedOfferIds
    });

    return createResponse("success", null, "Device updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const updateDeviceOffers = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { deviceId, userId, selectedOfferIds } = body;

  if (!deviceId || !userId || !selectedOfferIds) {
    return createResponse("error", null, "Missing required fields");
  }

  try {
    await ctx.runMutation(api.features.bridge.updateDeviceOffers, {
      deviceId: deviceId as Id<"bridgeDevices">,
      userId,
      selectedOfferIds
    });

    return createResponse("success", null, "Device offers updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const deleteBridgeDevice = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { deviceId, userId } = body;

  if (!deviceId || !userId) {
    return createResponse("error", null, "Missing deviceId or userId");
  }

  try {
    await ctx.runMutation(api.features.bridge.deleteBridgeDevice, {
      deviceId: deviceId as Id<"bridgeDevices">,
      userId
    });

    return createResponse("success", null, "Device deleted successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

// ============= BRIDGE WHITELIST HTTP ACTIONS =============

export const addToWhitelist = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, phoneNumber, whitelistedNumber } = body;

  if (!userId || !phoneNumber || !whitelistedNumber) {
    return createResponse("error", null, "Missing required fields");
  }

  try {
    const id = await ctx.runMutation(api.features.bridge.addToWhitelist, {
      userId,
      phoneNumber,
      whitelistedNumber
    });

    return createResponse("success", { id }, "Number whitelisted successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getWhitelist = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get("phoneNumber");

  if (!phoneNumber) {
    return createResponse("error", null, "Missing phoneNumber parameter");
  }

  try {
    const whitelist = await ctx.runQuery(api.features.bridge.getWhitelist, { phoneNumber });
    return createResponse("success", { whitelist }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const isWhitelisted = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const receiverPhone = url.searchParams.get("receiver");
  const senderPhone = url.searchParams.get("sender");

  if (!receiverPhone || !senderPhone) {
    return createResponse("error", null, "Missing receiver or sender parameter");
  }

  try {
    const isWhitelisted = await ctx.runQuery(api.features.bridge.isWhitelisted, {
      receiverPhone,
      senderPhone
    });

    return createResponse("success", { isWhitelisted }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const removeFromWhitelist = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { phoneNumber, whitelistedNumber } = body;

  if (!phoneNumber || !whitelistedNumber) {
    return createResponse("error", null, "Missing phoneNumber or whitelistedNumber");
  }

  try {
    await ctx.runMutation(api.features.bridge.removeFromWhitelist, {
      phoneNumber,
      whitelistedNumber
    });

    return createResponse("success", null, "Number removed from whitelist");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

// ============= BRIDGE TRANSACTIONS HTTP ACTIONS =============

export const createBridgeTransaction = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { id, userId, phoneNumber, deviceId, offerId, status, smsContent } = body; 

  if (!id || !userId || !phoneNumber || !deviceId || !offerId || !status) {  
    return createResponse("error", null, "Missing required fields");
  }

  const validStatuses = ["Success", "Failed", "Pending"];
  if (!validStatuses.includes(status)) {
    return createResponse("error", null, "Invalid status");
  }

  try {
    const transactionId = await ctx.runMutation(api.features.bridge.createBridgeTransaction, {
      id,  
      userId,
      phoneNumber,
      deviceId,
      offerId,
      status,
      smsContent
    });

    return createResponse("success", { transactionId }, "Transaction created successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getBridgeTransactions = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const deviceId = url.searchParams.get("deviceId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const transactions = await ctx.runQuery(api.features.bridge.getBridgeTransactions, {
      userId,
      deviceId: deviceId || undefined
    });

    return createResponse("success", { transactions }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const updateTransactionStatus = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { transactionId, status } = body;

  if (!transactionId || !status) {
    return createResponse("error", null, "Missing transactionId or status");
  }

  const validStatuses = ["Success", "Failed", "Pending"];
  if (!validStatuses.includes(status)) {
    return createResponse("error", null, "Invalid status");
  }

  try {
    await ctx.runMutation(api.features.bridge.updateTransactionStatus, {
      transactionId: transactionId as Id<"bridgeTransactions">,
      status
    });

    return createResponse("success", null, "Transaction status updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getTransactionStatusCounts = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const counts = await ctx.runQuery(api.features.bridge.getTransactionStatusCounts, { userId });
    return createResponse("success", { counts }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});



export const deleteBridgeTransaction = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { transactionId, userId } = body;

  if (!transactionId || !userId) {
    return createResponse("error", null, "Missing transactionId or userId");
  }

  try {
    await ctx.runMutation(api.features.bridge.deleteBridgeTransaction, {
      transactionId: transactionId as Id<"bridgeTransactions">,
      userId
    });

    return createResponse("success", null, "Transaction deleted successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const deleteAllTransactionsForDevice = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { deviceId, userId } = body;

  if (!deviceId || !userId) {
    return createResponse("error", null, "Missing deviceId or userId");
  }

  try {
    const result = await ctx.runMutation(api.features.bridge.deleteAllTransactionsForDevice, {
      deviceId,
      userId
    });

    return createResponse("success", { deletedCount: result.deletedCount }, `Deleted ${result.deletedCount} transactions successfully`);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});


export const createOnlineBridgeOffer = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, phoneNumber, name, type, price } = body;

  if (!userId || !phoneNumber || !name || !type || price === undefined) {
    return createResponse("error", null, "Missing required fields");
  }

  const validTypes = ["Data", "SMS", "Minutes"];
  if (!validTypes.includes(type)) {
    return createResponse("error", null, "Invalid offer type");
  }

  if (typeof price !== "number" || price <= 0) {
    return createResponse("error", null, "Invalid price");
  }

  try {
    const offerId = await ctx.runMutation(api.features.onlineBridge.createOnlineBridgeOffer, {
      userId,
      phoneNumber,
      name,
      type,
      price
    });

    return createResponse("success", { offerId }, "Offer created successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getOnlineBridgeOffers = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const offers = await ctx.runQuery(api.features.onlineBridge.getOnlineBridgeOffers, { userId });
    return createResponse("success", { offers }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const updateOnlineBridgeOffer = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { offerId, userId, name, type, price } = body;

  if (!offerId || !userId) {
    return createResponse("error", null, "Missing offerId or userId");
  }

  try {
    await ctx.runMutation(api.features.onlineBridge.updateOnlineBridgeOffer, {
      offerId: offerId as Id<"onlineBridgeOffers">,
      userId,
      name,
      type,
      price
    });

    return createResponse("success", null, "Offer updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const deleteOnlineBridgeOffer = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  // Read from query parameters, NOT body
  const url = new URL(request.url);
  const offerId = url.searchParams.get("offerId");
  const userId = url.searchParams.get("userId");

  console.log("DELETE OFFER REQUEST - offerId:", offerId);
  console.log("DELETE OFFER REQUEST - userId:", userId);

  if (!offerId || !userId) {
    return createResponse("error", null, "Missing offerId or userId");
  }

  try {
    // Cast the string offerId to Id type
    await ctx.runMutation(api.features.onlineBridge.deleteOnlineBridgeOffer, {
      offerId: offerId as Id<"onlineBridgeOffers">,
      userId
    });

    console.log("OFFER DELETE SUCCESSFUL");
    return createResponse("success", null, "Offer deleted successfully");
  } catch (error: any) {
    console.log("OFFER DELETE FAILED:", error.message);
    return createResponse("error", null, error.message);
  }
});
// ============= ONLINE BRIDGE DEVICES HTTP ACTIONS =============

export const createOnlineBridgeDevice = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, phoneNumber, deviceName, devicePhoneNumber, selectedOfferIds } = body;

  if (!userId || !phoneNumber || !deviceName || !devicePhoneNumber || !selectedOfferIds) {
    return createResponse("error", null, "Missing required fields");
  }

  try {
    const deviceId = await ctx.runMutation(api.features.onlineBridge.createOnlineBridgeDevice, {
      userId,
      phoneNumber,
      deviceName,
      devicePhoneNumber,
      selectedOfferIds
    });

    return createResponse("success", { deviceId }, "Device created successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getOnlineBridgeDevices = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const devices = await ctx.runQuery(api.features.onlineBridge.getOnlineBridgeDevices, { userId });
    return createResponse("success", { devices }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const updateOnlineBridgeDevice = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { deviceId, userId, deviceName, devicePhoneNumber, selectedOfferIds } = body;

  if (!deviceId || !userId) {
    return createResponse("error", null, "Missing deviceId or userId");
  }

  try {
    await ctx.runMutation(api.features.onlineBridge.updateOnlineBridgeDevice, {
      deviceId: deviceId as Id<"onlineBridgeDevices">,
      userId,
      deviceName,
      devicePhoneNumber,
      selectedOfferIds
    });

    return createResponse("success", null, "Device updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const updateOnlineDeviceOffers = httpAction(async (ctx, request) => {
  if (request.method !== "PATCH") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { deviceId, userId, selectedOfferIds } = body;

  if (!deviceId || !userId || !selectedOfferIds) {
    return createResponse("error", null, "Missing required fields");
  }

  try {
    await ctx.runMutation(api.features.onlineBridge.updateOnlineDeviceOffers, {
      deviceId: deviceId as Id<"onlineBridgeDevices">,
      userId,
      selectedOfferIds
    });

    return createResponse("success", null, "Device offers updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const deleteOnlineBridgeDevice = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  // Read from query parameters, NOT body
  const url = new URL(request.url);
  const deviceId = url.searchParams.get("deviceId");
  const userId = url.searchParams.get("userId");

  console.log("DELETE DEVICE REQUEST - deviceId:", deviceId);
  console.log("DELETE DEVICE REQUEST - userId:", userId);

  if (!deviceId || !userId) {
    return createResponse("error", null, "Missing deviceId or userId");
  }

  try {
    await ctx.runMutation(api.features.onlineBridge.deleteOnlineBridgeDevice, {
      deviceId: deviceId as Id<"onlineBridgeDevices">,
      userId
    });

    console.log("DEVICE DELETE SUCCESSFUL");
    return createResponse("success", null, "Device deleted successfully");
  } catch (error: any) {
    console.log("DEVICE DELETE FAILED:", error.message);
    return createResponse("error", null, error.message);
  }
});

// ============= ONLINE BRIDGE WHITELIST HTTP ACTIONS =============

export const addToOnlineWhitelist = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, phoneNumber, whitelistedNumber } = body;

  if (!userId || !phoneNumber || !whitelistedNumber) {
    return createResponse("error", null, "Missing required fields");
  }

  try {
    const id = await ctx.runMutation(api.features.onlineBridge.addToOnlineWhitelist, {
      userId,
      phoneNumber,
      whitelistedNumber
    });

    return createResponse("success", { id }, "Number whitelisted successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getOnlineWhitelist = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get("phoneNumber");

  if (!phoneNumber) {
    return createResponse("error", null, "Missing phoneNumber parameter");
  }

  try {
    const whitelist = await ctx.runQuery(api.features.onlineBridge.getOnlineWhitelist, { phoneNumber });
    return createResponse("success", { whitelist }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const isOnlineWhitelisted = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const receiverPhone = url.searchParams.get("receiver");
  const senderPhone = url.searchParams.get("sender");

  if (!receiverPhone || !senderPhone) {
    return createResponse("error", null, "Missing receiver or sender parameter");
  }

  try {
    const isWhitelisted = await ctx.runQuery(api.features.onlineBridge.isOnlineWhitelisted, {
      receiverPhone,
      senderPhone
    });

    return createResponse("success", { isWhitelisted }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const removeFromOnlineWhitelist = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  // Read from query parameters, NOT body
  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get("phoneNumber");
  const whitelistedNumber = url.searchParams.get("whitelistedNumber");

  console.log("DELETE REQUEST - phoneNumber:", phoneNumber);
  console.log("DELETE REQUEST - whitelistedNumber:", whitelistedNumber);

  if (!phoneNumber || !whitelistedNumber) {
    return createResponse("error", null, "Missing phoneNumber or whitelistedNumber");
  }

  try {
    await ctx.runMutation(api.features.onlineBridge.removeFromOnlineWhitelist, {
      phoneNumber,
      whitelistedNumber
    });

    console.log("DELETE SUCCESSFUL");
    return createResponse("success", null, "Number removed from whitelist");
  } catch (error: any) {
    console.log("DELETE FAILED:", error.message);
    return createResponse("error", null, error.message);
  }
});

// ============================================
// TOTAL COMMISSION HTTP HANDLERS
// ============================================

// Helper to normalize commission data with default totalAirtimeUsed
const normalizeCommission = <T extends { totalAirtimeUsed?: number }>(commission: T | null) => {
  if (!commission) return null;
  return {
    ...commission,
    totalAirtimeUsed: commission.totalAirtimeUsed ?? 0,
  };
};

const normalizeCommissions = <T extends { totalAirtimeUsed?: number }>(commissions: T[]) => {
  return commissions.map(c => ({
    ...c,
    totalAirtimeUsed: c.totalAirtimeUsed ?? 0,
  }));
};

/**
 * HTTP handler to get total commission by userId and day
 * GET /api/total-commission/
 * Query params: userId, day
 */
export const getTotalCommission = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const dayParam = url.searchParams.get("day");

  if (!userId || !dayParam) {
    return createResponse("error", null, "Missing userId or day parameter");
  }

  try {
    const day = parseInt(dayParam);
    const commission = await ctx.runQuery(
      api.features.totalCommission.getByUserAndDay,
      { userId, day }
    );

    return createResponse("success", { commission: normalizeCommission(commission) });
  } catch (error: any) {
    console.error("Error fetching total commission:", error);
    return createResponse(
      "error",
      null,
      `Failed to fetch total commission: ${error.message}`
    );
  }
});

/**
 * HTTP handler to get all commissions for a user
 * GET /api/total-commission/user/
 * Query params: userId
 */
export const getTotalCommissionByUser = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    const commissions = await ctx.runQuery(
      api.features.totalCommission.getByUserId,
      { userId }
    );

    return createResponse("success", { commissions: normalizeCommissions(commissions) });
  } catch (error: any) {
    console.error("Error fetching user commissions:", error);
    return createResponse(
      "error",
      null,
      `Failed to fetch user commissions: ${error.message}`
    );
  }
});

/**
 * HTTP handler to get commissions for a user within a date range
 * GET /api/total-commission/user/range/
 * Query params: userId, startDay, endDay
 */
export const getTotalCommissionByUserRange = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const startDayParam = url.searchParams.get("startDay");
  const endDayParam = url.searchParams.get("endDay");

  if (!userId || !startDayParam || !endDayParam) {
    return createResponse("error", null, "Missing required parameters: userId, startDay, endDay");
  }

  try {
    const startDay = parseInt(startDayParam);
    const endDay = parseInt(endDayParam);

    if (isNaN(startDay) || isNaN(endDay)) {
      return createResponse("error", null, "Invalid date parameters: startDay and endDay must be valid numbers");
    }

    if (startDay > endDay) {
      return createResponse("error", null, "Invalid date range: startDay must be less than or equal to endDay");
    }

    const commissions = await ctx.runQuery(
      api.features.totalCommission.getByUserIdAndDateRange,
      { userId, startDay, endDay }
    );

    const normalizedCommissions = normalizeCommissions(commissions);
    return createResponse("success", {
      commissions: normalizedCommissions,
      count: normalizedCommissions.length,
      startDay,
      endDay
    });
  } catch (error: any) {
    console.error("Error fetching user commissions by range:", error);
    return createResponse(
      "error",
      null,
      `Failed to fetch user commissions by range: ${error.message}`
    );
  }
});

/**
 * HTTP handler to get all commissions for a specific day
 * GET /api/total-commission/day/
 * Query params: day
 */
export const getTotalCommissionByDay = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const dayParam = url.searchParams.get("day");

  if (!dayParam) {
    return createResponse("error", null, "Missing day parameter");
  }

  try {
    const day = parseInt(dayParam);
    const commissions = await ctx.runQuery(
      api.features.totalCommission.getByDay,
      { day }
    );

    return createResponse("success", { commissions: normalizeCommissions(commissions) });
  } catch (error: any) {
    console.error("Error fetching day commissions:", error);
    return createResponse(
      "error",
      null,
      `Failed to fetch day commissions: ${error.message}`
    );
  }
});

/**
 * HTTP handler to create or update total commission
 * POST /api/total-commission/upsert/
 * Body: { userId, day, totalCommissionAmount, totalAirtimeUsed }
 */
export const upsertTotalCommission = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, day, totalCommissionAmount, totalAirtimeUsed } = body;

  if (!userId || day === undefined || totalCommissionAmount === undefined || totalAirtimeUsed === undefined) {
    return createResponse(
      "error",
      null,
      "Missing required fields: userId, day, totalCommissionAmount, totalAirtimeUsed"
    );
  }

  try {
    const result = await ctx.runMutation(
      api.features.totalCommission.upsertTotalCommission,
      {
        userId,
        day: parseInt(day),
        totalCommissionAmount: parseFloat(totalCommissionAmount),
        totalAirtimeUsed: parseFloat(totalAirtimeUsed),
      }
    );

    return createResponse("success", result);
  } catch (error: any) {
    console.error("Error upserting total commission:", error);
    return createResponse(
      "error",
      null,
      `Failed to upsert total commission: ${error.message}`
    );
  }
});

/**
 * HTTP handler to increment total commission
 * POST /api/total-commission/increment/
 * Body: { userId, day, commissionAmount, airtimeAmount }
 */
export const incrementTotalCommission = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, day, commissionAmount, airtimeAmount } = body;

  if (!userId || day === undefined || commissionAmount === undefined || airtimeAmount === undefined) {
    return createResponse(
      "error",
      null,
      "Missing required fields: userId, day, commissionAmount, airtimeAmount"
    );
  }

  try {
    const result = await ctx.runMutation(
      api.features.totalCommission.incrementTotalCommission,
      {
        userId,
        day: parseInt(day),
        commissionAmount: parseFloat(commissionAmount),
        airtimeAmount: parseFloat(airtimeAmount),
      }
    );

    return createResponse("success", result);
  } catch (error: any) {
    console.error("Error incrementing total commission:", error);
    return createResponse(
      "error",
      null,
      `Failed to increment total commission: ${error.message}`
    );
  }
});

/**
 * HTTP handler to delete a commission record
 * DELETE /api/total-commission/delete/
 * Body: { userId, day }
 */
export const deleteTotalCommission = httpAction(async (ctx, request) => {
  if (request.method !== "DELETE") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { userId, day } = body;

  if (!userId || day === undefined) {
    return createResponse(
      "error",
      null,
      "Missing required fields: userId, day"
    );
  }

  try {
    const result = await ctx.runMutation(
      api.features.totalCommission.deleteTotalCommission,
      {
        userId,
        day: parseInt(day),
      }
    );

    return createResponse("success", result);
  } catch (error: any) {
    console.error("Error deleting total commission:", error);
    return createResponse(
      "error",
      null,
      `Failed to delete total commission: ${error.message}`
    );
  }
});

/**
 * POST /api/online-bridge/transactions/create/
 * Create a new Online Bridge transaction
 */
export const createOnlineBridgeTransaction = httpAction(
  async (ctx, request) => {
    try {
      const body = await request.json();
      
      const {
        userId,
        senderPhoneNumber,
        receiverPhoneNumber,
        deviceId,
        offerId,
        amount,
        smsContent,
        ussdCode,
        status,
      } = body;

      // Validate required fields
      if (
        !userId ||
        !senderPhoneNumber ||
        !receiverPhoneNumber ||
        !deviceId ||
        !offerId ||
        amount === undefined ||
        !smsContent ||
        !status
      ) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const transactionId = await ctx.runMutation(
        api.features.onlineBridge.createOnlineBridgeTransaction,
        {
          userId,
          senderPhoneNumber,
          receiverPhoneNumber,
          deviceId,
          offerId,
          amount: parseFloat(amount),
          smsContent,
          ussdCode,
          status,
        }
      );

      const transaction = await ctx.runQuery(
        api.features.onlineBridge.getOnlineBridgeTransactionById,
        { transactionId }
      );

      return new Response(JSON.stringify(transaction), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("createOnlineBridgeTransactionHandler error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

/**
 * GET /api/online-bridge/transactions/
 * Get all Online Bridge transactions for a user
 */
export const getOnlineBridgeTransactions = httpAction(
  async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");

      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const transactions = await ctx.runQuery(
        api.features.onlineBridge.getOnlineBridgeTransactions,
        { userId }
      );

      return new Response(JSON.stringify({ transactions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("getOnlineBridgeTransactionsHandler error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

/**
 * GET /api/online-bridge/transactions/pending/
 * Get pending Online Bridge transactions for a receiver
 */
export const getPendingOnlineBridgeTransactions = httpAction(
  async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const receiverPhoneNumber = url.searchParams.get("receiverPhoneNumber");

      if (!receiverPhoneNumber) {
        return new Response(
          JSON.stringify({ error: "Missing receiverPhoneNumber" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const transactions = await ctx.runQuery(
        api.features.onlineBridge.getPendingOnlineBridgeTransactions,
        { receiverPhoneNumber }
      );

      return new Response(JSON.stringify({ transactions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("getPendingOnlineBridgeTransactionsHandler error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

/**
 * PATCH /api/online-bridge/transactions/update-status/
 * Update Online Bridge transaction status
 */
export const updateOnlineBridgeTransactionStatus = httpAction(
  async (ctx, request) => {
    try {
      const body = await request.json();
      const { transactionId, status, result, ussdCode, executedAt } = body;

      if (!transactionId || !status) {
        return new Response(
          JSON.stringify({ error: "Missing transactionId or status" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(
        api.features.onlineBridge.updateOnlineBridgeTransactionStatus,
        {
          transactionId: transactionId as Id<"onlineBridgeTransactions">,
          status,
          result,
          ussdCode,
          executedAt: executedAt ? parseFloat(executedAt) : undefined,
        }
      );

      const transaction = await ctx.runQuery(
        api.features.onlineBridge.getOnlineBridgeTransactionById,
        { transactionId: transactionId as Id<"onlineBridgeTransactions"> }
      );

      return new Response(JSON.stringify(transaction), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("updateOnlineBridgeTransactionStatusHandler error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

/**
 * DELETE /api/online-bridge/transactions/delete/
 * Delete (soft delete) Online Bridge transaction
 */
export const deleteOnlineBridgeTransaction = httpAction(
  async (ctx, request) => {
    try {
      const body = await request.json();
      const { transactionId } = body;

      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: "Missing transactionId" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(
        api.features.onlineBridge.deleteOnlineBridgeTransaction,
        { transactionId: transactionId as Id<"onlineBridgeTransactions"> }
      );

      return new Response(
        JSON.stringify({ message: "Transaction deleted successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("deleteOnlineBridgeTransactionHandler error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

/**
 * GET /api/online-bridge/transactions/stats/
 * Get Online Bridge transaction status counts
 */
export const getOnlineBridgeTransactionStats = httpAction(
  async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");

      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const stats = await ctx.runQuery(
        api.features.onlineBridge.getOnlineBridgeTransactionStatusCounts,
        { userId }
      );

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("getOnlineBridgeTransactionStatsHandler error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

export const updateServiceStatus = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { phoneNumber, isServiceRunning } = body;

  if (!phoneNumber || typeof isServiceRunning !== "boolean") {
    return createResponse("error", null, "Missing phoneNumber or isServiceRunning");
  }

  try {
    await ctx.runMutation(api.features.serviceStatus.updateServiceStatus, {
      phoneNumber,
      isServiceRunning,
    });

    return createResponse("success", null, "Service status updated successfully");
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getServiceStatus = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const phoneNumber = url.searchParams.get("phoneNumber");

  if (!phoneNumber) {
    return createResponse("error", null, "Missing phoneNumber parameter");
  }

  try {
    const status = await ctx.runQuery(api.features.serviceStatus.getServiceStatus, {
      phoneNumber,
    });

    return createResponse("success", status, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});

export const getMultipleServiceStatuses = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return createResponse("error", null, "Method not allowed");
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createResponse("error", null, "Invalid JSON body");
  }

  const { phoneNumbers } = body;

  if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
    return createResponse("error", null, "Missing or invalid phoneNumbers array");
  }

  try {
    const statuses = await ctx.runQuery(api.features.serviceStatus.getMultipleServiceStatuses, {
      phoneNumbers,
    });

    return createResponse("success", { statuses }, null);
  } catch (error: any) {
    return createResponse("error", null, error.message);
  }
});


export const updateDeviceHeartbeat = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { phoneNumber, userId } = body;

    if (!phoneNumber || !userId) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing phoneNumber or userId",
          timestamp: Date.now(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(api.features.serviceStatus.updateDeviceHeartbeat, {
      phoneNumber,
      userId,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: { id: result },
        timestamp: Date.now(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: Date.now(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const getBatchDeviceOnlineStatus = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { phoneNumbers } = body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing or invalid phoneNumbers array",
          timestamp: Date.now(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runQuery(api.features.serviceStatus.getBatchDeviceOnlineStatus, {
      phoneNumbers,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: result,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: Date.now(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});


export const setDeviceHeartbeatTestHandler = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { phoneNumber, userId, timestampOffset } = body;

    if (!phoneNumber || !userId || timestampOffset === undefined) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing phoneNumber, userId, or timestampOffset",
          timestamp: Date.now(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(api.features.serviceStatus.setDeviceHeartbeatManually, {
      phoneNumber,
      userId,
      timestampOffset,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: result,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: Date.now(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const updateOnlineServiceStatus = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { phoneNumber, userId, isServiceRunning } = body;

    if (!phoneNumber || !userId || typeof isServiceRunning !== "boolean") {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing phoneNumber, userId, or isServiceRunning",
          timestamp: Date.now(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(api.features.serviceStatus.updateOnlineServiceStatus, {
      phoneNumber,
      userId,
      isServiceRunning,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: { id: result },
        timestamp: Date.now(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: Date.now(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const getOnlineServiceStatus = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const phoneNumber = url.searchParams.get("phoneNumber");

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing phoneNumber query parameter",
          timestamp: Date.now(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runQuery(api.features.serviceStatus.getOnlineServiceStatus, {
      phoneNumber,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: result,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: Date.now(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export const getOnlineBatchServiceStatus = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { phoneNumbers } = body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Missing or invalid phoneNumbers array",
          timestamp: Date.now(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runQuery(api.features.serviceStatus.getOnlineBatchServiceStatus, {
      phoneNumbers,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: result,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: Date.now(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
