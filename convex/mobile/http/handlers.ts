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