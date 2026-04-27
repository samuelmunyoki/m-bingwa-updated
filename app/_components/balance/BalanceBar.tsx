"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { Smartphone, RefreshCw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceBarProps {
  userId: string;
}

export default function BalanceBar({ userId }: BalanceBarProps) {
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const prevStatus = useRef<string | null>(null);

  const createRequest = useMutation(api.features.balanceRequests.createBalanceRequest);
  const sendPush = useAction(api.actions.fcm.sendBalanceCheckPush);

  // Get FCM token to know if a device is registered
  const fcmRecord = useQuery(api.features.balanceRequests.getFcmToken, { userId });

  // Subscribe to latest balance request in real-time
  const latestRequest = useQuery(api.features.balanceRequests.getLatestBalanceRequest, { userId });

  // Detect when request completes
  useEffect(() => {
    if (!latestRequest) return;
    if (latestRequest.status === "completed" || latestRequest.status === "failed") {
      if (prevStatus.current === "pending") {
        setRequesting(false);
        setShow(true);
      }
    }
    prevStatus.current = latestRequest.status;
  }, [latestRequest?.status]);

  const handleCheckBalance = async () => {
    if (!fcmRecord?.token) return;
    setRequesting(true);
    setShow(false);
    prevStatus.current = "pending";
    try {
      const requestId = await createRequest({ userId, deviceId: fcmRecord.deviceId });
      await sendPush({ userId, requestId });
    } catch (e) {
      setRequesting(false);
    }
  };

  const handleHide = () => setShow(false);

  const noDevice = !fcmRecord?.token;
  const isCompleted = latestRequest?.status === "completed";
  const isFailed = latestRequest?.status === "failed";

  return (
    <div className="w-full px-1 mb-1">
      {/* Show results bar when balance is fetched */}
      {show && isCompleted && latestRequest ? (
        <div className="flex items-center justify-between bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Airtime Balance</p>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{latestRequest.airtimeBalance} KSh</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Bonga Points</p>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{latestRequest.bongaPoints}</p>
            </div>
            {latestRequest.expiryDate ? (
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Expires</p>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{latestRequest.expiryDate}</p>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckBalance}
              disabled={requesting}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Refresh balance"
            >
              <RefreshCw className="h-4 w-4 text-neutral-400" />
            </button>
            <button
              onClick={handleHide}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <EyeOff className="h-4 w-4 text-neutral-400" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* View Balance button */}
          <button
            onClick={handleCheckBalance}
            disabled={requesting || noDevice}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              requesting
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-wait"
                : noDevice
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md"
            )}
          >
            {requesting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Fetching balance...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                View Balance
              </>
            )}
          </button>

          {/* No device warning */}
          {noDevice && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Smartphone className="h-3.5 w-3.5" />
              Open the app on your phone first
            </div>
          )}

          {/* Failed state */}
          {isFailed && !requesting && (
            <p className="text-xs text-red-500">{latestRequest?.error ?? "Balance check failed"}</p>
          )}
        </div>
      )}
    </div>
  );
}
