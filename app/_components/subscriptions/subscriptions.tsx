import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  addDays,
  isAfter,
  isBefore,
  isSameDay,
  format,
  differenceInDays,
} from "date-fns";
import { CalendarDays, Clock, CreditCard, CalendarRange, AlertTriangle, BadgeCheck, Gift } from "lucide-react";

import React, { useCallback, useState, useEffect } from "react";
import { AdminPriceSettings } from "./subscription-setting";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AnimatedCheckmark from "@/components/ui/animated-check-mark";
import AnimatedXCircle from "@/components/ui/animated-x-mark";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Id } from "@/convex/_generated/dataModel";

interface dbUser {
  _id: Id<"users">;
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  profileImage: string;
  suspended: boolean;
  phoneNumber?: string;
  subscriptionEnds?: number;
  isSubscribed?: boolean;
}

interface SettingsMainProps {
  user: dbUser;
}

// ===== PHASE 5: SESSION AGE CONSTANT =====
const SESSION_MAX_AGE_DAYS = 5;

const SubscriptionMain = ({ user }: SettingsMainProps) => {
  // ===== PHASE 2 & 3: TIMESTAMP-AWARE DATES + EXTENSION FLOW =====
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For extensions: start from subscription end date (with exact timestamp)
  // For new subscriptions: start from current time
  const startDate = user.isSubscribed && user.subscriptionEnds
    ? new Date(user.subscriptionEnds * 1000) // Keep exact timestamp for extensions
    : new Date(); // Current timestamp for new subscriptions

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // ===== PHASE 5: SESSION AGE CHECKING =====
  const [showSessionAgeDialog, setShowSessionAgeDialog] = useState(false);
  const [sessionAgeDays, setSessionAgeDays] = useState(0);

  const checkSessionAge = () => {
    const loginTimestamp = localStorage.getItem("login_timestamp");
    if (!loginTimestamp) {
      // First login - set timestamp
      localStorage.setItem("login_timestamp", Date.now().toString());
      return true;
    }

    const ageInMs = Date.now() - parseInt(loginTimestamp);
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    setSessionAgeDays(ageInDays);

    return ageInDays <= SESSION_MAX_AGE_DAYS;
  };

  const handleLogout = () => {
    localStorage.removeItem("login_timestamp");
    window.location.href = "/sign-in";
  };

  // ===== PHASE 1: PROMO CODE SYSTEM =====
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [validatedPromo, setValidatedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoToValidate, setPromoToValidate] = useState<{ promoCode: string; userId: string } | null>(null);

  const applyPromoMutation = useMutation(
    api.features.promo_codes.applyPromoCodeStandalone
  );

  const validationResult = useQuery(
    api.features.promo_codes.validatePromoCode,
    promoToValidate ?? "skip"
  );

  useEffect(() => {
    if (!promoToValidate) return;
    if (validationResult === undefined) return; // still loading
    if (validationResult.status === "success" && validationResult.isValid) {
      setValidatedPromo(validationResult.data);
      setPromoError(null);
    } else {
      setPromoError(validationResult.error || "Invalid promo code");
      setValidatedPromo(null);
    }
    setPromoToValidate(null);
  }, [validationResult, promoToValidate]);

  const isValidatingPromo = promoToValidate !== null && validationResult === undefined;

  const handleValidatePromo = () => {
    if (promoCode.length !== 7) {
      setPromoError("Promo code must be exactly 7 characters");
      return;
    }
    setPromoError(null);
    setValidatedPromo(null);
    setPromoToValidate({ promoCode: promoCode.toUpperCase(), userId: user.userId });
  };

  const handleApplyPromo = async () => {
    if (!validatedPromo) return;

    setIsApplyingPromo(true);
    setPromoError(null);

    try {
      const result = await applyPromoMutation({
        userId: user.userId,
        promoCode: promoCode.toUpperCase(),
      });

      if (result.status === "success") {
        setPromoSuccess(result.message || "Promo code applied successfully!");
        setPromoCode("");
        setValidatedPromo(null);

        setTimeout(() => setPromoSuccess(null), 3000);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setPromoError(result.error || "Failed to apply promo code");
      }
    } catch (error: any) {
      setPromoError(error.message || "Failed to apply promo code");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleClearPromo = () => {
    setPromoCode("");
    setValidatedPromo(null);
    setPromoError(null);
    setPromoSuccess(null);
  };

  const isInRange = useCallback(
    (date: Date) => {
      if (!selectedDate) return false;
      const rangeStart = user.isSubscribed ? startDate : today;
      return isAfter(date, rangeStart) && isBefore(date, selectedDate);
    },
    [selectedDate, user.isSubscribed, startDate, today]
  );

  const handleSelect = (newDate: Date | undefined) => {
    const minDate = user.isSubscribed ? startDate : today;

    if (newDate && (isAfter(newDate, minDate) || isSameDay(newDate, minDate))) {
      setSelectedDate(newDate);
    }
  };

  // ===== PHASE 2: TIMESTAMP-AWARE DURATION CALCULATION =====
  const subscriptionDays = selectedDate
    ? (() => {
        // Normalize both dates to midnight for day counting
        const startMidnight = new Date(startDate);
        startMidnight.setHours(0, 0, 0, 0);

        const endMidnight = new Date(selectedDate);
        endMidnight.setHours(0, 0, 0, 0);

        const days = differenceInDays(endMidnight, startMidnight);

        // For new subscriptions (not extensions), add 1 day
        return user.isSubscribed ? days : days + 1;
      })()
    : 0;

  const getSubscriptionPrice = useQuery(
    api.features.subscription_price.querySubscriptionPrice
  );

  const isLoading = getSubscriptionPrice === undefined;
  const pricePerDay = getSubscriptionPrice?.price ?? 30;

  let totalCharge = 0;
  if (!isLoading) {
    totalCharge = subscriptionDays * pricePerDay;
  }

  const initiatePayment = useAction(
    api.actions.subscriptions.updateSubscription
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [payingNumber, setPayingNumber] = useState("");
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);

  const handlePurchase = async () => {
    setShowValidationError(true);
    if (!payingNumber.match(/^0\d{9}$/)) {
      return;
    }

    // ===== PHASE 5: SESSION AGE CHECK BEFORE PAYMENT =====
    if (!checkSessionAge()) {
      setShowSessionAgeDialog(true);
      return;
    }

    let timestamp: number;
    if (selectedDate) {
      // ===== PHASE 2: TIMESTAMP-AWARE END DATE =====
      // Set end date with SAME TIME as start date
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(startDate.getHours());
      endDateTime.setMinutes(startDate.getMinutes());
      endDateTime.setSeconds(startDate.getSeconds());
      timestamp = Math.floor(endDateTime.getTime() / 1000);
    } else {
      timestamp = Math.floor(Date.now() / 1000);
    }

    setIsModalLoading(true);
    try {
      const formattedPhoneNumber = `254${payingNumber.slice(1)}`;

      await initiatePayment({
        amount: `${Math.round(totalCharge)}`,
        phoneNumber: formattedPhoneNumber,
        subscriptionEnds: timestamp,
        userId: user.userId,
      });

      setResponseStatus("success");
      setResponseMessage(
        "Mpesa STK push was sent successfully. Enter your PIN to pay."
      );
    } catch (error) {
      setResponseStatus("error");
      setResponseMessage("Failed to send Mpesa STK push. Please try again.");
    } finally {
      setIsModalLoading(false);
    }
  };

  const resetDialog = () => {
    setPayingNumber("");
    setResponseStatus(null);
    setResponseMessage("");
    setShowValidationError(false);
  };

  const openDialog = () => {
    setIsDialogOpen(true);
  };

  const remainingDays = user.subscriptionEnds
    ? Math.max(
        0,
        Math.ceil(
          (user.subscriptionEnds * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <>
      <div className="flex flex-1 h-full">
        <div className="p-6 md:p-5 md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 overflow-hidden">

          {/* Page Header */}
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg text-neutral-600 font-medium">Subscriptions Management</h2>
          </div>
          <div className="border-b border-neutral-200 mb-4" />

          <ScrollArea className="flex-1 min-h-0 pr-4">
            <AdminPriceSettings isAdmin={user.isAdmin} currentPrice={pricePerDay} />

            {isLoading ? (
              <div className="flex flex-col justify-center items-center w-full h-[200px]">
                <div className="flex flex-row gap-2 justify-center h-full items-center">
                  <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-neutral-500" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                  </svg>
                  <span className="text-neutral-500">Loading ...</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">

                {/* Active Subscription Card */}
                {user.isSubscribed && (
                  <div className="border border-neutral-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BadgeCheck className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-neutral-700">Current Subscription</h3>
                      <span className="ml-auto text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Active</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 flex flex-col items-center justify-center border border-neutral-100 rounded-lg p-4">
                        <span className="text-4xl font-bold text-neutral-800">{remainingDays}</span>
                        <span className="text-sm text-gray-500 mt-1">day{remainingDays !== 1 ? "s" : ""} remaining</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarRange className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Subscription Ends</p>
                            <p className="text-sm font-medium text-neutral-700">
                              {user.subscriptionEnds
                                ? format(new Date(user.subscriptionEnds * 1000), "MMMM d, yyyy 'at' hh:mm a")
                                : "Not available"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Promo Code Section */}
                <div className="border border-neutral-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5 text-neutral-500" />
                    <h3 className="font-semibold text-neutral-700">Have a Promo Code?</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Redeem your promo code to extend your subscription for free</p>

                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        id="promoCode"
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          if (value.length <= 7) {
                            setPromoCode(value);
                            setPromoError(null);
                            setValidatedPromo(null);
                          }
                        }}
                        placeholder="Enter 7-character code"
                        className={`w-full font-mono ${promoCode.length === 7 && !promoError ? "border-green-400 focus-visible:ring-green-300" : ""}`}
                        disabled={isValidatingPromo || isApplyingPromo || !!promoSuccess}
                        maxLength={7}
                      />
                      <p className="text-xs text-gray-400">Format: 7 characters (letters and numbers)</p>
                    </div>

                    {!promoSuccess && !validatedPromo && (
                      <Button
                        onClick={handleValidatePromo}
                        disabled={promoCode.length !== 7 || isValidatingPromo}
                        type="button"
                        className="w-full sm:w-auto"
                      >
                        {isValidatingPromo ? "Validating..." : "Validate"}
                      </Button>
                    )}

                    {validatedPromo && !promoSuccess && (
                      <div className="flex gap-2">
                        <Button onClick={handleApplyPromo} disabled={isApplyingPromo} type="button" className="bg-green-600 hover:bg-green-700">
                          {isApplyingPromo ? "Applying..." : "Apply"}
                        </Button>
                        <Button onClick={handleClearPromo} variant="outline" disabled={isApplyingPromo} type="button">
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>

                  {promoError && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{promoError}</p>
                    </div>
                  )}

                  {validatedPromo && !promoSuccess && (
                    <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-md p-3">
                      <p className="text-sm font-semibold text-neutral-700">✓ Valid promo code</p>
                      <p className="text-sm text-neutral-600 mt-0.5">+{validatedPromo.validDays} days will be added to your subscription</p>
                      {validatedPromo.description && <p className="text-xs text-gray-500 mt-1">{validatedPromo.description}</p>}
                    </div>
                  )}

                  {promoSuccess && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm font-semibold text-green-700">✓ {promoSuccess}</p>
                    </div>
                  )}
                </div>

                {/* Calendar + Details — unified panel */}
                <div className="border border-neutral-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-5 h-5 text-neutral-500" />
                    <h3 className="font-semibold text-neutral-700">
                      {user.isSubscribed ? "Extend Subscription" : "Choose Your Plan"}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {user.isSubscribed ? "Pick an end date to add more days to your current subscription." : "Pick an end date for your new subscription."}
                  </p>

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Calendar */}
                    <div className="flex-1">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelect}
                        disabled={(date) => {
                          const minDate = user.isSubscribed ? startDate : today;
                          return isBefore(date, minDate) || isSameDay(date, minDate);
                        }}
                        modifiers={{
                          today: (date) => isSameDay(date, user.isSubscribed ? startDate : today),
                          selected: (date) => selectedDate ? isSameDay(date, selectedDate) : false,
                          inRange: isInRange,
                        }}
                        modifiersStyles={{
                          today: { backgroundColor: "black", color: "white", fontWeight: "bold" },
                          selected: { backgroundColor: "green", color: "white" },
                          inRange: { backgroundColor: "#e5e7eb" },
                        }}
                        defaultMonth={selectedDate || (user.isSubscribed ? startDate : today)}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-600 mb-3">
                          {user.isSubscribed ? "Extension Details" : "Subscription Details"}
                        </p>
                        <div className="divide-y divide-neutral-100">
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <CalendarDays className="w-4 h-4" />
                              {user.isSubscribed ? "Extension Starts" : "Start Date"}
                            </div>
                            <span className="text-sm font-medium text-neutral-700">
                              {format(startDate, "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <CalendarRange className="w-4 h-4" />
                              End Date
                            </div>
                            <span className="text-sm font-medium text-neutral-700">
                              {selectedDate
                                ? (() => {
                                    const endDateTime = new Date(selectedDate);
                                    endDateTime.setHours(startDate.getHours());
                                    endDateTime.setMinutes(startDate.getMinutes());
                                    endDateTime.setSeconds(startDate.getSeconds());
                                    return format(endDateTime, "MMM d, yyyy");
                                  })()
                                : "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              Duration
                            </div>
                            <span className="text-sm font-medium text-neutral-700">
                              {subscriptionDays > 0 ? `${subscriptionDays} day${subscriptionDays !== 1 ? "s" : ""}` : "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <CreditCard className="w-4 h-4" />
                              Total Charge
                            </div>
                            <span className="text-sm font-bold text-neutral-800">
                              {totalCharge > 0 ? `KES ${Math.round(totalCharge)}` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        disabled={!selectedDate}
                        className="w-full mt-4"
                        onClick={() => openDialog()}
                      >
                        {user.isSubscribed ? "Extend Subscription" : "Purchase Subscription"}
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* PAYMENT DIALOG */}
      {isDialogOpen && (
        <div className="fixed mx-3 inset-0 !p-0 bg-black/40 bg-opacity-50 z-40 flex items-center justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className=" bg-white rounded-lg shadow-xl">
              <DialogHeader className="pb-6 !m-0  rounded-t-md border-b-gray-200 border-b">
                <DialogTitle className="text-3xl font-normal text-center">
                  {user.isSubscribed ? "Extension" : "Subscription"} of {subscriptionDays} Days
                </DialogTitle>
              </DialogHeader>

              {responseStatus ? (
                <div className="p-6 rounded-b-md text-center w-full flex flex-col items-center justify-center">
                  <div className="flex justify-center items-center mb-4">
                    {responseStatus === "success" ? (
                      <AnimatedCheckmark />
                    ) : (
                      <AnimatedXCircle />
                    )}
                  </div>
                  <p className="text-lg mb-4">{responseMessage}</p>
                  <Button
                    onClick={resetDialog}
                    className="bg-green-600 text-white w-full mx-10 hover:bg-green-700"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <div className="p-4 w-full flex flex-col justify-center items-center">
                    <div className="items-center gap-4 w-full  my-3 ">
                      <h2 className="w-full text-center flex justify-center items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-black" />{" "}
                        Price: <span className="ml-2"> KES {totalCharge}</span>
                      </h2>
                    </div>

                    <div className="flex flex-col w-full items-center gap-4 px-4 my-3">
                      <Label
                        htmlFor="payingNumber"
                        className="text-left font-medium text-gray-700 w-full "
                      >
                        Paying Number
                      </Label>
                      <Input
                        required
                        id="payingNumber"
                        type="tel"
                        pattern="^0\d{9}$"
                        value={payingNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (
                            value.length <= 10 &&
                            (value === "" || value.startsWith("0"))
                          ) {
                            setPayingNumber(value);
                          }
                        }}
                        className="col-span-3 w-full"
                        placeholder="0XXXXXXXXX"
                      />
                    </div>
                    {showValidationError && !payingNumber.match(/^0\d{9}$/) && (
                      <p className="text-red-500 text-sm mt-1 w-full text-center">
                        Paying Number must be 10 digits and start with 0
                      </p>
                    )}
                  </div>
                  <DialogFooter className="px-8 gap-3 mb-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePurchase}
                      type="submit"
                      variant="default"
                      disabled={!payingNumber || isModalLoading}
                    >
                      {isModalLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        "Confirm Purchase"
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ===== PHASE 5: SESSION AGE DIALOG ===== */}
      {showSessionAgeDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <Dialog open={showSessionAgeDialog} onOpenChange={setShowSessionAgeDialog}>
            <DialogContent className="bg-white rounded-lg shadow-xl max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                  Session Expired
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-gray-700">
                  Your session has been active for {sessionAgeDays} days. For security
                  reasons, please logout and login again to purchase or extend your
                  subscription.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSessionAgeDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Logout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
};

export default SubscriptionMain;
