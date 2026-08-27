"use client";

import type React from "react";
import { useState, useCallback, useRef } from "react";
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
import { Clock } from "lucide-react";

// Matches the app's own list exactly (OfferBundleUtils.getOfferTypes()).
const OFFER_TYPES = ["Data", "SMS", "Minutes"] as const;

function formatTimeTo12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const period = h < 12 ? "am" : "pm";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayHour).padStart(2, "0")}:${mStr} ${period}`;
}

function formatTimeTo24h(time12: string): string {
  const parts = time12.trim().split(" ");
  if (parts.length < 2) return "";
  const [timePart, period] = parts;
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10);
  if (period === "pm" && h !== 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mStr}`;
}

type Bundle = {
  _id: Id<"bundles">;
  _creationTime: number;
  userId: string;
  status: "available" | "disabled";
  offerName: string;
  duration: string;
  price: number;
  bundlesUSSD: string;
  isMultiSession: boolean;
  dialingSIM: "SIM1" | "SIM2";
  commission?: number;
  offerType?: string;
  autoReschedule?: string;
  isSimpleUSSD?: boolean;
  responseValidatorText?: string;
  isPatternOffer?: boolean;
};

type EditBundleModalProps = {
  bundle: Bundle;
  onClose: () => void;
};

export function EditBundleModal({ bundle, onClose }: EditBundleModalProps) {
  const [offerName, setOfferName] = useState(bundle.offerName);
  const [bundlesUSSD, setBundlesUSSD] = useState(bundle.bundlesUSSD);
  const [price, setPrice] = useState(bundle.price.toString());
  const [commission, setCommission] = useState(bundle.commission?.toString() ?? "");
  const [status, setStatus] = useState(bundle.status);
  const [dialingSIM, setDialingSIM] = useState(bundle.dialingSIM);
  const [offerType, setOfferType] = useState(bundle.offerType ?? "Data");
  // Mode can no longer be changed from the edit screen — only the Settings bulk-flip on the
  // phone changes an offer's mode now. Always send back what's already stored, unchanged.
  const isMultiSession = bundle.isMultiSession;
  const isSimpleUSSD = bundle.isSimpleUSSD ?? false;
  const [autoReschedule, setAutoReschedule] = useState(bundle.autoReschedule ?? "");

  // Response Validator — no longer wired to anything (USSDProcessor.kt ignores it, superseded by
  // Pattern offers); UI removed, kept commented for an easy revert if ever needed.
  // const existingParts = bundle.responseValidatorText?.split(",") ?? [];
  // const [validatorStep, setValidatorStep] = useState(existingParts[0]?.trim() ?? "");
  // const [validatorText, setValidatorText] = useState(existingParts.slice(1).join(",").trim() ?? "");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeInputRef = useRef<HTMLInputElement>(null);

  const updateBundle = useMutation(api.features.bundles.updateBundle);

  const clearError = useCallback(() => {
    if (error) setError(null);
  }, [error]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      // Response Validator removed from the UI — no longer wired to anything on the app side.
      const responseValidatorText = "";

      try {
        const res = await updateBundle({
          id: bundle._id,
          userId: bundle.userId,
          offerName,
          duration: bundle.duration,
          bundlesUSSD,
          price: parseFloat(price),
          commission: commission ? parseFloat(commission) : undefined,
          status,
          isMultiSession,
          isSimpleUSSD,
          responseValidatorText,
          autoReschedule,
          dialingSIM,
          offerType: offerType as "Data" | "SMS" | "Minutes",
        });

        setIsSubmitting(false);

        if (res?.status === "error") {
          setError(res.message);
        } else {
          onClose();
          toast.success("Bundle updated successfully");
        }
      } catch {
        setIsSubmitting(false);
        setError("An error occurred. Please try again.");
      }
    },
    [
      updateBundle, bundle._id, bundle.userId, bundle.duration,
      offerName, bundlesUSSD, price, commission,
      status, isMultiSession, isSimpleUSSD,
      autoReschedule, dialingSIM, offerType, onClose,
    ]
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="rounded-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bundle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Offer Name */}
          <div>
            <Label htmlFor="offerName">Offer Name <span className="text-red-500">*</span></Label>
            <Input
              id="offerName"
              value={offerName}
              onChange={(e) => { setOfferName(e.target.value); clearError(); }}
              required
            />
          </div>

          {/* Offer Type */}
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

          {/* Price + Commission */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label htmlFor="commission">Commission (KES)</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => { setCommission(e.target.value); clearError(); }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* USSD Code */}
          <div>
            <Label htmlFor="bundlesUSSD">
              USSD Code <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-1">
              Use <code className="bg-muted px-1 rounded">NUMBER</code> as placeholder for the customer's phone number.
            </p>
            <Input
              id="bundlesUSSD"
              value={bundlesUSSD}
              onChange={(e) => { setBundlesUSSD(e.target.value); clearError(); }}
              disabled={bundle.isPatternOffer}
              required
            />
            {bundle.isPatternOffer && (
              <p className="text-xs text-muted-foreground mt-1">
                Pattern offer — USSD code is locked here
              </p>
            )}
          </div>

          {/* Response Validator removed — no longer wired to anything (see state declaration
              above for why). Was here, gated on {isMultiSession && (...)}, with Step/Expected
              Text inputs bound to validatorStep/validatorText. */}

          {/* Auto Reschedule */}
          <div>
            <Label>Auto Reschedule Time</Label>
            <p className="text-xs text-muted-foreground mb-1">
              If the customer already has this offer, retry at this time tomorrow.
            </p>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal pointer-events-none"
              >
                <span className={autoReschedule ? "text-foreground" : "text-muted-foreground"}>
                  {autoReschedule || "Select time"}
                </span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </Button>
              <input
                ref={timeInputRef}
                type="time"
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                value={autoReschedule ? formatTimeTo24h(autoReschedule) : ""}
                onChange={(e) => {
                  setAutoReschedule(e.target.value ? formatTimeTo12h(e.target.value) : "");
                  clearError();
                }}
              />
            </div>
          </div>

          {/* Dialing SIM + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dialingSIM">Dialing SIM <span className="text-red-500">*</span></Label>
              <Select value={dialingSIM} onValueChange={(v) => { setDialingSIM(v as "SIM1" | "SIM2"); clearError(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIM1">SIM 1</SelectItem>
                  <SelectItem value="SIM2">SIM 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
              <Select value={status} onValueChange={(v) => { setStatus(v as "available" | "disabled"); clearError(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Bundle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
