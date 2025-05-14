"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";
import { SeparatorHorizontal } from "lucide-react";

function generateRandomCode(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

type UserSubscriptionModalProps = {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserSubscriptionModal({
  userId,
  open,
  onOpenChange,
}: UserSubscriptionModalProps) {
  const user = useQuery(api.users.getUserById, { userId });
  const updateSubscription = useMutation(api.users.updateSubscription);

  const [subscriptionEndDate, setSubscriptionEndDate] = React.useState<
    Date | undefined
  >(undefined);

  React.useEffect(() => {
    if (user?.subscriptionEnds) {
      setSubscriptionEndDate(new Date(user.subscriptionEnds * 1000));
    }
  }, [user?.subscriptionEnds]);

  if (!user) return null;

  const subscriptionStatus = user.isSubscribed ? "Active" : "Inactive";

  const handleUpdateSubscription = async () => {
    if (!subscriptionEndDate) return;

    try {
      const randomCode = generateRandomCode(16);
      const timestamp = Math.floor(subscriptionEndDate.getTime() / 1000);

      await updateSubscription({
        userId: userId,
        subscriptionEnds: timestamp,
        subscriptionId: `ADM_${randomCode}`,
        isSubscribed: true
      });

      toast.success("Subscription updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update subscription");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[425px] lg:w-[700px] rounded-[10px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal">
            User Subscription Details
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-2">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profileImage} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-semibold">{user.name}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-row gap-8">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Phone Number
                </Label>
                <p className="text-sm font-semibold mt-1">
                  {user.phoneNumber || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Subscription Status
                </Label>
                <p
                  className={`text-sm font-semibold mt-1 ${
                    subscriptionStatus === "Active"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {subscriptionStatus}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">
                Subscription End Date
              </Label>
              <div className="mt-1">
                <DateTimePicker
                  initialDate={subscriptionEndDate || new Date()}
                  onDateTimeChange={(date) => setSubscriptionEndDate(date)}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Subscription ID
              </Label>
              <p className="text-sm font-semibold mt-1">
                {user.subscriptionId || "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Admin Status
              </Label>
              <p className="text-sm font-semibold mt-1">
                {user.isAdmin ? "Admin" : "Regular User"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleUpdateSubscription}>
            Update Subscription
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
