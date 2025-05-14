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
import { CalendarDays, Clock, CreditCard, CalendarRange } from "lucide-react";

import React, { useCallback, useState } from "react";
import { AdminPriceSettings } from "./subscription-setting";
import { useAction, useQuery } from "convex/react";
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
  isSubscribed?: boolean
}

interface SettingsMainProps {
  user: dbUser;
}

const SubscriptionMain = ({ user }: SettingsMainProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const isInRange = useCallback(
    (date: Date) => {
      if (!selectedDate) return false;
      return isAfter(date, today) && isBefore(date, selectedDate);
    },
    [selectedDate]
  );

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate && (isAfter(newDate, today) || isSameDay(newDate, today))) {
      setSelectedDate(newDate);
    }
  };

  const subscriptionDays = selectedDate
    ? differenceInDays(selectedDate, today) + 1
    : 0;

  const getSubscriptionPrice = useQuery(
    api.features.subscription_price.querySubscriptionPrice
  );

  const isLoading = getSubscriptionPrice === undefined;

  let totalCharge = 0;
  if (getSubscriptionPrice !== undefined && getSubscriptionPrice !== null) {
    totalCharge = subscriptionDays * getSubscriptionPrice?.price;
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
    let timestamp: number;
    if (selectedDate) {
      timestamp = Math.floor(selectedDate.getTime() / 1000);
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
      <div className="flex flex-1 h-full ">
        <div className="p-6 md:p-5  md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white  dark:bg-neutral-900 flex flex-col gap-2 flex-1">
          <h2 className="text-lg text-neutral-600 font-medium mb-4">
            Subscriptions Management
          </h2>

          <ScrollArea className="h-full pr-4">
            <AdminPriceSettings
              isAdmin={user.isAdmin}
              currentPrice={getSubscriptionPrice?.price ?? 0}
            />
            {isLoading ? (
              <div className="flex flex-col justify-center items-center w-full h-[200px]">
                <div className="flex flex-row gap-2 justify-center h-full items-center">
                  <svg
                    aria-hidden="true"
                    className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-neutral-500"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span className="text-neutral-500 ">Loading ...</span>
                </div>
              </div>
            ) : getSubscriptionPrice === null ? (
              <div className="w-full mx-auto p-4 h-full ">
                <div className="flex flex-col items-center justify-center mt-3 space-y-4 text-center">
                  <h2 className="text-2xl font-bold">
                    Subscriptions Unavailable
                  </h2>
                  <p className="text-muted-foreground">
                    Please check again another time.
                  </p>
                </div>
              </div>
            ) : user.isSubscribed ? (
              <Card className="shadow-none border-none flex-1">
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>
                    Your subscription is active.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Remaining Days
                        </p>
                        <p className="text-base font-semibold">
                          {remainingDays} day{remainingDays !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CalendarRange className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Subscription Ends
                        </p>
                        <p className="text-base">
                          {user.subscriptionEnds
                            ? format(
                                new Date(user.subscriptionEnds * 1000),
                                "MMMM d, yyyy"
                              )
                            : "Not available"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 border rounded-md border-gray-300 p-4 mt-3">
                <Card className="shadow-none border-none flex-1">
                  <CardHeader>
                    <CardTitle>Personalized Subscription</CardTitle>
                    <CardDescription>
                      Set custom your subscription period.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleSelect}
                      disabled={(date) => isBefore(date, today)}
                      modifiers={{
                        today: (date) => isSameDay(date, today),
                        selected: (date) =>
                          selectedDate ? isSameDay(date, selectedDate) : false,
                        inRange: isInRange,
                      }}
                      modifiersStyles={{
                        today: { color: "black", fontWeight: "bold" },
                        selected: { backgroundColor: "green", color: "white" },
                        inRange: { backgroundColor: "#e5e7eb" },
                      }}
                      defaultMonth={selectedDate || today}
                    />
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    Pick the end date of your subscription.
                  </CardFooter>
                </Card>

                <Card className="shadow-none border-none flex-1">
                  <CardHeader>
                    <CardTitle className="font-normal text-xl">
                      Subscription Details
                    </CardTitle>
                    <CardDescription>Summary of your plan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <CalendarDays className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Start Date
                          </p>
                          <p className="text-base">
                            {format(today, "MMMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CalendarRange className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            End Date
                          </p>
                          <p className="text-base">
                            {selectedDate
                              ? format(selectedDate, "MMMM d, yyyy")
                              : "Not selected"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Duration
                          </p>
                          <p className="text-base">
                            {subscriptionDays} day
                            {subscriptionDays !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Total Charge
                          </p>
                          <p className="text-base font-semibold">
                            {totalCharge} KES
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-4">
                    <Button
                      disabled={!selectedDate}
                      className="w-full sm:w-auto"
                      onClick={() => openDialog()}
                    >
                      Purchase Subscription
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      {isDialogOpen && (
        <div className="fixed mx-3 inset-0 !p-0 bg-black/40 bg-opacity-50 z-40 flex items-center justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className=" bg-white rounded-lg shadow-xl">
              <DialogHeader className="pb-6 !m-0  rounded-t-md border-b-gray-200 border-b">
                <DialogTitle className="text-3xl font-normal text-center">
                  Subscription of {subscriptionDays} Days
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
    </>
  );
};

export default SubscriptionMain;
