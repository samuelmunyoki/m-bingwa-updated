"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

// Kept in sync with the app's OfferBundleUtils.getOfferTypes() — the app only recognizes these three.
const OFFER_TYPES = ["Data", "SMS", "Minutes"] as const;

export function AddCustomOfferModal({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [offerName, setOfferName] = useState("");
  const [offerType, setOfferType] = useState("Data");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Same functions the Android app calls (see convex/features/customOffers.ts) — one shared
  // source of truth, no separate web-only mutations.
  const createCustomOffer = useMutation(api.features.customOffers.createCustomOfferFromAPI);
  const existingOffers = useQuery(api.features.customOffers.getCustomOffersByUserId, { userId });

  const clearError = useCallback(() => {
    if (error) setError(null);
  }, [error]);

  const resetForm = useCallback(() => {
    setOfferName("");
    setOfferType("Data");
    setPrice("");
    setError(null);
    setIsSubmitting(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const isDuplicate = existingOffers?.some(
      (o) => o.offerName.trim().toLowerCase() === offerName.trim().toLowerCase()
    );
    if (isDuplicate) {
      setError(`A custom offer named "${offerName}" already exists.`);
      setIsSubmitting(false);
      return;
    }

    try {
      await createCustomOffer({
        userId,
        offerName: offerName.trim(),
        offerType: offerType as "Data" | "SMS" | "Minutes",
        price: parseFloat(price),
        status: "available",
      });

      setIsSubmitting(false);
      resetForm();
      setIsOpen(false);
      toast.success("Custom offer created successfully");
    } catch {
      setIsSubmitting(false);
      setError("An error occurred. Please try again.");
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">Add Custom Offer</Button>
      </DialogTrigger>
      <DialogContent className="rounded-md">
        <DialogHeader>
          <DialogTitle>Add Custom Offer</DialogTitle>
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
              placeholder="e.g., Bonus Airtime"
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
              placeholder="0.00"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Custom Offer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
