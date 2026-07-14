"use client";

import AutoRetryError from "@/app/_components/AutoRetryError";

// Root catch-all boundary: covers every page in the app that doesn't have a closer
// error.tsx. Turns a Convex query timeout (which throws during render) into a
// self-healing "server busy, retrying" state instead of a white screen.
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AutoRetryError reset={reset} />;
}
