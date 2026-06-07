"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { Loader2, ShieldAlert } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AppConfigMain() {
  const appConfig = useQuery(api.features.appConfig.get, {});
  const upsertAppConfig = useMutation(api.features.appConfig.upsert);

  const [minVersion, setMinVersion] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (appConfig?.minimumVersion) setMinVersion(appConfig.minimumVersion);
  }, [appConfig?.minimumVersion]);

  const isValidVersion = /^\d+\.\d+\.\d+$/.test(minVersion);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertAppConfig({ minimumVersion: minVersion });
      toast.success(`Minimum version set to ${minVersion}`);
    } catch {
      toast.error("Failed to update minimum version");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-1 h-full">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-6">
        <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium">
          App Config
        </h2>

        <div className="max-w-md space-y-6">

          {/* Minimum version card */}
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
              <ShieldAlert className="h-5 w-5" />
              Minimum App Version
            </div>

            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Users running a version <span className="font-medium text-neutral-700 dark:text-neutral-200">below this</span> will be
              completely blocked from using the app and forced to update before they can continue.
            </p>

            <div className="space-y-1">
              <p className="text-xs text-neutral-400">
                Current value:{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {appConfig === undefined ? "Loading..." : appConfig.minimumVersion}
                </span>
              </p>
            </div>

            <div className="flex gap-2 items-center">
              <Input
                value={minVersion}
                onChange={(e) => setMinVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                className="max-w-[160px] text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              />
              <Button
                size="sm"
                disabled={isSaving || !isValidVersion}
                onClick={handleSave}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>

            {minVersion && !isValidVersion && (
              <p className="text-xs text-red-500">Format must be X.Y.Z — e.g. 1.2.0</p>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-4 space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">How this works</p>
            <ul className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1 list-disc list-inside">
              <li>App checks this value every 5 days via network</li>
              <li>Cached locally — force check runs on every launch</li>
              <li>If user version &lt; minimum → app is blocked, must update</li>
              <li>If user version &lt; latest but ≥ minimum → dismissible update prompt</li>
              <li>Set with caution — do not set higher than your latest release</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
