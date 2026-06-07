import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { APP_VERSION as VERSION } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "Download M-Bingwa — Automation App for Bundle Merchants",
  description:
    "Download M-Bingwa for Android. Automate your Airtime, SMS & Data bundle business with smart USSD execution, M-Pesa detection, scheduling, and more.",
};

const FEATURES = [
  {
    emoji: "⚡",
    title: "Smart Bundle Automation",
    description:
      "Detects incoming M-Pesa payments and instantly delivers the matching bundle — zero manual work required, even while you sleep.",
  },
  {
    emoji: "📱",
    title: "Remote USSD Dialer",
    description:
      "Execute USSD codes from any browser or device. Full execution history with timestamps, status, and response logs.",
  },
  {
    emoji: "⏰",
    title: "Scheduler",
    description:
      "Schedule bundle deliveries at exact times with recurring support. Missed executions are caught and handled automatically.",
  },
  {
    emoji: "🔄",
    title: "Smart Auto-Retry",
    description:
      "Configurable retry profiles automatically re-attempt failed transactions — so no sale is ever lost to a network hiccup.",
  },
  {
    emoji: "👥",
    title: "Auto-Saver",
    description:
      "Bulk-import hundreds of contacts from CSV or VCF files. Validates duplicates and saves directly to your device contacts.",
  },
  {
    emoji: "🌐",
    title: "Bridge Mode",
    description:
      "Forward and sell bundles from multiple SIM cards using offline or online bridge mode — for maximum reach and coverage.",
  },
  {
    emoji: "📊",
    title: "Statistics & Analytics",
    description:
      "Track commissions by type, top-selling bundles, airtime usage, and new customers — all in real-time on your dashboard.",
  },
  {
    emoji: "💬",
    title: "Campaign Auto-Reply",
    description:
      "Automatically send branded SMS replies after every transaction with dynamic variables: customer name, amount, receipt, bundle details.",
  },
  {
    emoji: "🏪",
    title: "Multi-Store Management",
    description:
      "Run multiple stores with independent pricing, catalogues, and M-Pesa/Paybill accounts — all from one app.",
  },
  {
    emoji: "🚫",
    title: "Blacklist Protection",
    description:
      "Block specific numbers from transacting with you. Stays in sync with your web dashboard automatically.",
  },
  {
    emoji: "🎟️",
    title: "Promo Codes",
    description:
      "Create discount codes with expiry dates and usage limits to reward loyal customers and attract new ones.",
  },
  {
    emoji: "☁️",
    title: "Real-Time Cloud Sync",
    description:
      "Everything syncs instantly between your phone and the M-Bingwa web dashboard — manage your business from anywhere.",
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

function DownloadButton({ size = "default" }: { size?: "default" | "large" }) {
  const cls =
    size === "large"
      ? "inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-[#4A6CF7] to-[#1fc0f1] text-white font-bold text-xl shadow-2xl shadow-[#4A6CF7]/40 hover:opacity-90 hover:scale-105 transition-all duration-200"
      : "inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-[#4A6CF7] to-[#1fc0f1] text-white font-bold text-lg shadow-lg shadow-[#4A6CF7]/30 hover:opacity-90 hover:scale-105 transition-all duration-200";

  return (
    <Link href="/download/apk" className={cls}>
      <svg
        className={size === "large" ? "w-7 h-7" : "w-6 h-6"}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Download M-Bingwa
    </Link>
  );
}

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#1E232E] text-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative px-4 pt-20 pb-20 text-center overflow-hidden">
        {/* glow blobs */}
        <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-[#4A6CF7] opacity-[0.08] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-32 w-96 h-96 bg-[#1fc0f1] opacity-[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          {/* logo */}
          <div className="flex justify-center">
            <div className="p-3 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-sm">
              <Image
                src="/images/logo/logo.svg"
                alt="M-Bingwa"
                width={72}
                height={72}
                className="rounded-2xl"
              />
            </div>
          </div>

          {/* version pill */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4A6CF7]/20 border border-[#4A6CF7]/40 text-[#61DAFB] text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-[#61DAFB] animate-pulse" />
              Version {VERSION} — Latest Release
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Automate Your{" "}
            <span className="bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
              Bundle Business
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            M-Bingwa is the all-in-one Android app for Airtime, SMS &amp; Data
            bundle merchants. From the moment a customer pays — to the second
            their bundle lands — M-Bingwa handles it automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <DownloadButton />
            <span className="text-gray-500 text-sm">
              Android APK &middot; v{VERSION} &middot; Free to install
            </span>
          </div>

          {/* trust badges */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {["M-Pesa Ready", "Works Offline", "No Root Required", "Android 7+"].map(
              (badge) => (
                <span
                  key={badge}
                  className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs"
                >
                  {badge}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────── */}
      <div className="border-y border-white/10 bg-white/[0.03] py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { value: "12+", label: "Powerful Features" },
            { value: "< 3s", label: "Avg. Bundle Delivery" },
            { value: "24/7", label: "Runs Automatically" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#61DAFB] to-[#4A6CF7] text-transparent bg-clip-text">
                {s.value}
              </div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES GRID ────────────────────────────── */}
      <section className="px-4 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-[#61DAFB] to-[#4A6CF7] text-transparent bg-clip-text">
              scale your business
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            One app. Every tool a bundle merchant needs to sell faster, earn
            more, and stop doing things manually.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#4A6CF7]/50 hover:bg-[#4A6CF7]/[0.06] transition-all duration-300"
            >
              <div className="text-4xl mb-4">{f.emoji}</div>
              <h3 className="font-semibold text-white text-lg mb-2">
                {f.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section className="px-4 py-20 bg-white/[0.03] border-y border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Up and running in 3 steps
            </h2>
            <p className="text-gray-400">
              Install once. Earn automatically from that moment on.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Download & Install",
                desc: "Download the APK and install it on your Android phone. No Play Store needed — takes under two minutes.",
              },
              {
                step: "02",
                title: "Add Your Bundles",
                desc: "Sign in, add your bundle offers with USSD codes and prices, and link your M-Pesa number.",
              },
              {
                step: "03",
                title: "Start Earning",
                desc: "M-Bingwa watches your M-Pesa messages and delivers bundles instantly — automatically, 24 hours a day.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#4A6CF7] to-[#1fc0f1] flex items-center justify-center font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="font-semibold text-white text-lg">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHANGELOG + BOTTOM CTA ───────────────────── */}
      <section className="px-4 py-24 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            What&apos;s in v{VERSION}
          </h2>
          <p className="text-gray-400 text-sm">First major release — packed with everything</p>
        </div>

        <ul className="space-y-3 mb-14">
          {CHANGELOG.map((item) => (
            <li key={item} className="flex items-start gap-3 text-gray-300">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#4A6CF7]/20 border border-[#4A6CF7]/50 flex items-center justify-center text-[#61DAFB] text-xs">
                ✓
              </span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-3">
          <DownloadButton size="large" />
          <p className="text-gray-500 text-sm">
            Free &middot; Android APK &middot; v{VERSION}
          </p>
        </div>
      </section>

      {/* ── INSTALL GUIDE ────────────────────────────── */}
      <section className="px-4 pb-20 max-w-xl mx-auto">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-7 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <h3 className="font-semibold text-white text-lg">
              Installation guide
            </h3>
          </div>
          <ol className="space-y-3 text-gray-400 text-sm list-none">
            {[
              <>Tap <span className="text-white font-medium">Download M-Bingwa</span> above — the APK file downloads to your phone.</>,
              <>Open your phone&apos;s <span className="text-white font-medium">Downloads folder</span> and tap the file.</>,
              <>If prompted, tap <span className="text-white font-medium">Settings</span> and allow <span className="text-white font-medium">Install from unknown sources</span>.</>,
              <>Tap <span className="text-white font-medium">Install</span> and wait a few seconds.</>,
              <>Open <span className="text-white font-medium">M-Bingwa</span> and sign in with your account.</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-gray-300 font-medium">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-gray-500 text-sm">
        <p>
          &copy; {new Date().getFullYear()} M-Bingwa &middot; Automation tool
          for Airtime, SMS &amp; Data Bundle Merchants
        </p>
      </footer>
    </main>
  );
}
