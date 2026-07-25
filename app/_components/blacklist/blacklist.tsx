"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { ShieldBan } from "lucide-react";

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
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-2 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <ShieldBan className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium">Phone Number Blacklist</h2>
        </div>
        <div className="border-b border-neutral-200 dark:border-neutral-700 mb-2" />
        <div className="flex-1 overflow-y-auto">
          <div className="w-full lg:w-[560px] mx-auto">
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
          </div>
        </div>
      </div>
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
