import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./_providers/ConvexClientProvider";
import SyncUserWithConvex from "./_providers/SyncUserWithConvex";

const futuraFont = localFont({
  src: "../public/fonts/Futura Book font.ttf",
});

export const metadata: Metadata = {
  title: "M-Bingwa - Automation system for Bingwa Sokoni Merchants",
  description:
    "Automate your Bingwa customers subscriptions. Fast - Easy - Ready to use.",
    
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <meta name="theme-color" content="#000000" />
        <body
          className={`${futuraFont.className} antialiased  w-screen overflow-x-hidden flex flex-col align-center bg-gray-100/30`}
        >
          <ConvexClientProvider>
            <SyncUserWithConvex />
            {children}
            <Toaster />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
