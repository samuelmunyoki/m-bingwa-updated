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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <Card className="sm:max-w-[425px] w-[425px]">
        {!otpSent ? (
          <>
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                Add your agent phone number to link your account. An OTP will be
                sent to verify you own this number.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Agent Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isSending}
                />
              </div>
              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={() => onSendOtp(phoneNumber)}
                disabled={isSending || phoneNumber.trim().length === 0}
              >
                {isSending ? "Sending OTP..." : "Send OTP"}
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Verify Your Number</CardTitle>
              <CardDescription>
                Enter the 4-digit code sent to {phoneNumber}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={isVerifying}
                />
              </div>
              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={onBackToPhone} disabled={isVerifying}>
                Back
              </Button>
              <Button
                onClick={() => onVerifyOtp(otp)}
                disabled={isVerifying || otp.length !== 4}
              >
                {isVerifying ? "Verifying..." : "Verify & Save"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

export default CompleteProfileModal;
