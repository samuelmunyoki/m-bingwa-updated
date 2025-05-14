"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
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
}

interface SettingsMainProps {
  user: dbUser;
}

const PHONE_NUMBER_REGEX = /^0\d{9}$/;

export default function BlacklistManager({ user }: SettingsMainProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const blacklist = useQuery(api.features.blacklist.getPhoneNumbers, {
    userId: user.userId,
  });

  const addToBlacklist = useMutation(api.features.blacklist.addPhoneNumber);
  const removeFromBlacklist = useMutation(
    api.features.blacklist.removePhoneNumber
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PHONE_NUMBER_REGEX.test(phoneNumber)) {
      toast.warning("Please enter a 10-digit number starting with 0.");
      return;
    }
    await addToBlacklist({ phoneNumber, userId: user.userId });
    setPhoneNumber("");
    toast.success("The phone number has been added to the blacklist.");
  };

  const handleRemove = async (id: Id<"blacklist">) => {
    await removeFromBlacklist({ id });
    toast.success("The phone number has been removed from the blacklist.");
  };

  return (
    <div className="container w-full  lg:w-[560px] mx-auto p-4">
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle>Phone Number Blacklist</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter 10-digit number starting with 0"
              maxLength={10}
            />
            <Button type="submit" className="w-full">
              Add to Blacklist
            </Button>
          </form>
          <BlacklistedNumbers numbers={blacklist} onRemove={handleRemove} />
        </CardContent>
      </Card>
    </div>
  );
}

interface BlacklistedNumbersProps {
  numbers: { _id: Id<"blacklist">; phoneNumber: string }[] | undefined;
  onRemove: (id: Id<"blacklist">) => void;
}

function BlacklistedNumbers({ numbers, onRemove }: BlacklistedNumbersProps) {
  if (!numbers || numbers.length === 0) {
    return <p className="text-center mt-4">No numbers in the blacklist.</p>;
  }

  return (
    <ul className="mt-6 space-y-2">
      {numbers.map((item) => (
        <li key={item._id} className="flex justify-between items-center">
          <span>{item.phoneNumber}</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove(item._id)}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
