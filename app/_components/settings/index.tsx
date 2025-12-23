"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  IconDeviceFloppy,
  IconDeviceMobile,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect } from "react";
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
  const updatePhoneNumber = useMutation(api.users.updateAgentNumber);
  const createOtp = useMutation(api.features.otps.createOtp);
  const setCooldownTimer = useMutation(api.features.cooldown.setCooldownTimer);
  const cooldownExpiresAt = useQuery(api.features.cooldown.getCooldownTimer, {
    userId: user.userId,
  });

  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || "");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (cooldownExpiresAt !== undefined) {
      const now = Date.now();
      const remainingTime = Math.max(0, cooldownExpiresAt - now);
      setCountdown(Math.floor(remainingTime / 1000));
    }
  }, [cooldownExpiresAt]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSave = async () => {
    if (!phoneNumber.match(/^0\d{9}$/)) {
      toast.warning("Receiving Number must be 10 digits and start with 0");
      return;
    }
    try {
      const res = await updatePhoneNumber({
        userId: user.userId,
        phoneNumber,
      });
      if (res.status == "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Error updating agent data.");
    }
  };

  const handleAddNewDevice = async () => {
    try {
      await createOtp({ userId: user.userId, phoneNumber: user.phoneNumber! });
      const expiresAt = Date.now() + 60 * 1000; // 30 minutes from now
      await setCooldownTimer({ userId: user.userId, expiresAt });
      setCountdown(30 * 60); // 30 minutes in seconds
      toast.success(
        "4-digit OTP sent to your phone. Please verify in the M-Bingwa mobile app."
      );
    } catch (error) {
      toast.error("Error sending OTP.");
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const steps = [
    ["Add Agent Phone Number", "Confirm you set your own number"],
    ["Request OTP", "Click 'Add New Device' to receive 4-digit OTP"],
    ["Verify in Mobile App", "Open the mobile app to complete verification"],
  ];

  return (
    <div className="flex flex-1 h-full">
      <div className="p-6 md:p-5 md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-6 flex-1 w-full">
        <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium">
          Settings
        </h2>
        <div className="flex flex-col lg:flex-row w-full justify-between gap-6 px-10">
          <div className="w-full lg:w-[500px]">
            <div className="flex flex-col gap-3">
              <Label htmlFor="phoneNumber" className="dark:text-neutral-300">
                Agent Phone Number
              </Label>
              <Input
                type="text"
                placeholder="Enter phone number 07xxxxxxx"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full mt-4 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
            >
              <IconDeviceFloppy className="mr-2 h-5 w-5" />
              Save
            </Button>
          </div>
          <div className="w-full lg:w-[400px]">
            <Button
              className="w-full mb-4 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
              disabled={!user.phoneNumber || countdown > 0}
              onClick={handleAddNewDevice}
            >
              <IconDeviceMobile className="mr-2 h-5 w-5" />
              Add New Device
            </Button>
            {countdown > 0 && (
              <div className="mb-4 py-2 px-4 bg-neutral-800 dark:bg-blue-900 rounded-md flex items-center justify-between">
                <div className="flex items-center">
                  <IconClock className="mr-2 h-5 w-5 text-white" />
                  <span className="text-white">OTP Cooldown</span>
                </div>
                <span className="text-white">{formatTime(countdown)}</span>
              </div>
            )}
            <div className="relative pl-8 space-y-6 before:absolute before:left-4 before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-400 dark:before:bg-neutral-700">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="absolute  left-[-1.9rem] top-1 w-8 h-8 bg-white dark:bg-neutral-900 rounded-full text-white flex items-center justify-center">
                    <div
                      className={`w-6 h-6 ${
                        (index === 0 && user.phoneNumber) ||
                        (index === 1 && countdown > 0)
                          ? "bg-neutral-800"
                          : "bg-neutral-800 dark:bg-neutral-700"
                      } rounded-full text-white flex items-center justify-center text-sm`}
                    >
                      {(index === 0 && user.phoneNumber) ||
                      (index === 1 && countdown > 0) ? (
                        <IconCheck size={16} />
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>
                  <h3 className="font-medium pl-3 dark:text-neutral-300">
                    {step[0]}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-neutral-400 pl-3">
                    {step[1]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMain;
