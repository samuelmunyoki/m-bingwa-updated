"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { Smartphone, RefreshCw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceBarProps {
  userId: string;
}

type Step = "idle" | "select_sim" | "loading" | "done";

export default function BalanceBar({ userId }: BalanceBarProps) {
  const [step, setStep] = useState<Step>("idle");
  const [selectedSim, setSelectedSim] = useState<"SIM1" | "SIM2" | null>(null);
  const prevStatus = useRef<string | null>(null);

  const createRequest = useMutation(api.features.balanceRequests.createBalanceRequest);
  const sendPush = useAction(api.actions.fcm.sendBalanceCheckPush);

  const fcmRecord = useQuery(api.features.balanceRequests.getFcmToken, { userId });
  const latestRequest = useQuery(api.features.balanceRequests.getLatestBalanceRequest, { userId });

  // Detect when request completes
  useEffect(() => {
    if (!latestRequest) return;
    if (
      prevStatus.current === "pending" &&
      (latestRequest.status === "completed" || latestRequest.status === "failed")
    ) {
      setStep("done");
    }
    prevStatus.current = latestRequest.status;
  }, [latestRequest?.status]);

  const handleSimSelect = async (sim: "SIM1" | "SIM2") => {
    if (!fcmRecord?.token) return;
    setSelectedSim(sim);
    setStep("loading");
    prevStatus.current = "pending";
    try {
      const requestId = await createRequest({
        userId,
        deviceId: fcmRecord.deviceId,
        simSlot: sim,
      });
      await sendPush({ userId, requestId, simSlot: sim });
    } catch {
      setStep("idle");
    }
  };

  const handleReset = () => {
    setStep("idle");
    setSelectedSim(null);
    prevStatus.current = null;
  };

  const noDevice = !fcmRecord?.token;
  const isCompleted = latestRequest?.status === "completed";
  const isFailed = latestRequest?.status === "failed";

  return (
    <div className="w-full px-1 mb-1">
      {/* Results bar */}
      {step === "done" && isCompleted && latestRequest ? (
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
            <div className="text-[10px] text-neutral-400">{selectedSim}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("select_sim")}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-neutral-400" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <EyeOff className="h-4 w-4 text-neutral-400" />
            </button>
          </div>
        </div>
      ) : step === "loading" ? (
        <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 shadow-sm">
          <RefreshCw className="h-4 w-4 text-emerald-500 animate-spin" />
          <span className="text-sm text-neutral-500 font-medium">Fetching balance on {selectedSim}...</span>
          {step === "done" && isFailed && (
            <span className="text-xs text-red-500 ml-2">{latestRequest?.error}</span>
          )}
        </div>
      ) : step === "select_sim" ? (
        <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-sm text-neutral-500 font-medium mr-1">Select SIM:</span>
          <button
            onClick={() => handleSimSelect("SIM1")}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
          >
            SIM 1
          </button>
          <button
            onClick={() => handleSimSelect("SIM2")}
            className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
          >
            SIM 2
          </button>
          <button
            onClick={handleReset}
            className="ml-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={() => !noDevice && setStep("select_sim")}
            disabled={noDevice}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              noDevice
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md"
            )}
          >
            <Eye className="h-4 w-4" />
            View Balance
          </button>
          {noDevice && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Smartphone className="h-3.5 w-3.5" />
              Open the app on your phone first
            </div>
          )}
          {step === "done" && isFailed && !noDevice && (
            <p className="text-xs text-red-500">{latestRequest?.error ?? "Balance check failed"}</p>
          )}
        </div>
      )}
    </div>
  );
}
