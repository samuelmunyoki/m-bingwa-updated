"use client";

import AutoRetryError from "@/app/_components/AutoRetryError";

// Store segment boundary: keeps the store layout/nav mounted while a timed-out
// query on the store page retries and self-heals.
export default function StoreError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AutoRetryError reset={reset} />;
}
