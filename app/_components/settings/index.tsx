"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Loader2, Plus, Trash2, Smartphone, ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
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

type Step = "form" | "otp";

const SettingsMain = ({ user }: SettingsMainProps) => {
  const [step, setStep] = useState<Step>("form");
  const [newPhone, setNewPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const ownerId = user.userId;

  const profiles = useQuery(api.features.phoneProfiles.getProfilesByOwner, { ownerId });
  const createProfile = useMutation(api.features.phoneProfiles.createProfile);
  const getOrCreate = useMutation(api.features.phoneProfiles.getOrCreateProfile);
  const deleteProfile = useMutation(api.features.phoneProfiles.deleteProfile);
  const verifyOtp = useMutation(api.features.otps.verifyOtp);
  const sendOtp = useAction(api.actions.phoneVerification.sendPhoneVerificationOtp);

  // Auto-migrate existing users
  useEffect(() => {
    if (profiles !== undefined && profiles.length === 0 && user.phoneNumber) {
      getOrCreate({ ownerId, phoneNumber: user.phoneNumber, displayName: "Main" }).catch(() => {});
    }
  }, [profiles, user.phoneNumber]);

  const handleSendOtp = async () => {
    if (!newPhone.match(/^0\d{9}$/)) {
      toast.warning("Phone number must be 10 digits and start with 0");
      return;
    }
    setIsSending(true);
    try {
      const res = await sendOtp({ phoneNumber: newPhone, userId: ownerId });
      if (res.success) {
        toast.success("OTP sent to " + newPhone);
        setStep("otp");
      } else {
        toast.error(res.message ?? "Failed to send OTP");
      }
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyAndAdd = async () => {
    if (otpCode.length !== 4) {
      toast.warning("Enter the 4-digit OTP");
      return;
    }
    setIsVerifying(true);
    try {
      const verified = await verifyOtp({ otpCode });
      if (!verified.success) {
        toast.error(verified.message ?? "Invalid OTP");
        return;
      }
      // OTP verified — add the phone profile
      const res = await createProfile({
        ownerId,
        phoneNumber: newPhone,
        displayName: displayName.trim() || newPhone,
      });
      if (res.status === "success") {
        toast.success("Phone number added successfully");
        setNewPhone("");
        setDisplayName("");
        setOtpCode("");
        setStep("form");
      } else {
        toast.error(res.message ?? "Failed to add phone number");
        setStep("form");
      }
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBack = () => {
    setStep("form");
    setOtpCode("");
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

          {/* Add phone — step 1: form OR step 2: OTP */}
          <div className="w-full lg:w-[420px] flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              Add Phone Number
            </h3>

            {step === "form" ? (
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
                <Button onClick={handleSendOtp} disabled={isSending} className="w-full">
                  {isSending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending OTP...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" />Send OTP</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Enter the 4-digit code sent to <span className="font-semibold text-neutral-700 dark:text-neutral-300">{newPhone}</span>
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white tracking-widest text-center text-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleBack} disabled={isVerifying} className="flex-1 dark:border-neutral-700 dark:text-neutral-300">
                    <ArrowLeft className="mr-2 h-4 w-4" />Back
                  </Button>
                  <Button onClick={handleVerifyAndAdd} disabled={isVerifying || otpCode.length !== 4} className="flex-1">
                    {isVerifying ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                    ) : (
                      "Verify & Add"
                    )}
                  </Button>
                </div>
              </div>
            )}
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
                {profiles.map((profile) => {
                  const isPrimary = profile.ownerId === ownerId;
                  return (
                    <div
                      key={profile._id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-4 w-4 text-neutral-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {profile.displayName || profile.phoneNumber}
                            </p>
                            {isPrimary && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400">{profile.phoneNumber}</p>
                        </div>
                      </div>
                      {!isPrimary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(profile.profileId)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMain;
