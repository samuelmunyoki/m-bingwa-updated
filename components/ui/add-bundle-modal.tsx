"use client";

import type React from "react";
import { useState, useCallback, useRef } from "react";
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
import { toast, Toaster } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Clock } from "lucide-react";

const OFFER_TYPES = ["Data", "SMS", "Minutes", "Airtime", "Bundles", "Other"] as const;

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

export function AddBundleModal({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [offerName, setOfferName] = useState("");
  const [duration, setDuration] = useState("");
  const [bundlesUSSD, setBundlesUSSD] = useState("");
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [status, setStatus] = useState("available");
  const [dialingSIM, setDialingSIM] = useState("SIM1");
  const [offerType, setOfferType] = useState("Data");
  const [isMultiSession, setIsMultiSession] = useState(false);
  const [isSimpleUSSD, setIsSimpleUSSD] = useState(false);
  const [validatorStep, setValidatorStep] = useState("");
  const [validatorText, setValidatorText] = useState("");
  const [autoReschedule, setAutoReschedule] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeInputRef = useRef<HTMLInputElement>(null);

  const createBundle = useMutation(api.features.bundles.createBundleFromAPI);
  const existingBundles = useQuery(api.features.bundles.getAllBundles, { userId });
  const modeSettings = useQuery(api.features.userModeSettings.getUserModeSettings, { userId });

  const isNormalMode = modeSettings?.isNormalMode ?? true;
  const isMultiSessionAvailable = modeSettings?.isAdvancedMode ?? false;
  const isSimpleUSSDAvailable = modeSettings?.isSimpleMode ?? false;
  const showProcessingOptions = !isNormalMode;

  const clearError = useCallback(() => {
    if (error) setError(null);
  }, [error]);

  const resetForm = useCallback(() => {
    setOfferName("");
    setDuration("");
    setPrice("");
    setCommission("");
    setBundlesUSSD("");
    setStatus("available");
    setDialingSIM("SIM1");
    setOfferType("Data");
    setIsMultiSession(false);
    setIsSimpleUSSD(false);
    setValidatorStep("");
    setValidatorText("");
    setAutoReschedule("");
    setError(null);
    setIsSubmitting(false);
  }, []);

  const handleMultiSessionChange = (checked: boolean) => {
    setIsMultiSession(checked);
    if (checked) setIsSimpleUSSD(false);
    clearError();
  };

  const handleSimpleUSSDChange = (checked: boolean) => {
    setIsSimpleUSSD(checked);
    if (checked) setIsMultiSession(false);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const priceNum = parseFloat(price);
    const isDuplicate = existingBundles?.some((b) => b.price === priceNum);
    if (isDuplicate) {
      setError(`An offer with price KES ${priceNum.toFixed(2)} already exists.`);
      setIsSubmitting(false);
      return;
    }

    const responseValidatorText =
      isMultiSession && validatorStep && validatorText
        ? `${validatorStep},${validatorText}`
        : "";

    try {
      const res = await createBundle({
        userId,
        offerName,
        duration,
        price: priceNum,
        commission: commission ? parseFloat(commission) : undefined,
        status: status as "available" | "disabled",
        bundlesUSSD,
        isMultiSession,
        isSimpleUSSD,
        responseValidatorText,
        autoReschedule,
        dialingSIM: dialingSIM as "SIM1" | "SIM2",
        offerType: offerType as "Data" | "SMS" | "Minutes" | "Airtime" | "Bundles" | "Other",
      });

      setIsSubmitting(false);

      if (!res) {
        setError("Failed to create bundle. Name or price may already exist.");
      } else {
        resetForm();
        setIsOpen(false);
        toast.success("Bundle created successfully");
      }
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
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="default">Add Bundle</Button>
        </DialogTrigger>
        <DialogContent className="rounded-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Bundle</DialogTitle>
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
                placeholder="e.g., 1.5 GB - 3 Hrs"
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

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration <span className="text-red-500">*</span></Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => { setDuration(e.target.value); clearError(); }}
                placeholder="e.g., 24 Hours"
                required
              />
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
                  placeholder="0.00"
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
                Use <code className="bg-muted px-1 rounded">NUMBER</code> as placeholder for the customer's phone number, e.g. <code className="bg-muted px-1 rounded">*180*5*2*NUMBER*1*1#</code>
              </p>
              <Input
                id="bundlesUSSD"
                value={bundlesUSSD}
                onChange={(e) => { setBundlesUSSD(e.target.value); clearError(); }}
                placeholder="*180*5*2*NUMBER*1*1#"
                required
              />
            </div>

            {/* Processing Type */}
            <div className="space-y-2">
              <Label>Processing Type</Label>
              {showProcessingOptions ? (
                <>
                  {isMultiSessionAvailable && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isMultiSession"
                        checked={isMultiSession}
                        onCheckedChange={(c) => handleMultiSessionChange(c === true)}
                      />
                      <div className="flex items-center gap-1">
                        <Label htmlFor="isMultiSession" className="cursor-pointer font-normal">Multi-Session</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Multi-step USSD automation that navigates through multiple dialog screens.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                  {isSimpleUSSDAvailable && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isSimpleUSSD"
                        checked={isSimpleUSSD}
                        onCheckedChange={(c) => handleSimpleUSSDChange(c === true)}
                      />
                      <div className="flex items-center gap-1">
                        <Label htmlFor="isSimpleUSSD" className="cursor-pointer font-normal">Simple USSD</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Single-step USSD execution with no session management.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-2 rounded-md border p-3 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Normal Mode is active — USSD processing options are disabled. Change the mode on your device to enable Multi-Session or Simple USSD.</span>
                </div>
              )}
            </div>

            {/* Response Validator — only when Multi-Session */}
            {isMultiSession && (
              <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                <Label className="text-sm font-medium">Response Validator</Label>
                <p className="text-xs text-muted-foreground">
                  The step number and expected text in the USSD response to confirm success.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="validatorStep" className="text-xs">Step</Label>
                    <Input
                      id="validatorStep"
                      type="number"
                      value={validatorStep}
                      onChange={(e) => { setValidatorStep(e.target.value); clearError(); }}
                      placeholder="3"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="validatorText" className="text-xs">Expected Text</Label>
                    <Input
                      id="validatorText"
                      value={validatorText}
                      onChange={(e) => { setValidatorText(e.target.value); clearError(); }}
                      placeholder="250Mbs for 24 hours"
                    />
                  </div>
                </div>
              </div>
            )}

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
                <Select value={dialingSIM} onValueChange={(v) => { setDialingSIM(v); clearError(); }}>
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
                <Select value={status} onValueChange={(v) => { setStatus(v); clearError(); }}>
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
              {isSubmitting ? "Creating..." : "Create Bundle"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster />
    </>
  );
}
