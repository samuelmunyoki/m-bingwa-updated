"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import Hero from "@/components/Hero";

export default function UserAuthDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user) return;
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      router.replace(`/dashboard/${user.id}`);
      return;
    }
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    client.query(api.users.getUserByEmail, { email })
      .then((dbUser) => {
        router.replace(`/dashboard/${dbUser?.userId ?? user.id}`);
      })
      .catch(() => {
        router.replace(`/dashboard/${user.id}`);
      });
  }, [isLoaded, user, router]);

  // Show Hero only for unauthenticated users
  if (isLoaded && !user) {
    return (
      <div className="w-screen overflo">
        <Hero />
      </div>
    );
  }

  return null;
}
