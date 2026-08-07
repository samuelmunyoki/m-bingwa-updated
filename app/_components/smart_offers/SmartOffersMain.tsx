"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast, Toaster } from "sonner";

type CatalogStep = {
  stepIndex: number;
  inputKey: string;
  inputValue: string;
  pattern?: string;
  type: string;
  inputMode: string;
};

type CatalogOffer = {
  _id: Id<"serverPatternOffers">;
  name: string;
  price: number;
  ussdBaseCode: string;
  offerType: string;
  isActive: boolean;
  steps: CatalogStep[];
};

type LocalStep = {
  stepIndex: number;
  inputKey: string;
  inputValue: string;
  pattern?: string;
  type?: string;
  inputMode?: string;
};

type LocalBundle = {
  price: number;
  patternSteps: LocalStep[];
};

type OfferState = "NotAdded" | "Added" | "NeedsUpdate";

// Same field-by-field comparison SmartUssdViewModel.stepsMatch() uses on Android — order-
// independent within a step (compared by stepIndex), but the full recipe must match exactly.
function stepsMatch(catalogSteps: CatalogStep[], localSteps: LocalStep[]): boolean {
  if (catalogSteps.length !== localSteps.length) return false;
  const sortedCatalog = [...catalogSteps].sort((a, b) => a.stepIndex - b.stepIndex);
  const sortedLocal = [...localSteps].sort((a, b) => a.stepIndex - b.stepIndex);
  return sortedCatalog.every((s, i) => {
    const l = sortedLocal[i];
    return (
      s.inputKey === l.inputKey &&
      s.inputValue === l.inputValue &&
      (s.pattern ?? "") === (l.pattern ?? "") &&
      s.type === l.type &&
      s.inputMode === l.inputMode
    );
  });
}

function computeState(offer: CatalogOffer, bundles: LocalBundle[] | undefined): OfferState {
  if (!bundles) return "NotAdded";
  const local = bundles.find((b) => b.price === offer.price);
  if (!local || local.patternSteps.length === 0) return "NotAdded";
  return stepsMatch(offer.steps, local.patternSteps) ? "Added" : "NeedsUpdate";
}

export default function SmartOffersMain({ userId }: { userId: string }) {
  const catalog = useQuery(api.features.serverPatternOffers.getAllActive, {});
  const bundles = useQuery(api.features.bundles.getAllBundles, { userId });
  const addOrReplace = useMutation(api.features.bundles.addOrReplaceFromCatalog);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleAdd = async (offer: CatalogOffer) => {
    setPendingId(offer._id);
    try {
      const res = await addOrReplace({ userId, offerId: offer._id });
      if (res.status === "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message ?? "Failed to add offer.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add offer.");
    }
    setPendingId(null);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-4 overflow-hidden">
        <div>
          <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
            Smart Offers
          </h2>
          <p className="text-sm text-neutral-400">
            Community-shared USSD offers. Add one to copy it into your own Offers.
          </p>
        </div>

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {catalog === undefined && <p className="text-sm text-neutral-400">Loading...</p>}
          {catalog?.length === 0 && (
            <p className="text-sm text-neutral-400">No community offers available yet.</p>
          )}
          {catalog?.map((offer) => {
            const state = computeState(offer as CatalogOffer, bundles as LocalBundle[] | undefined);
            const isPending = pendingId === offer._id;
            return (
              <div
                key={offer._id}
                className="border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">
                    {offer.name}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">
                    KES {offer.price} · {offer.ussdBaseCode} · {offer.offerType}
                  </p>
                </div>

                {state === "Added" ? (
                  <span className="text-xs px-3 py-1.5 rounded-md font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-center">
                    Added ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(offer as CatalogOffer)}
                    disabled={isPending}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium text-white disabled:opacity-50 ${
                      state === "NeedsUpdate" ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isPending ? "Saving..." : state === "NeedsUpdate" ? "Replace" : "Add to Offers"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
