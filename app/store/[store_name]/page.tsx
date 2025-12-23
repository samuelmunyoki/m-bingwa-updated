"use client";

import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Package,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogHeader, DialogFooter } from "@/components/ui/dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnimatedCheckmark from "@/components/ui/animated-check-mark";
import AnimatedXCircle from "@/components/ui/animated-x-mark";

function StoreNamePage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const extractSubdomain = () => {
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const hostnameParts = hostname.split(".");
        if (hostnameParts.length > 2) {
          return hostnameParts[0];
        } else if (hostnameParts.length === 2 && hostnameParts[0] !== "www") {
          return hostnameParts[0];
        }
      }
      return null;
    };

    const subdomain = extractSubdomain();

    if (subdomain) {
      setStoreName(subdomain);
    } else {
      router.push("/");
    }
    setIsLoading(false);
  }, [router]);

  const storeData = useQuery(
    api.features.stores.getStoreByStoreName,
    storeName ? { storeName } : "skip"
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!storeName) {
    return <StoreNotFound />;
  }

  if (storeData === undefined) {
    return <LoadingSpinner />;
  }

  if (storeData === null) {
    return <StoreNotFound />;
  }

  const { store, bundles } = storeData;

  const availableBundles = bundles.filter(
    (bundle) => bundle.status === "available"
  );

  const isNewOffer = (creationTime: number) => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return creationTime > threeDaysAgo;
  };

  if (store.status == "disabled" || store.status == "maintenance") {
    return <StoreStatus store={store} />;
  } else {
    return (
      <div className="flex flex-col h-screen w-full bg-gradient-to-b from-green-50 to-white">
        <StoreHeader storeName={storeName} />
        <div className="flex-grow flex flex-col overflow-hidden w-full">
          <StoreStatus store={store} />
          <div className="flex-grow flex flex-col overflow-hidden p-4 w-full">
            <h2 className="text-xl font-bold text-neutral-700">
              Available Bundles
            </h2>
            <AlternativePaymentMethod store={store} />
            <ScrollArea className="flex-grow w-full">
              {availableBundles.length > 0 ? (
                <BundleGrid
                  store={store}
                  bundles={availableBundles}
                  isNewOffer={isNewOffer}
                />
              ) : (
                <NoBundlesAvailable />
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  }
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center w-full h-[200px]">
      <div className="flex flex-row gap-2 justify-center h-full items-center">
        <svg
          aria-hidden="true"
          className="inline w-8 h-8 text-gray-200 animate-spin dark:text-green-600 fill-green-500"
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
      </div>
    </div>
  );
}

function StoreNotFound() {
  const router = useRouter();
  return (
    <div className="flex flex-col justify-center items-center w-full h-screen bg-gradient-to-b from-green-50 to-white">
      <Card className="w-full max-w-md bg-white border border-green-100">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="mr-2" />
            Store Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This store does not exist or has moved to a new location.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-colors duration-300"
            onClick={() => router.push("/")}
          >
            Return to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function StoreHeader({ storeName }: { storeName: string }) {
  return (
    <div className="bg-gradient-to-r from-green-400 to-neutral-600 shadow-md flex flex-col">
      <div className="w-full flex flex-col items-center m-3  text-center text-2xl font-bold tracking-wide uppercase text-white">
        {storeName}
        <span className="text-sm text-right font-normal lowercase -mt-6 -pt-4">
          <br></br>Store.
        </span>
      </div>
      <span className="text-white text-[10px] lg:text-md text-right">
        powered by M-Bingwa Solutions
      </span>
    </div>
  );
}

function StoreStatus({ store }: { store: any }) {
  if (store.status == "disabled" || store.status == "maintenance") {
    return (
      <div className="w-full flex flex-col items-center justify-center mt-8">
        <Alert
          variant="destructive"
          className="w-[350px] lg:w-1/4 bg-white border border-red-200"
        >
          <AlertCircle className="h-[20px] w-[20px]" />
          <AlertTitle className="capitalize text-lg tracking-wide">
            {store.status}
          </AlertTitle>
          <AlertDescription className="text-neutral-500">
            {store.statusDescription}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}

function AlternativePaymentMethod({ store }: { store: any }) {
  return (
    <span className="text-sm mb-6 text-center border-green-600 border  rounded-md mt-4 p-3">
      Alternative Payment Method<br></br>
      <span className="text-green-600 font-semibold tracking-wide">
        {store.paymentMethod}
      </span>{" "}
      {store.paymentAccount}
    </span>
  );
}

function BundleGrid({
  store,
  bundles,
  isNewOffer,
}: {
  store: any;
  bundles: any[];
  isNewOffer: (creationTime: number) => boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [payingNumber, setPayingNumber] = useState("");
  const [receivingNumber, setReceivingNumber] = useState("");
  const buyBundleAction = useAction(api.actions.transactions.payBundle);
  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);
  const [reshowValidationError, setreShowValidationError] = useState(false);

  const handlePurchase = async () => {
    setShowValidationError(true);
    setreShowValidationError(true);
    if (!payingNumber.match(/^0\d{9}$/) || !receivingNumber.match(/^0\d{9}$/)) {
      return;
    }
    
    
    setIsLoading(true);
    try {
      const res = await buyBundleAction({
        storeId: store._id,
        storeOwnerId: store.storeOwnerId,
        bundlesID: selectedBundle._id,
        bundlesPrice: selectedBundle.price,
        paymentMethod: store.paymentMethod,
        paymentAccount: store.paymentAccount,
        payingNumber,
        receivingNumber,
      });
      setResponseStatus(res.status);
      setResponseMessage(res.message);
    } catch (error) {
      setResponseStatus("error");
      setResponseMessage("Unexpected error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setSelectedBundle(null);
    setPayingNumber("");
    setReceivingNumber("");
    setResponseStatus(null);
    setResponseMessage("");
    setIsDialogOpen(false);
    setShowValidationError(false);
    setreShowValidationError(false);
  };

  const openDialog = (bundle: any) => {
    setSelectedBundle({
      ...bundle,
      storeId: bundle.storeId || bundle.store_id,
      storeOwnerId: bundle.storeOwnerId || bundle.store_owner_id,
    });
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
        {bundles.map((bundle) => (
          <Card
            key={bundle._id}
            className="w-full bg-white hover:shadow-lg transition-shadow duration-300 border border-green-100 overflow-hidden mr-4"
          >
            <CardHeader className="pb-2 bg-gradient-to-r from-green-400 to-neutral-600 relative">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-white">
                    {bundle.offerName}
                  </CardTitle>
                  <CardDescription className="text-sm text-white mt-1">
                    Bundle
                  </CardDescription>
                </div>
                {isNewOffer(bundle._creationTime) && (
                  <Badge className="bg-yellow-400 text-white absolute top-4 right-4">
                    New
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-2 pt-4">
              <div className="flex items-center mb-2">
                <Clock className="h-4 w-4 mr-2 text-green-600" />
                <span className="text-sm font-medium">
                  Validity: {bundle.duration}
                </span>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                <span className="text-sm font-medium">KES</span>
                <span className="text-2xl font-bold ml-1">
                  {bundle.price.toFixed(2)}
                </span>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-colors duration-300"
                onClick={() => openDialog(bundle)}
              >
                Purchase Now
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="w-[450px] mx-3 bg-white rounded-lg shadow-xl">
              <DialogHeader className="py-6 rounded-t-md bg-gradient-to-r from-green-400 to-neutral-600">
                <DialogTitle className="text-2xl font-normal text-white text-center">
                  Purchase of {selectedBundle?.offerName}
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
                  <div className="p-4 w-full">
                    <div className="items-center gap-4 my-3 w-full">
                      <h3 className="w-full text-center flex justify-center items-center">
                        <Clock className="h-4 w-4 mr-2 text-green-600" />{" "}
                        Duration:{" "}
                        <span className="ml-2"> {selectedBundle.duration}</span>
                      </h3>
                    </div>
                    <div className="items-center gap-4 w-full  my-3 ">
                      <h3 className="w-full text-center flex justify-center items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-green-600" />{" "}
                        Price:{" "}
                        <span className="ml-2">
                          {" "}
                          KES {selectedBundle.price.toFixed(2)}
                        </span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 px-4 my-3">
                      <Label
                        htmlFor="payingNumber"
                        className="text-right font-medium text-gray-700"
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
                    <div className="grid grid-cols-4 items-center gap-4 px-4 my-3">
                      <Label
                        htmlFor="receivingNumber"
                        className="text-right font-medium text-gray-700"
                      >
                        Receiving Number
                      </Label>
                      <Input
                        required
                        id="receivingNumber"
                        type="tel"
                        pattern="^0\d{9}$"
                        value={receivingNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (
                            value.length <= 10 &&
                            (value === "" || value.startsWith("0"))
                          ) {
                            setReceivingNumber(value);
                          }
                        }}
                        className="col-span-3 w-full"
                        placeholder="0XXXXXXXXX"
                      />
                    </div>
                    {reshowValidationError && !receivingNumber.match(/^0\d{9}$/) && (
                      <p className="text-red-500 text-sm mt-1 w-full text-center">
                        Receiving Number must be 10 digits and start with 0
                      </p>
                    )}
                  </div>
                  <DialogFooter className="px-12 gap-3 mb-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="mr-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePurchase}
                      type="submit"
                      className="bg-green-600 text-white hover:bg-green-700"
                      disabled={
                        !selectedBundle ||
                        !payingNumber ||
                        !receivingNumber ||
                        isLoading
                      }
                    >
                      {isLoading ? (
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
}

function NoBundlesAvailable() {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <Card className="w-full max-w-md bg-white border border-green-100">
        <CardHeader>
          <CardTitle className="flex items-center text-green-600">
            <Package className="mr-2" />
            No Bundles Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            There are currently no bundles available for purchase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default StoreNamePage;
