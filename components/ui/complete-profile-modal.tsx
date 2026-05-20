"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface CompleteProfileModalProps {
  isOpen: boolean;
  isSending: boolean;
  isVerifying: boolean;
  otpSent: boolean;
  errorMessage?: string | null;
  onSendOtp: (phoneNumber: string) => void;
  onVerifyOtp: (otp: string) => void;
  onBackToPhone: () => void;
}

const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen,
  isSending,
  isVerifying,
  otpSent,
  errorMessage,
  onSendOtp,
  onVerifyOtp,
  onBackToPhone,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white text-neutral-900 rounded-xl border border-neutral-200 shadow-lg sm:max-w-[425px] w-[425px] p-6 flex flex-col gap-4">
        {!otpSent ? (
          <>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Complete Your Profile</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Add your agent phone number to link your account. An OTP will be sent to verify you own this number.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-sm font-medium text-neutral-700">Agent Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="e.g. 0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isSending}
                className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 disabled:opacity-50"
              />
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
            <div className="flex justify-end">
              <Button onClick={() => onSendOtp(phoneNumber)} disabled={isSending || phoneNumber.trim().length === 0}>
                {isSending ? "Sending OTP..." : "Send OTP"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Verify Your Number</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Enter the 4-digit code sent to {phoneNumber}.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="otp" className="text-sm font-medium text-neutral-700">Verification Code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="e.g. 1234"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                disabled={isVerifying}
                className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 disabled:opacity-50"
              />
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
            <div className="flex justify-between">
              <Button variant="outline" onClick={onBackToPhone} disabled={isVerifying}>Back</Button>
              <Button onClick={() => onVerifyOtp(otp)} disabled={isVerifying || otp.length !== 4}>
                {isVerifying ? "Verifying..." : "Verify & Save"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompleteProfileModal;
