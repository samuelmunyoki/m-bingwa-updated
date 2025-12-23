"use client";

import type React from "react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Doc, TableNames } from "@/convex/_generated/dataModel";
import { AlertCircle, Download, Upload } from "lucide-react";

type AllTablesData = {
  [K in TableNames]: Doc<K>[];
};

const ConvexMigration: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const downloadAllData = useMutation(api.features.migration.downloadAllData);
  const uploadAllData = useMutation(api.features.migration.uploadAllData);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setSuccess(false);

    try {
      const allData = await downloadAllData();
      const blob = new Blob([JSON.stringify(allData)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const currentTime = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `DB_Migration_${currentTime}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err) {
      setError("Failed to download data. Please try again.");
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent) as Partial<AllTablesData>;
      await uploadAllData(data);
      setSuccess(true);
    } catch (err) {
      setError("Failed to upload data. Please try again.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-1">
      <div className="p-6 md:p-5  md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-4 flex-1 w-full">
        <h2 className="text-lg text-neutral-600 font-medium dark:text-neutral-300">
          Convex Data Migration
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-green-500 w-full lg:w-[400px] hover:bg-green-600 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download All Data"}
            </Button>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              This will download a JSON file containing all your data. Store
              this file securely as it may contain sensitive information.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="fileUpload"
              />
              <label
                htmlFor="fileUpload"
                className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-500 hover:bg-red-600 text-white h-10 w-full lg:w-[400px] px-4 py-2 ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload Data"}
              </label>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Select the JSON file you previously downloaded to upload your
              data. This process will overwrite existing data in your Convex
              instance. Ensure you have a backup before proceeding.
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <p className="text-green-500">Operation completed successfully!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConvexMigration;
