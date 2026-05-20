"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Loader2, Plus, Trash2, Smartphone } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

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

const SettingsMain = ({ user }: SettingsMainProps) => {
  const [newPhone, setNewPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Use the Clerk ownerId to manage profiles
  const ownerId = user.userId;

  const profiles = useQuery(api.features.phoneProfiles.getProfilesByOwner, { ownerId });
  const createProfile = useMutation(api.features.phoneProfiles.createProfile);
  const deleteProfile = useMutation(api.features.phoneProfiles.deleteProfile);

  const handleAddPhone = async () => {
    if (!newPhone.match(/^0\d{9}$/)) {
      toast.warning("Phone number must be 10 digits and start with 0");
      return;
    }
    setIsAdding(true);
    try {
      const res = await createProfile({
        ownerId,
        phoneNumber: newPhone,
        displayName: displayName.trim() || newPhone,
      });
      if (res.status === "success") {
        toast.success("Phone number added successfully");
        setNewPhone("");
        setDisplayName("");
      } else {
        toast.error(res.message ?? "Failed to add phone number");
      }
    } catch {
      toast.error("Failed to add phone number");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    try {
      const res = await deleteProfile({ profileId, ownerId });
      if (res.status === "success") {
        toast.success("Phone number removed");
      } else {
        toast.error(res.message ?? "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove phone number");
    }
  };

  return (
    <div className="flex flex-1 h-full">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-6">
        <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium">
          Settings
        </h2>

        <div className="flex flex-col lg:flex-row w-full gap-8">

          {/* Add new phone number */}
          <div className="w-full lg:w-[420px] flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Add Phone Number
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Phone Number</Label>
                <Input
                  type="text"
                  placeholder="07xxxxxxxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Display Name <span className="text-neutral-400 font-normal">(optional)</span></Label>
                <Input
                  type="text"
                  placeholder='e.g. "Main", "Backup"'
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                />
              </div>
              <Button onClick={handleAddPhone} disabled={isAdding} className="w-full">
                {isAdding ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" />Add Phone Number</>
                )}
              </Button>
            </div>
          </div>

          {/* Registered phone numbers */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Registered Phone Numbers
            </h3>
            {profiles === undefined ? (
              <div className="flex items-center gap-2 text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-sm text-neutral-400">No phone numbers registered yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {profiles.map((profile) => (
                  <div
                    key={profile._id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-neutral-400" />
                      <div>
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {profile.displayName || profile.phoneNumber}
                        </p>
                        <p className="text-xs text-neutral-400">{profile.phoneNumber}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(profile.profileId)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMain;
