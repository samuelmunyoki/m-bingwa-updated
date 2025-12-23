"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AdminPriceSettingsProps {
  isAdmin: boolean;
}

export function AdminPriceSettings({ isAdmin }: AdminPriceSettingsProps) {
  const subscriptionSettings = useQuery(
    api.features.subscription_price.querySubscriptionSettings
  );
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    "TILL"
  );
  const [paymentAccount, setPaymentAccount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updatePrice = useMutation(
    api.features.subscription_price.createOrUpdateSubscriptionPrice
  );

  useEffect(() => {
    if (subscriptionSettings) {
      setPrice(subscriptionSettings.price?.toString() ?? "");
      setPaymentMethod(subscriptionSettings.paymentMethod ?? "TILL");
      setPaymentAccount(subscriptionSettings.paymentAccount ?? "");
    }
  }, [subscriptionSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceInCents = Number.parseFloat(price);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setError("Please enter a valid price");
      return;
    }

    if (!paymentAccount) {
      setError("Please enter a payment account number");
      return;
    }

    try {
      const res = await updatePrice({
        price: priceInCents,
        paymentMethod,
        paymentAccount,
      });
      if (res.status === "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      setError("Failed to update settings. Please try again.");
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 p-6 border border-gray-200 rounded-lg">
      <h3 className="text-2xl font-semibold">Admin Price Settings</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="price">Price per day (KES)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price per day"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: "TILL" | "PAYBILL") =>
                setPaymentMethod(value)
              }
            >
              <SelectTrigger id="paymentMethod" className="w-full">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TILL">TILL</SelectItem>
                <SelectItem value="PAYBILL">PAYBILL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentAccount">Payment Account</Label>
            <Input
              id="paymentAccount"
              type="text"
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              placeholder={`Enter ${paymentMethod} number`}
              className="w-full"
            />
          </div>
        </div>
        <Button type="submit" className="px-6 w-full lg:w-[300px]">
          Update Settings
        </Button>
      </form>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
