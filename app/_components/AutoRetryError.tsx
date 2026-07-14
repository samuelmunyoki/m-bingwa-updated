"use client";

import { useEffect } from "react";

/**
 * Shared UI for Next.js segment error boundaries (error.tsx).
 *
 * A Convex `useQuery` throws during render when the backend exceeds its 1s limit
 * (the RAM-starved self-hosted backend does this under load). Without a boundary,
 * that throw unmounts the whole React tree → a blank "client-side exception" page.
 * Each segment's error.tsx renders this instead and auto-retries every 4s: `reset()`
 * re-mounts the segment, giving the queries a fresh Convex subscription that
 * self-heals once the backend answers. Mirror of the AutoRetryBoundary used inside
 * the transactions component — it does NOT fix the timeouts (that's the backend RAM),
 * it just degrades gracefully instead of white-screening.
 */
export default function AutoRetryError({
  reset,
  label = "The server is busy. Retrying…",
}: {
  reset: () => void;
  label?: string;
}) {
  useEffect(() => {
    const t = setTimeout(() => reset(), 4000);
    return () => clearTimeout(t);
  }, [reset]);

  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 p-10 text-sm text-neutral-500 dark:text-neutral-400">
      <span>{label}</span>
      <button
        onClick={() => reset()}
        className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        Retry now
      </button>
    </div>
  );
}
