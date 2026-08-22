import { v } from "convex/values";
import { mutation } from "../functions";
import { query, MutationCtx } from "../_generated/server";
import { BackendResponse } from "../../lib/custom_types";

const patternStepArgs = v.object({
  stepIndex: v.number(),
  inputKey: v.string(),
  inputValue: v.string(),
  pattern: v.optional(v.string()),
  type: v.optional(v.string()),
  inputMode: v.optional(v.string()),
});

// Replaces (never appends to) a bundle's pattern-offer step recipe — delete-then-insert
// within the same mutation call so it's atomic and safe to call repeatedly without ever
// producing duplicate step rows.
async function replaceBundleSteps(
  ctx: MutationCtx,
  bundleId: string,
  userId: string,
  steps: { stepIndex: number; inputKey: string; inputValue: string; pattern?: string; type?: string; inputMode?: string }[]
) {
  const existingSteps = await ctx.db
    .query("patternOfferSteps")
    .withIndex("by_bundleId", (q) => q.eq("bundleId", bundleId))
    .collect();
  for (const step of existingSteps) {
    await ctx.db.delete(step._id);
  }
  for (const step of steps) {
    await ctx.db.insert("patternOfferSteps", { bundleId, userId, ...step });
  }
}

export const getAllBundles = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Two bounded queries total, regardless of how many bundles this user has — was previously
    // one query for the bundles PLUS one extra query per individual bundle (N+1), which is what
    // caused this to hang/time out for accounts with enough bundles. patternOfferSteps already
    // has a by_user index (see replaceBundleSteps above for the by_bundleId sibling), so all of
    // this user's steps can be fetched in one shot and grouped by bundleId in memory instead.
    const [bundles, allSteps] = await Promise.all([
      ctx.db
        .query("bundles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("patternOfferSteps")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);

    const stepsByBundleId = new Map<string, typeof allSteps>();
    for (const step of allSteps) {
      const existing = stepsByBundleId.get(step.bundleId);
      if (existing) {
        existing.push(step);
      } else {
        stepsByBundleId.set(step.bundleId, [step]);
      }
    }

    return bundles.map((bundle) => {
      const steps = stepsByBundleId.get(bundle._id.toString()) ?? [];
      return {
        ...bundle,
        patternSteps: steps
          .sort((a, b) => a.stepIndex - b.stepIndex)
          .map(({ stepIndex, inputKey, inputValue, pattern, type, inputMode }) => ({
            stepIndex, inputKey, inputValue, pattern, type, inputMode,
          })),
      };
    });
  },
});


export const createBundleFromAPI = mutation({
  args: {
    userId: v.string(),
    offerName: v.string(),
    duration: v.string(),
    bundlesUSSD: v.string(),
    price: v.number(),
    commission: v.optional(v.number()),
    status: v.union(v.literal("available"), v.literal("disabled")),
    isMultiSession: v.boolean(),
    isSimpleUSSD: v.boolean(),
    responseValidatorText: v.optional(v.string()),
    autoReschedule: v.optional(v.string()),
    dialingSIM: v.union(v.literal("SIM1"), v.literal("SIM2")),
    offerType: v.union(
      v.literal("Data"),
      v.literal("SMS"),
      v.literal("Minutes"),
      v.literal("Airtime"),
      v.literal("Bundles"),
      v.literal("Other")
    ),
    isPatternOffer: v.optional(v.boolean()),
    patternSteps: v.optional(v.array(patternStepArgs)),
  },
  handler: async (ctx, args) => {
    const {
      userId,
      offerName,
      duration,
      price,
      commission = 0,
      status,
      bundlesUSSD,
      isMultiSession,
      isSimpleUSSD,
      responseValidatorText = "",
      autoReschedule = "",
      dialingSIM,
      offerType,
      isPatternOffer = false,
      patternSteps
    } = args;

    // Validation: Ensure only one of isMultiSession or isSimpleUSSD is true
    if (isMultiSession && responseValidatorText && responseValidatorText.trim() !== "") {
      const parts = responseValidatorText.split(",");
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
        return null;
      }
      
      // Validate step is a number
      if (isNaN(parseInt(parts[0].trim()))) {
        return null;
      }
    }
    // Name duplicates always block. Price duplicates only block if the existing bundle at that
    // price is currently ACTIVE — a disabled one is fine to share a price with (this is what lets
    // an Offer Time Config's inactive side sit disabled at the same price as its active sibling).
    // Mirrors BundleRepository.doesOfferAmountExist on the Android side — see
    // project_offer_time_config_feature memory.
    const nameDuplicate = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("offerName"), offerName))
      .first();

    if (nameDuplicate) {
      return null;
    }

    // Only check at all if THIS bundle is being saved as "available" — if it's being saved as
    // "disabled" (exactly what the Android app does when it already detected this same conflict
    // itself), there's nothing to reject: two bundles can share a price as long as at most one
    // is active, and this one isn't.
    const activePriceDuplicate = status !== "available" ? null : await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(q.eq(q.field("price"), price), q.eq(q.field("status"), "available"))
      )
      .first();

    // Never reject on a price conflict — silently save this one as disabled instead, so the
    // caller (app or website) doesn't need to pre-compute this itself.
    const finalStatus = activePriceDuplicate ? "disabled" : status;

    try {
      const id = await ctx.db.insert("bundles", {
        userId,
        offerName,
        duration,
        price,
        commission,
        status: finalStatus,
        bundlesUSSD,
        isMultiSession,
        isSimpleUSSD,
        responseValidatorText,
        autoReschedule,
        dialingSIM,
        offerType,
        isPatternOffer
      });
      if (patternSteps && patternSteps.length > 0) {
        await replaceBundleSteps(ctx, id.toString(), userId, patternSteps);
      }
      return id.toString();
    } catch (error) {
      return null;
    }
  },
});



export const updateBundle = mutation({
  args: {
    id: v.id("bundles"),
    userId: v.string(),
    offerName: v.optional(v.string()),
    duration: v.optional(v.string()),
    bundlesUSSD: v.optional(v.string()),
    price: v.optional(v.number()),
    commission: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("disabled"))),
    isMultiSession: v.optional(v.boolean()),
    isSimpleUSSD: v.optional(v.boolean()),
    responseValidatorText: v.optional(v.string()),
    autoReschedule: v.optional(v.string()),
    dialingSIM: v.optional(v.union(v.literal("SIM1"), v.literal("SIM2"))),
    offerType: v.optional(v.union(
      v.literal("Data"),
      v.literal("SMS"),
      v.literal("Minutes"),
      v.literal("Airtime"),
      v.literal("Bundles"),
      v.literal("Other")
    )),
    isPatternOffer: v.optional(v.boolean()),
    patternSteps: v.optional(v.array(patternStepArgs)),
  },
  handler: async (ctx, args) => {
    const { id, userId, offerName, price, isMultiSession, isSimpleUSSD, responseValidatorText, patternSteps, isPatternOffer, ...updates } = args;

    const existingBundle = await ctx.db.get(id);
    if (!existingBundle || existingBundle.userId !== userId) {
      return {
        status: "error",
        message: "Bundle not found or you don't have permission to update it.",
      } as BackendResponse;
    }

    // Validation: Ensure only one of isMultiSession or isSimpleUSSD is true
    const finalIsMultiSession = isMultiSession !== undefined ? isMultiSession : existingBundle.isMultiSession;
    const finalIsSimpleUSSD = isSimpleUSSD !== undefined ? isSimpleUSSD : existingBundle.isSimpleUSSD;
    
    if (finalIsMultiSession && finalIsSimpleUSSD) {
      return {
        status: "error",
        message: "Bundle cannot be both Multi-session and Simple USSD. Please select only one option.",
      } as BackendResponse;
    }

    // If isMultiSession is false, responseValidatorText should be empty
    const finalResponseValidatorText = responseValidatorText !== undefined ? responseValidatorText : existingBundle.responseValidatorText;
    if (!finalIsMultiSession && finalResponseValidatorText && finalResponseValidatorText.trim() !== "") {
      return {
        status: "error",
        message: "Response Validator Text can only be set when Multi-session is enabled.",
      } as BackendResponse;
    }

    // Validate responseValidatorText format if provided
    if (finalIsMultiSession && finalResponseValidatorText && finalResponseValidatorText.trim() !== "") {
      const parts = finalResponseValidatorText.split(",");
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
        return {
          status: "error",
          message: "Response Validator Text must be in format: 'step,validation_text' (e.g., '3,250Mbs for 24 hours')",
        } as BackendResponse;
      }
      
      // Validate step is a number
      if (isNaN(parseInt(parts[0].trim()))) {
        return {
          status: "error",
          message: "Validator step must be a valid number.",
        } as BackendResponse;
      }
    }

    if (offerName) {
      const nameDuplicate = await ctx.db
        .query("bundles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.and(q.neq(q.field("_id"), id), q.eq(q.field("offerName"), offerName)))
        .first();

      if (nameDuplicate) {
        return {
          status: "error",
          message: `A bundle with the name "${offerName}" already exists. Please choose a different name.`,
        } as BackendResponse;
      }
    }

    // Price duplicates never block — if this bundle is ending up "available" and another bundle
    // at that price is also currently active, silently save THIS one as disabled instead. Two
    // bundles can share a price as long as at most one is active. Mirrors
    // BundleRepository.updateBundle's finalStatus logic on the Android side — see
    // project_offer_time_config_feature memory.
    if (price !== undefined) {
      const effectiveStatus = updates.status ?? existingBundle.status;
      if (effectiveStatus === "available") {
        const activePriceDuplicate = await ctx.db
          .query("bundles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) =>
            q.and(
              q.neq(q.field("_id"), id),
              q.eq(q.field("price"), price),
              q.eq(q.field("status"), "available")
            )
          )
          .first();

        if (activePriceDuplicate) {
          updates.status = "disabled";
        }
      }
    }

    console.log(`[MODE_DEBUG] updateBundle mutation received — id=${id} args.isMultiSession=${isMultiSession} args.isSimpleUSSD=${isSimpleUSSD} existingBundle.isMultiSession=${existingBundle.isMultiSession} finalIsMultiSession=${finalIsMultiSession} finalIsSimpleUSSD=${finalIsSimpleUSSD}`);
    try {
      // Every field here is included only if the caller actually sent it — same reasoning as the
      // isPatternOffer guard below, generalized: offerName/price/duration/etc are REQUIRED
      // (non-optional) in the bundles table schema, so patch()-ing them with `undefined` (e.g. a
      // caller like the mode-toggle bulk update, which only ever sends isMultiSession/isSimpleUSSD)
      // throws "missing required field" and the whole write is rejected — silently, from the
      // caller's point of view, since nothing here used to check for that (see the httpAction fix).
      await ctx.db.patch(id, {
        ...(offerName !== undefined ? { offerName } : {}),
        ...(price !== undefined ? { price } : {}),
        isMultiSession: finalIsMultiSession,
        isSimpleUSSD: finalIsSimpleUSSD,
        responseValidatorText: finalResponseValidatorText,
        ...Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)),
        ...(isPatternOffer !== undefined ? { isPatternOffer } : {}),
      });
      if (patternSteps !== undefined) {
        await replaceBundleSteps(ctx, id.toString(), userId, patternSteps);
      }
      const afterPatch = await ctx.db.get(id);
      console.log(`[MODE_DEBUG] updateBundle AFTER patch — id=${id} stored isMultiSession=${afterPatch?.isMultiSession} stored isSimpleUSSD=${afterPatch?.isSimpleUSSD}`);
      return {
        status: "success",
        message: `Bundle updated successfully.`,
      } as BackendResponse;
    } catch (error) {
      console.log(`[MODE_DEBUG] updateBundle EXCEPTION — id=${id} error=${error}`);
      return {
        status: "error",
        message:
          "An error occurred while updating the bundle. Please try again later.",
      } as BackendResponse;
    }
  },
});



export const deleteBundle = mutation({
  args: { id: v.id("bundles"), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const existingBundle = await ctx.db.get(id);
    if (!existingBundle) {
      throw new Error("Bundle not found!");
    }
    if (existingBundle.userId !== userId) {
      throw new Error("Permission denied!");
    }
    await ctx.db.delete(id);
  },
});

export const deleteBundleFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const existingBundle = await ctx.db
      .query("bundles")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    if (!existingBundle) {
      // Already gone (e.g. already deleted elsewhere) — harmless no-op instead of throwing,
      // same pattern as deleteWatch in autoTopup.ts/bridgeAutoTopup.ts (2026-08-12).
      return { success: true, alreadyGone: true };
    }
    if (existingBundle.userId !== userId) {
      // Genuine authorization failure — keep throwing, this is not a "already gone" case.
      throw new Error("Permission denied");
    }
    await ctx.db.delete(existingBundle._id);
    return { success: true };
  },
});

export const toggleBundleStatus = mutation({
  args: { id: v.id("bundles"), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const bundle = await ctx.db.get(id);
    if (!bundle || bundle.userId !== userId) {
      throw new Error(
        "Bundle not found or you don't have permission to update it"
      );
    }
    const newStatus = bundle.status === "available" ? "disabled" : "available";
    await ctx.db.patch(id, { status: newStatus });
    return {
      status: "success",
      message: `Bundle ${newStatus === "available" ? "enabled" : "disabled"} successfully`,
      newStatus: newStatus
    };
  },
});

export const toggleBundleStatusFromAPI = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const { id, userId } = args;
    const bundle = await ctx.db
      .query("bundles")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    
    if (!bundle || bundle.userId !== userId) {
      throw new Error(
        "Bundle not found or you don't have permission to update it"
      );
    }
    
    const newStatus = bundle.status === "available" ? "disabled" : "available";
    await ctx.db.patch(bundle._id, { status: newStatus });
    
    return {
      status: "success",
      message: `Bundle ${newStatus === "available" ? "enabled" : "disabled"} successfully`,
      newStatus: newStatus
    };
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getBundleByBundleID = query({
  args: {
    bundleId: v.string(),
  },
  handler: (ctx, args) => {
    return ctx.db
      .query("bundles")
      .filter((q) => q.eq(q.field("_id"), args.bundleId))
      .first();
  },
});

export const getBundleByUserAndNameOrPrice = query({
  args: {
    userId: v.string(),
    offerName: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, offerName, price } = args;

    // Query the bundles table for matching entries
    const existingBundle = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("offerName"), offerName),
          q.eq(q.field("price"), price)
        )
      )
      .first();

    return existingBundle;
  },
});

const BUNDLE_OFFER_TYPES = ["Data", "SMS", "Minutes", "Airtime", "Bundles", "Other"] as const;

// Copies (or re-copies, if already added) a Smart Offers catalog entry into the caller's own
// bundles — the web equivalent of SmartUssdViewModel.addOrReplaceOffer() on Android. Matches
// the existing bundle by price, same as the app: offer prices are unique in the catalog, so
// price is a safe identity key here (confirmed — offers can't share a price).
export const addOrReplaceFromCatalog = mutation({
  args: {
    userId: v.string(),
    offerId: v.id("serverPatternOffers"),
  },
  handler: async (ctx, args) => {
    const { userId, offerId } = args;

    const offer = await ctx.db.get(offerId);
    if (!offer || !offer.isActive) {
      return {
        status: "error",
        message: "Offer not found or no longer available.",
      } as BackendResponse;
    }

    const existing = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("price"), offer.price))
      .first();
    const wasReplaced = existing !== null;

    // The catalog's offerType is free text (e.g. PatternOffersMain also allows "Custom"),
    // but bundles.offerType is a closed union — fall back to "Other" for anything that
    // doesn't match, rather than letting the mutation throw on an unrecognized value.
    const offerType = (BUNDLE_OFFER_TYPES as readonly string[]).includes(offer.offerType)
      ? (offer.offerType as (typeof BUNDLE_OFFER_TYPES)[number])
      : "Other";

    const bundleFields = {
      userId,
      offerName: offer.name,
      duration: existing?.duration ?? "N/A",
      bundlesUSSD: offer.ussdBaseCode,
      price: offer.price,
      commission: existing?.commission ?? 0,
      status: "available" as const,
      isMultiSession: true,
      isSimpleUSSD: false,
      responseValidatorText: "",
      autoReschedule: existing?.autoReschedule ?? "",
      dialingSIM: existing?.dialingSIM ?? ("SIM1" as const),
      offerType,
      isPatternOffer: true,
    };

    const bundleId = existing ? existing._id : await ctx.db.insert("bundles", bundleFields);
    if (existing) {
      await ctx.db.patch(existing._id, bundleFields);
    }

    await replaceBundleSteps(
      ctx,
      bundleId.toString(),
      userId,
      offer.steps.map(({ stepIndex, inputKey, inputValue, pattern, type, inputMode }) => ({
        stepIndex, inputKey, inputValue, pattern, type, inputMode,
      }))
    );

    return {
      status: "success",
      message: wasReplaced ? `'${offer.name}' replaced in your offers.` : `'${offer.name}' added to your offers.`,
      bundleId: bundleId.toString(),
      offerName: offer.name,
      wasReplaced,
    };
  },
});

export const getDuplicateBundle = query({
  args: {
    userId: v.string(),
    offerName: v.optional(v.string()),
    price: v.optional(v.number()),
    excludeId: v.id("bundles"),
  },
  handler: async (ctx, args) => {
    const { userId, offerName, price, excludeId } = args;

    // If neither offerName nor price is provided, no need to check for duplicates
    if (offerName === undefined && price === undefined) {
      return null;
    }

    const duplicateBundle = await ctx.db
      .query("bundles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), excludeId),
          q.or(
            offerName ? q.eq(q.field("offerName"), offerName) : q.eq(1, 0),
            price !== undefined ? q.eq(q.field("price"), price) : q.eq(1, 0)
          )
        )
      )
      .first();

    return duplicateBundle;
  },
});