"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

const VERSION = "1.0.0";

const FEATURES = [
  {
    emoji: "⚡",
    title: "Smart Bundle Automation",
    description:
      "Detects incoming M-Pesa payments and instantly delivers the matching bundle — automatically, even while you sleep.",
  },
  {
    emoji: "📱",
    title: "Remote USSD Dialer",
    description:
      "Execute USSD codes from any browser or device with full history, timestamps, and response logs.",
  },
  {
    emoji: "⏰",
    title: "Scheduler",
    description:
      "Schedule bundle deliveries at exact times with recurring support. Missed executions are caught automatically.",
  },
  {
    emoji: "🔄",
    title: "Smart Auto-Retry",
    description:
      "Configurable retry profiles re-attempt failed transactions — so no sale is ever lost to a network hiccup.",
  },
  {
    emoji: "👥",
    title: "Auto-Saver",
    description:
      "Bulk-import hundreds of contacts from CSV or VCF files with duplicate validation.",
  },
  {
    emoji: "🌐",
    title: "Bridge Mode",
    description:
      "Forward and sell bundles from multiple SIM cards via offline or online bridge mode.",
  },
  {
    emoji: "📊",
    title: "Statistics & Analytics",
    description:
      "Track commissions, top bundles, airtime usage, and new customers — all in real-time.",
  },
  {
    emoji: "💬",
    title: "Campaign Auto-Reply",
    description:
      "Auto-send branded SMS replies after every transaction with dynamic customer variables.",
  },
  {
    emoji: "🏪",
    title: "Multi-Store Management",
    description:
      "Run multiple stores with independent pricing, catalogues, and M-Pesa accounts.",
  },
  {
    emoji: "🚫",
    title: "Blacklist Protection",
    description:
      "Block specific numbers from transacting. Syncs automatically with this dashboard.",
  },
  {
    emoji: "🎟️",
    title: "Promo Codes",
    description:
      "Create discount codes with expiry dates and usage limits to reward loyal customers.",
  },
  {
    emoji: "☁️",
    title: "Real-Time Cloud Sync",
    description:
      "Everything syncs instantly between your phone and this web dashboard.",
  },
];

const CHANGELOG = [
  "Initial release — all core features included",
  "Smart M-Pesa message detection & bundle delivery",
  "Remote USSD dialer with full execution history",
  "Scheduler with exact alarm & WorkManager fallback",
  "Auto-retry with configurable profiles per offer",
  "Offline & online bridge mode support",
  "Bulk contact import from CSV and VCF",
  "Campaign auto-reply with dynamic message variables",
  "Multi-store and multi-phone-profile support",
  "Real-time sync with web dashboard",
];

export default function DownloadMain() {
  return (
    <ScrollArea className="w-full h-full">
      <div className="p-4 lg:p-8 space-y-8 max-w-4xl mx-auto pb-16">

        {/* ── Header card ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E232E] to-[#252C3A] border border-neutral-200 dark:border-neutral-700 p-8 text-center">
          {/* glow */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#4A6CF7] opacity-10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#1fc0f1] opacity-10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/20">
                <Image
                  src="/images/logo/logo.svg"
                  alt="M-Bingwa"
                  width={56}
                  height={56}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">M-Bingwa App</h1>
              <p className="text-neutral-400 text-sm mt-1">
                The Android companion for your bundle business
              </p>
            </div>

            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4A6CF7]/20 border border-[#4A6CF7]/40 text-[#61DAFB] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#61DAFB] animate-pulse" />
              Version {VERSION} — Latest
            </span>

            <p className="text-neutral-300 text-sm max-w-md mx-auto leading-relaxed">
              Install M-Bingwa on your Android phone to automate bundle delivery,
              run USSD codes, manage schedules, and keep everything in sync with
              this dashboard — 24/7, automatically.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/download/apk"
                target="_blank"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4A6CF7] to-[#1fc0f1] text-white font-semibold text-sm hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-[#4A6CF7]/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download APK
              </Link>
              <Link
                href="/download"
                target="_blank"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all"
              >
                View full page
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>

            <p className="text-neutral-500 text-xs">
              Free · Android APK · No Play Store required
            </p>
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "12+", label: "Features" },
            { value: "< 3s", label: "Bundle Delivery" },
            { value: "24/7", label: "Runs Automatically" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 text-center"
            >
              <div className="text-xl font-bold bg-gradient-to-r from-[#4A6CF7] to-[#1fc0f1] text-transparent bg-clip-text">
                {s.value}
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Features grid ───────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 mb-4">
            What's included
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-[#4A6CF7]/50 hover:bg-blue-50/30 dark:hover:bg-[#4A6CF7]/5 transition-all duration-200"
              >
                <div className="text-2xl mb-2">{f.emoji}</div>
                <h3 className="font-medium text-neutral-800 dark:text-neutral-100 text-sm mb-1">
                  {f.title}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Changelog ───────────────────────────────── */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
          <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 mb-4">
            What&apos;s new in v{VERSION}
          </h2>
          <ul className="space-y-2">
            {CHANGELOG.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#4A6CF7]/10 border border-[#4A6CF7]/30 flex items-center justify-center text-[#4A6CF7] text-xs">
                  ✓
                </span>
                <span className="text-neutral-600 dark:text-neutral-300 text-sm">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Install guide ───────────────────────────── */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
          <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 mb-4">
            📋 Installation guide
          </h2>
          <ol className="space-y-3">
            {[
              <>Tap <span className="font-medium text-neutral-800 dark:text-neutral-100">Download APK</span> above — the file downloads to your phone.</>,
              <>Open your phone&apos;s <span className="font-medium text-neutral-800 dark:text-neutral-100">Downloads folder</span> and tap the file.</>,
              <>If prompted, allow <span className="font-medium text-neutral-800 dark:text-neutral-100">Install from unknown sources</span> in settings.</>,
              <>Tap <span className="font-medium text-neutral-800 dark:text-neutral-100">Install</span> and wait a few seconds.</>,
              <>Open <span className="font-medium text-neutral-800 dark:text-neutral-100">M-Bingwa</span> and sign in with your account.</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 flex items-center justify-center text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                  {i + 1}
                </span>
                <span className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </ScrollArea>
  );
}
