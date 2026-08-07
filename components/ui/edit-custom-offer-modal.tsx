"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

// Kept in sync with the app's OfferBundleUtils.getOfferTypes() — the app only recognizes these three.
const OFFER_TYPES = ["Data", "SMS", "Minutes"] as const;

type CustomOffer = {
  _id: Id<"customOffers">;
  userId: string;
  offerName: string;
  offerType: string;
  price: number;
  status: "available" | "disabled";
};

type EditCustomOfferModalProps = {
  offer: CustomOffer;
  onClose: () => void;
};

export function EditCustomOfferModal({ offer, onClose }: EditCustomOfferModalProps) {
  const [offerName, setOfferName] = useState(offer.offerName);
  const [offerType, setOfferType] = useState(offer.offerType);
  const [price, setPrice] = useState(offer.price.toString());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same "FromAPI" mutation the Android app calls — it takes a plain string id, which an
  // Id<"customOffers"> is assignable to, so there's no need for a separate web-only mutation.
  const updateCustomOffer = useMutation(api.features.customOffers.updateCustomOfferFromAPI);

  const clearError = useCallback(() => {
    if (error) setError(null);
  }, [error]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        const res = await updateCustomOffer({
          id: offer._id,
          userId: offer.userId,
          offerName: offerName.trim(),
          offerType: offerType as "Data" | "SMS" | "Minutes",
          price: parseFloat(price),
        });

        setIsSubmitting(false);

        if (res?.status === "error") {
          setError(res.message);
        } else {
          onClose();
          toast.success("Custom offer updated successfully");
        }
      } catch {
        setIsSubmitting(false);
        setError("An error occurred. Please try again.");
      }
    },
    [updateCustomOffer, offer._id, offer.userId, offerName, offerType, price, onClose]
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="rounded-md">
        <DialogHeader>
          <DialogTitle>Edit Custom Offer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="offerName">Offer Name <span className="text-red-500">*</span></Label>
            <Input
              id="offerName"
              value={offerName}
              onChange={(e) => { setOfferName(e.target.value); clearError(); }}
              required
            />
          </div>

          <div>
            <Label htmlFor="offerType">Offer Type <span className="text-red-500">*</span></Label>
            <Select value={offerType} onValueChange={(v) => { setOfferType(v); clearError(); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="price">Price (KES) <span className="text-red-500">*</span></Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => { setPrice(e.target.value); clearError(); }}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
