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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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
};

type EditBundleModalProps = {
  bundle: Bundle;
  onClose: () => void;
};

export function EditBundleModal({ bundle, onClose }: EditBundleModalProps) {
  const [offerName, setOfferName] = useState(bundle.offerName);
  const [duration, setDuration] = useState(bundle.duration);
  const [bundlesUSSD, setBundlesUSSD] = useState(bundle.bundlesUSSD);
  const [price, setPrice] = useState(bundle.price.toString());
  const [status, setStatus] = useState(bundle.status);
  const [dialingSIM, setDialingSIM] = useState(bundle.dialingSIM);
  const [isMultiSession, setIsMultiSession] = useState(bundle.isMultiSession);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateBundle = useMutation(api.features.bundles.updateBundle);

  const clearError = useCallback(() => {
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        const res = await updateBundle({
          id: bundle._id,
          userId: bundle.userId,
          offerName,
          duration,
          bundlesUSSD,
          price: Number.parseFloat(price),
          status: status as "available" | "disabled",
          isMultiSession,
          dialingSIM: dialingSIM as "SIM1" | "SIM2",
        });
        setIsSubmitting(false);

        if (res.status === "error") {
          setError(res.message);
        } else {
          onClose();
          toast.success(res.message);
        }
      } catch (err) {
        setError(
          "An error occurred while updating the bundle. Please try again later."
        );
      }
    },
    [
      updateBundle,
      bundle._id,
      bundle.userId,
      offerName,
      duration,
      bundlesUSSD,
      price,
      status,
      isMultiSession,
      dialingSIM,
      onClose,

    ]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="rounded-md">
        <DialogHeader>
          <DialogTitle>Edit Bundle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="offerName">Offer Name</Label>
            <Input
              id="offerName"
              value={offerName}
              onChange={(e) => {
                setOfferName(e.target.value);
                clearError();
              }}
              required
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                clearError();
              }}
              required
            />
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                clearError();
              }}
              required
            />
          </div>
          <div>
            <Label htmlFor="bundlesUSSD">Bundles USSD</Label>
            <span className="text-sm text-muted-foreground">
              <br />
              Use template as *18*1*NUM*1*1#
            </span>
            <Input
              id="bundlesUSSD"
              type="text"
              value={bundlesUSSD}
              onChange={(e) => {
                setBundlesUSSD(e.target.value);
                clearError();
              }}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as "available" | "disabled");
                clearError();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Dialing SIM</Label>
            <Select
              value={dialingSIM}
              onValueChange={(value) => {
                setDialingSIM(value as "SIM1"|| "SIM2");
                clearError();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIM1">SIM 1</SelectItem>
                <SelectItem value="SIM2">SIM 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isMultiSession"
              checked={isMultiSession}
              onCheckedChange={(checked) => {
                setIsMultiSession(checked === true);
                clearError();
              }}
            />
            <div className="flex items-center gap-1">
              <Label htmlFor="isMultiSession" className="cursor-pointer">
                Multi-session
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Multi-session allows the bundle to be used across multiple
                      devices simultaneously. Single-session restricts usage to
                      one device at a time.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Bundle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
