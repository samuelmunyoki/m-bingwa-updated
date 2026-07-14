"use client";

import AutoRetryError from "@/app/_components/AutoRetryError";

// Dashboard segment boundary: sits below the dashboard layout, so a query timeout
// here is caught WITHOUT unmounting the dashboard nav/shell (only the page content
// is replaced by the retry UI). Auto-recovers when the backend answers.
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AutoRetryError reset={reset} />;
}
