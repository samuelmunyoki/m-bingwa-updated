import { v } from "convex/values";
import { mutation, httpAction } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { api } from "../../_generated/api";


// Define the Bundle type without _creationTime
type Bundle = Omit<Doc<"bundles">, "_creationTime"> & {
  _id: Id<"bundles">;
};

export const updateBundles = mutation({
  args: {
    userId: v.string(),
    bundles: v.array(
      v.object({
        _id: v.optional(v.id("bundles")),
        userId: v.string(),
        status: v.union(v.literal("available"), v.literal("disabled")),
        offerName: v.string(),
        bundlesUSSD: v.string(),
        duration: v.string(),
        price: v.number(),
        isMultiSession: v.boolean(), // Add the new isMultiSession field
        dialingSIM: v.union(v.literal("SIM1"), v.literal("SIM2")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId, bundles } = args;

    // Get existing bundles
    const existingBundles = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const updatedBundles: Bundle[] = [];
    const errors: { _id?: Id<"bundles">; error: string }[] = [];

    for (const bundle of bundles) {
      let existingBundle = bundle._id ? await ctx.db.get(bundle._id) : null;

      if (!existingBundle) {
        existingBundle =
          existingBundles.find((b) => b.offerName === bundle.offerName) || null;
      }

      if (existingBundle) {
        // Update existing bundle
        if (existingBundle.price !== bundle.price) {
          // If price is different, check if the new price already exists
          const priceExists = existingBundles.some(
            (b) => b.price === bundle.price && b._id !== existingBundle._id
          );
          if (priceExists) {
            errors.push({
              _id: existingBundle._id,
              error: `Cannot update bundle: ${bundle.offerName}. Price ${bundle.price} already exists.`,
            });
            updatedBundles.push(removeCreationTime(existingBundle));
            continue;
          }
        }

        try {
          await ctx.db.patch(existingBundle._id, bundle);
          const updatedBundle = await ctx.db.get(existingBundle._id);
          if (updatedBundle) {
            updatedBundles.push(removeCreationTime(updatedBundle));
          } else {
            throw new Error("Failed to retrieve updated bundle");
          }
        } catch (error) {
          errors.push({
            _id: existingBundle._id,
            error: `Failed to update bundle: ${bundle.offerName}. Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
          updatedBundles.push(removeCreationTime(existingBundle));
        }
      } else {
        // Create new bundle
        const priceExists = existingBundles.some(
          (b) => b.price === bundle.price
        );
        if (priceExists) {
          errors.push({
            error: `Cannot create bundle: ${bundle.offerName}. Price ${bundle.price} already exists.`,
          });
          continue;
        }

        try {
          const newBundleId = await ctx.db.insert("bundles", bundle);
          const newBundle = await ctx.db.get(newBundleId);
          if (newBundle) {
            updatedBundles.push(removeCreationTime(newBundle));
          } else {
            throw new Error("Failed to retrieve newly created bundle");
          }
        } catch (error) {
          errors.push({
            error: `Failed to create bundle: ${bundle.offerName}. Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    }

    // Add any existing bundles that were not in the update list
    const updatedBundleIds = new Set(updatedBundles.map((b) => b._id));
    const unchangedBundles = existingBundles
      .filter((b) => !updatedBundleIds.has(b._id))
      .map(removeCreationTime);
    updatedBundles.push(...unchangedBundles);

    return { updatedBundles, errors };
  },
});

// Helper function to remove _creationTime from a bundle
function removeCreationTime(bundle: Doc<"bundles">): Bundle {
  const { _creationTime, ...bundleWithoutCreationTime } = bundle;
  return bundleWithoutCreationTime as Bundle;
}


export const updateStores = mutation({
  args: {
    userId: v.string(),
    stores: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, stores } = args;

    // Get all stores to check for unique names
    const allStores = await ctx.db.query("stores").collect();

    const updatedStores: Doc<"stores">[] = [];
    const errors: { _id?: Id<"stores">; error: string }[] = [];

    // Create or update stores
    for (const store of stores) {
      const existingStore = allStores.find(
        (s) => s.storeName === store.storeName && s.storeOwnerId === userId
      );

      // Check if the store name already exists for any user
      const storeNameExists = allStores.some(
        (s) => s.storeName === store.storeName && s.storeOwnerId !== userId
      );

      if (storeNameExists) {
        errors.push({
          error: `Cannot create/update store: ${store.storeName}. Store name already exists.`,
        });
        continue;
      }

      if (existingStore) {
        // Update existing store
        try {
          await ctx.db.patch(existingStore._id, store);
          updatedStores.push({ ...existingStore, ...store });
        } catch (error) {
          errors.push({
            _id: existingStore._id,
            error: `Failed to update store: ${store.storeName}. Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      } else {
        // Create new store
        try {
          const newStoreId = await ctx.db.insert("stores", store);
          const newStore = await ctx.db.get(newStoreId);
          if (newStore) {
            updatedStores.push(newStore);
          } else {
            throw new Error("Failed to retrieve newly created store");
          }
        } catch (error) {
          errors.push({
            error: `Failed to create store: ${store.storeName}. Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    }

    return { updatedStores, errors };
  },
});

export const updateScheduledEvents = mutation({
  args: {
    userId: v.string(),
    scheduledEvents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, scheduledEvents } = args;

    // Get existing scheduled events
    const existingEvents = await ctx.db
      .query("scheduled_events")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const updatedEvents: Doc<"scheduled_events">[] = [];
    const errors: { _id?: Id<"scheduled_events">; error: string }[] = [];

    // Find events in the database that are missing from the update and remove them
    const eventsToRemove = existingEvents.filter(
      (existingEvent) =>
        !scheduledEvents.some(
          (event) =>
            event.ussdCode === existingEvent.ussdCode &&
            event.scheduledTimeStamp === existingEvent.scheduledTimeStamp
        )
    );

    for (const event of eventsToRemove) {
      try {
        await ctx.db.delete(event._id);
        console.log(`Event with ID ${event._id} removed successfully`);
      } catch (error) {
        errors.push({
          _id: event._id,
          error: `Failed to remove event: ${event.ussdCode}. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    // Create or update scheduled events
    for (const event of scheduledEvents) {
      const existingEvent = existingEvents.find(
        (e) =>
          e.ussdCode === event.ussdCode &&
          e.scheduledTimeStamp === event.scheduledTimeStamp
      );

      if (existingEvent) {
        // Update existing event
        try {
          await ctx.db.patch(existingEvent._id, event);
          updatedEvents.push({ ...existingEvent, ...event });
        } catch (error) {
          errors.push({
            _id: existingEvent._id,
            error: `Failed to update event: ${event.ussdCode}. Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      } else if (!event._id) {
        // Create new event if _id is not provided
        try {
          const newEventId = await ctx.db.insert("scheduled_events", event);
          const newEvent = await ctx.db.get(newEventId);
          if (newEvent) {
            updatedEvents.push(newEvent);
          } else {
            throw new Error("Failed to retrieve newly created event");
          }
        } catch (error) {
          errors.push({
            error: `Failed to create event: ${event.ussdCode}. Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    }

    return { updatedEvents, errors };
  },
});


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

export const downloadUserData = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return createResponse("error", null, "Missing userId parameter");
  }

  try {
    // Get fresh user data with all dependencies
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

//   // Extract the data object from the body
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
//         updatedBundles: Bundle[];
//         errors: { _id?: Id<"bundles">; error: string }[];
//       };
//       stores?: {
//         updatedStores: Doc<"stores">[];
//         errors: { _id?: Id<"stores">; error: string }[];
//       };
//       scheduledEvents?: {
//         updatedEvents: Doc<"scheduled_events">[];
//         errors: { _id?: Id<"scheduled_events">; error: string }[];
//       };
//     } = {};

//     // Update bundles
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

//     // Update stores
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

//     // Update scheduled events
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
