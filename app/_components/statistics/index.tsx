"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Zap,
  Package,
  BarChart2,
  Users,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 0 | 1 | 2; // 0=Daily (Sun-Sat), 1=Weekly (W1-W4), 2=Monthly (6 months)
type View = "overview" | "commission" | "airtime" | "bundles" | "sales" | "autosaver";

interface BarItem {
  label: string;
  value: number;
  fullName?: string;
}

// Validated categorical palette (see dataviz skill) — fixed rank-to-color assignment,
// shared with the Android app so a given bundle's rank always renders the same color.
const BUNDLE_SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const BUNDLE_OTHER_COLOR = "#9CA3AF";

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getTodayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getWeekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() - d.getDay() * 86_400_000; // Sunday
}

function getMonthStart(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function getMonthEnd(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); // exclusive
}

function get6MonthsAgoStart(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 5, 1).getTime();
}

// ─── Bar Generator (matches Android: Daily/Weekly/Monthly) ────────────────────

// Bucket boundaries for the Daily/Weekly/Monthly toggle — shared by genBars and
// the per-bundle stacked chart so both slice time identically.
function getBuckets(period: Period): { label: string; start: number; end: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  if (period === 0) {
    // Daily: 7 buckets Sun–Sat for the current week
    const weekStart = todayTs - today.getDay() * 86_400_000;
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => {
      const s = weekStart + i * 86_400_000;
      return { label, start: s, end: s + 86_400_000 };
    });
  }

  if (period === 1) {
    // Weekly: W1–W5 matching Java's Calendar.WEEK_OF_MONTH (weeks start on Sunday)
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const maxWeek = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
    return Array.from({ length: maxWeek }, (_, i) => {
      const w = i + 1;
      const startDay = Math.max(1, (w - 1) * 7 - firstDayOfWeek + 1);
      const endDay = Math.min(daysInMonth, w * 7 - firstDayOfWeek);
      const s = new Date(year, month, startDay).getTime();
      const e = new Date(year, month, endDay + 1).getTime();
      return { label: `W${w}`, start: s, end: e };
    });
  }

  // Monthly: past 6 months with abbreviated names
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    const s = d.getTime();
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    return { label: names[d.getMonth()], start: s, end: e };
  });
}

function genBars(
  period: Period,
  getValue: (start: number, end: number) => number
): BarItem[] {
  return getBuckets(period).map(({ label, start, end }) => ({ label, value: getValue(start, end) }));
}

// Overall range a period covers (matches Android's getBundleTimeRange): Daily→current
// week, Weekly→current month, Monthly→past 6 months. Used for period-aware bundle ranking.
function getPeriodRange(period: Period, weekStart: number, weekEnd: number, monthStart: number, monthEnd: number): [number, number] {
  if (period === 0) return [weekStart, weekEnd];
  if (period === 1) return [monthStart, monthEnd];
  return [get6MonthsAgoStart(), Date.now()];
}

function periodRangeLabel(period: Period): string {
  if (period === 0) return "this week";
  if (period === 1) return "this month";
  return "the last 6 months";
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtKsh(v: number): string {
  if (v >= 1_000_000) return `KSh ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KSh ${(v / 1_000).toFixed(1)}K`;
  return `KSh ${v.toFixed(0)}`;
}

// Full value with thousands separators and up to 1 decimal (e.g. "KSh 1,195.3"). Used where the
// exact figure matters (Today / This Week commission) rather than the abbreviated "1.2K".
function fmtKshFull(v: number): string {
  return `KSh ${v.toLocaleString("en-US", { maximumFractionDigits: 1 })}`;
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

function MiniBar({ data, color }: { data: BarItem[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-[2px] h-9 mt-1">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{
            height: `${Math.max((d.value / max) * 100, 6)}%`,
            backgroundColor: color,
            opacity: d.value === 0 ? 0.15 : 0.45 + (d.value / max) * 0.55,
          }}
        />
      ))}
    </div>
  );
}

// ─── Full Bar Chart ───────────────────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  formatter?: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-neutral-700 dark:text-neutral-200 mb-0.5">{label}</p>
      <p className="text-neutral-500">
        {formatter ? formatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
};

function FullChart({
  data,
  color,
  formatter,
}: {
  data: BarItem[];
  color: string;
  formatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          interval={data.length > 14 ? Math.floor(data.length / 7) : 0}
        />
        <Tooltip content={<CustomTooltip formatter={formatter} />} cursor={{ fill: "rgba(0,0,0,0.04)", radius: 4 }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={color}
              opacity={d.value === max && d.value > 0 ? 1 : d.value === 0 ? 0.12 : 0.5}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Stacked Bundle Comparison Chart ───────────────────────────────────────────
// Shared shape with Android's TopBundles chart: top-5 bundles each get a fixed
// rank-based color (see BUNDLE_SERIES_COLORS), everything else folds into "Other".

function StackedBundleTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
  series: { key: string; name: string; color: string }[];
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value > 0);
  if (rows.length === 0) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 shadow-xl text-xs min-w-[130px]">
      <p className="font-bold text-neutral-700 dark:text-neutral-200 mb-1">{label}</p>
      <div className="flex flex-col gap-1">
        {rows.map((p) => {
          const s = series.find((s) => s.key === p.dataKey);
          if (!s) return null;
          return (
            <div key={p.dataKey} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-neutral-500 truncate max-w-[110px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">{p.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackedBundleChart({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
}) {
  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-[170px] text-xs text-neutral-400">
        No bundle sales for this period.
      </div>
    );
  }
  return (
    <div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            interval={data.length > 14 ? Math.floor(data.length / 7) : 0}
          />
          <Tooltip content={<StackedBundleTooltip series={series} />} cursor={{ fill: "rgba(0,0,0,0.04)", radius: 4 }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="bundles"
              fill={s.color}
              radius={i === series.length - 1 ? [4, 4, 0, 0] as [number, number, number, number] : [0, 0, 0, 0] as [number, number, number, number]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[110px]">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  bars: BarItem[];
  color: string;
  gradient: string;
  border: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function StatCard({ title, value, subtitle, bars, color, gradient, border, icon, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-200 text-left w-full",
        "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        gradient, border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-white/70 dark:bg-white/10 shadow-sm">{icon}</div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{title}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
      <div className="mt-0.5">
        <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 leading-tight tracking-tight truncate">{value}</div>
        <div className="text-xs text-neutral-400 mt-0.5 font-medium truncate">{subtitle}</div>
      </div>
      <MiniBar data={bars} color={color} />
    </button>
  );
}

// ─── Period Toggle (Daily / Weekly / Monthly) ─────────────────────────────────

function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const labels = ["Daily", "Weekly", "Monthly"];
  return (
    <div className="flex items-center bg-gray-100 dark:bg-neutral-800 rounded-xl p-1 gap-0.5">
      {labels.map((l, i) => (
        <button
          key={i}
          onClick={() => onChange(i as Period)}
          className={cn(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150",
            period === i
              ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
              : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ─── Summary Numbers (TODAY / THIS WEEK / THIS MONTH) ─────────────────────────

function SummaryNumbers({ items }: { items: { label: string; value: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-1">
      {items.map((item, i) => (
        <div key={i} className="bg-gray-50 dark:bg-neutral-800 rounded-2xl p-3 text-center border border-neutral-100 dark:border-neutral-700">
          <div className={cn("text-lg font-bold leading-tight", item.color)}>{item.value}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5 font-semibold uppercase tracking-wide">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">{children}</h3>;
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

const TYPE_PILL: Record<string, string> = {
  Data: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  SMS: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Minutes: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Voice: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Airtime: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Bundles: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  Other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_PILL: Record<string, string> = {
  successful: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "not-viable": "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  disabled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function DetailRow({ label, sub, right, typeBadge, statusBadge, rank }: {
  label: string; sub?: string; right: string;
  typeBadge?: string; statusBadge?: string; rank?: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {rank !== undefined && (
          <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-[10px] font-bold text-neutral-500 flex items-center justify-center flex-shrink-0">
            {rank}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate">{label}</div>
          {sub && <div className="text-xs text-neutral-400 mt-0.5">{sub}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {typeBadge && (
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", TYPE_PILL[typeBadge] ?? TYPE_PILL.Other)}>
            {typeBadge}
          </span>
        )}
        {statusBadge && (
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold capitalize", STATUS_PILL[statusBadge] ?? "bg-gray-100 text-gray-500")}>
            {statusBadge.replace("-", " ")}
          </span>
        )}
        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{right}</span>
      </div>
    </div>
  );
}

// ─── Card Wrappers ────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-neutral-800 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-700">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-neutral-800 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-700">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

// ─── Empty / Loading States ───────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
        <BarChart2 className="h-6 w-6 text-neutral-300 dark:text-neutral-500" />
      </div>
      <p className="text-xs text-neutral-400 text-center max-w-[220px] leading-relaxed">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-gray-100 dark:bg-neutral-800" />)}
      </div>
      <div className="h-28 rounded-2xl bg-gray-100 dark:bg-neutral-800" />
    </div>
  );
}

// ─── Stats Computation ────────────────────────────────────────────────────────

type CommRec = { day: number; totalCommissionAmount: number; totalAirtimeUsed?: number | null };
type DayStat = { dayStart: number; successful: number; failed: number; total: number; offerCounts: Record<string, number> };
type MsgData = { dailyStats: DayStat[]; byStatus: Record<string, number>; totalMessages: number };
type ByTypeRec = { offerType: string; commissionAmount: number; salesCount: number };
type AutoRec = { day: number; savedCount: number; skippedCount: number };

function computeStats(
  commData: CommRec[] | undefined,
  msgData: MsgData | undefined,
  byTypeData: ByTypeRec[] | undefined,
  autoSaverData: AutoRec[] | undefined,
  period: Period
) {
  const comm = commData ?? [];
  const daily = msgData?.dailyStats ?? [];
  const byStatus = msgData?.byStatus ?? {};
  const totalMessages = msgData?.totalMessages ?? 0;
  const byType = byTypeData ?? [];
  const auto = autoSaverData ?? [];

  const todayStart = getTodayMidnight();
  const todayEnd = todayStart + 86_400_000;
  const weekStart = getWeekStart();
  const weekEnd = weekStart + 7 * 86_400_000;
  const monthStart = getMonthStart();
  const monthEnd = getMonthEnd();

  // ── Commission ──────────────────────────────────────────────────────────────
  const commInRange = (s: number, e: number) => comm.filter(r => r.day >= s && r.day < e);
  const sumComm = (recs: CommRec[]) => recs.reduce((t, r) => t + r.totalCommissionAmount, 0);
  const sumAirtime = (recs: CommRec[]) => recs.reduce((t, r) => t + (r.totalAirtimeUsed ?? 0), 0);

  const todayCommission = sumComm(commInRange(todayStart, todayEnd));
  const weekCommission = sumComm(commInRange(weekStart, weekEnd));
  const monthCommission = sumComm(commInRange(monthStart, monthEnd));
  const lastWeekCommission = sumComm(commInRange(weekStart - 7 * 86_400_000, weekStart));

  const todayAirtime = sumAirtime(commInRange(todayStart, todayEnd));
  const weekAirtime = sumAirtime(commInRange(weekStart, weekEnd));
  const monthAirtime = sumAirtime(commInRange(monthStart, monthEnd));

  const commBars = genBars(period, (s, e) => sumComm(commInRange(s, e)));
  const airtimeBars = genBars(period, (s, e) => sumAirtime(commInRange(s, e)));

  // ── Messages / Sales ────────────────────────────────────────────────────────
  const daysInRange = (s: number, e: number) => daily.filter(d => d.dayStart >= s && d.dayStart < e);
  const successCountIn = (s: number, e: number) => daysInRange(s, e).reduce((t, d) => t + d.successful, 0);

  const todaySales = successCountIn(todayStart, todayEnd);
  const weekSales = successCountIn(weekStart, weekEnd);
  const monthSales = successCountIn(monthStart, monthEnd);

  const salesBars = genBars(period, (s, e) => successCountIn(s, e));

  // Status breakdown — pre-aggregated on server
  const salesByStatus = byStatus;
  const totalMsgs = totalMessages;
  const successRate = totalMsgs > 0 ? Math.round((salesByStatus["successful"] ?? 0) / totalMsgs * 100) : 0;

  // ── Bundles ─────────────────────────────────────────────────────────────────
  // Ranking now follows the Daily/Weekly/Monthly toggle (matches Android) instead of
  // always being locked to the current calendar week.
  const [bundleRangeStart, bundleRangeEnd] = getPeriodRange(period, weekStart, weekEnd, monthStart, monthEnd);
  const bundleMap: Record<string, number> = {};
  daysInRange(bundleRangeStart, bundleRangeEnd).forEach(d => {
    Object.entries(d.offerCounts).forEach(([name, count]) => {
      bundleMap[name] = (bundleMap[name] ?? 0) + count;
    });
  });
  const bundleEntries = Object.entries(bundleMap).sort((a, b) => b[1] - a[1]);
  const topBundle: [string, number] = bundleEntries[0] ?? ["—", 0];
  const bundleTotalInPeriod = bundleEntries.reduce((t, [, c]) => t + c, 0);
  const bundleBars: BarItem[] = bundleEntries.slice(0, 6).map(([name, count]) => ({
    label: name.length > 7 ? name.slice(0, 7) + "…" : name,
    value: count,
    fullName: name,
  }));

  // Stacked per-bundle comparison: top 5 bundles (by total in the selected range) each
  // get their own series/color; everything else folds into a single "Other" series.
  const TOP_N = 5;
  const topBundleNames = bundleEntries.slice(0, TOP_N).map(([name]) => name);
  const hasOtherBundles = bundleEntries.length > TOP_N;
  const bundleSeries: { key: string; name: string; color: string }[] = topBundleNames.map((name, i) => ({
    key: `s${i}`,
    name,
    color: BUNDLE_SERIES_COLORS[i],
  }));
  if (hasOtherBundles) {
    bundleSeries.push({ key: "other", name: "Other", color: BUNDLE_OTHER_COLOR });
  }
  const bundleStackedBars: Record<string, string | number>[] = getBuckets(period).map(({ label, start, end }) => {
    const row: Record<string, string | number> = { label };
    const bucketOfferCounts: Record<string, number> = {};
    daysInRange(start, end).forEach(d => {
      Object.entries(d.offerCounts).forEach(([name, count]) => {
        bucketOfferCounts[name] = (bucketOfferCounts[name] ?? 0) + count;
      });
    });
    topBundleNames.forEach((name, i) => { row[`s${i}`] = bucketOfferCounts[name] ?? 0; });
    if (hasOtherBundles) {
      const otherTotal = Object.entries(bucketOfferCounts)
        .filter(([name]) => !topBundleNames.includes(name))
        .reduce((t, [, c]) => t + c, 0);
      row.other = otherTotal;
    }
    return row;
  });

  // ── AutoSaver ───────────────────────────────────────────────────────────────
  const autoInRange = (s: number, e: number) => auto.filter(r => r.day >= s && r.day < e);
  const sumSaved = (recs: AutoRec[]) => recs.reduce((t, r) => t + r.savedCount, 0);
  const sumSkipped = (recs: AutoRec[]) => recs.reduce((t, r) => t + r.skippedCount, 0);

  const todaySaved = sumSaved(autoInRange(todayStart, todayEnd));
  const weekSaved = sumSaved(autoInRange(weekStart, weekEnd));
  const monthSaved = sumSaved(autoInRange(monthStart, monthEnd));
  const totalSkipped = sumSkipped(auto);

  const autoSaverBars = genBars(period, (s, e) => sumSaved(autoInRange(s, e)));

  // ── By Type ─────────────────────────────────────────────────────────────────
  const typeMap: Record<string, { amount: number; count: number }> = {};
  byType.forEach(r => {
    if (!typeMap[r.offerType]) typeMap[r.offerType] = { amount: 0, count: 0 };
    typeMap[r.offerType].amount += r.commissionAmount;
    typeMap[r.offerType].count += r.salesCount;
  });
  const commByType = Object.entries(typeMap).map(([type, d]) => ({ type, ...d })).sort((a, b) => b.amount - a.amount);

  // ── Percent change ───────────────────────────────────────────────────────────
  const commPctChange = lastWeekCommission > 0
    ? ((weekCommission - lastWeekCommission) / lastWeekCommission * 100).toFixed(0)
    : weekCommission > 0 ? "+100" : "0";
  const commIsUp = weekCommission >= lastWeekCommission;

  return {
    // Commission
    todayCommission, weekCommission, monthCommission, lastWeekCommission,
    commPctChange, commIsUp, commBars,
    // Airtime
    todayAirtime, weekAirtime, monthAirtime, airtimeBars,
    // Sales
    todaySales, weekSales, monthSales, salesBars, salesByStatus, totalMsgs, successRate,
    // Bundles
    topBundle, bundleEntries, bundleBars, bundleTotalInPeriod, bundleSeries, bundleStackedBars,
    // AutoSaver
    todaySaved, weekSaved, monthSaved, totalSkipped, autoSaverBars,
    // By type
    commByType,
  };
}

type Stats = ReturnType<typeof computeStats>;

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({ stats, period, onNavigate }: { stats: Stats; period: Period; onNavigate: (v: View) => void }) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Commission Banner */}
      <button
        onClick={() => onNavigate("commission")}
        className="group flex flex-col gap-2 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-green-100/90 dark:from-emerald-950/40 dark:to-green-900/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-left w-full"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">This Week's Commission</span>
          <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">
          {fmtKsh(stats.weekCommission)}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={stats.commIsUp ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
            {stats.commIsUp ? "↑" : "↓"} {Math.abs(Number(stats.commPctChange))}% from last week
          </span>
          <span className="text-neutral-300">•</span>
          <span className="text-neutral-400">{fmtKsh(stats.lastWeekCommission)} prev</span>
        </div>
        <div className="text-[10px] text-emerald-600/60 font-medium mt-1">Tap for details →</div>
      </button>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="New Users"
          value={`${stats.weekSaved}`}
          subtitle={`↑ ${stats.todaySaved} today`}
          bars={stats.autoSaverBars}
          color="#10B981"
          gradient="bg-gradient-to-br from-emerald-50 to-green-100/90 dark:from-emerald-950/40 dark:to-green-900/20"
          border="border-emerald-200 dark:border-emerald-800/40"
          icon={<Users className="h-4 w-4 text-emerald-600" />}
          onClick={() => onNavigate("autosaver")}
        />
        <StatCard
          title="Top Bundles"
          value={stats.topBundle[0] === "—" ? "—" : stats.topBundle[0]}
          subtitle={`${stats.bundleTotalInPeriod} sold ${periodRangeLabel(period)}`}
          bars={stats.bundleBars.length ? stats.bundleBars : [{ label: "", value: 0 }]}
          color="#3B82F6"
          gradient="bg-gradient-to-br from-blue-50 to-indigo-100/90 dark:from-blue-950/40 dark:to-indigo-900/20"
          border="border-blue-200 dark:border-blue-800/40"
          icon={<Package className="h-4 w-4 text-blue-600" />}
          onClick={() => onNavigate("bundles")}
        />
        <StatCard
          title="Total Sales"
          value={`${stats.weekSales}`}
          subtitle="successful this week"
          bars={stats.salesBars}
          color="#F59E0B"
          gradient="bg-gradient-to-br from-amber-50 to-orange-100/90 dark:from-amber-950/40 dark:to-orange-900/20"
          border="border-amber-200 dark:border-amber-800/40"
          icon={<BarChart2 className="h-4 w-4 text-amber-600" />}
          onClick={() => onNavigate("sales")}
        />
        <StatCard
          title="Airtime Used"
          value={fmtKsh(stats.weekAirtime)}
          subtitle="This week"
          bars={stats.airtimeBars}
          color="#9C27B0"
          gradient="bg-gradient-to-br from-violet-50 to-purple-100/90 dark:from-violet-950/40 dark:to-purple-900/20"
          border="border-violet-200 dark:border-violet-800/40"
          icon={<Zap className="h-4 w-4 text-violet-600" />}
          onClick={() => onNavigate("airtime")}
        />
      </div>

      {/* AutoSaver Banner */}
      <button
        onClick={() => onNavigate("autosaver")}
        className="group flex items-center justify-between p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800/40 bg-gradient-to-r from-cyan-50 to-teal-100/90 dark:from-cyan-950/40 dark:to-teal-900/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-left w-full"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-white/10 shadow-sm">
            <Users className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">AutoSaver</div>
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 leading-tight tracking-tight">{stats.todaySaved}</div>
            <div className="text-xs text-neutral-400 font-medium mt-0.5">saved today</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28"><MiniBar data={stats.autoSaverBars} color="#06B6D4" /></div>
          <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>
    </div>
  );
}

// ─── Commission Detail ────────────────────────────────────────────────────────

function CommissionDetail({ stats, period, onPeriodChange }: { stats: Stats; period: Period; onPeriodChange: (p: Period) => void }) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers items={[
        { label: "Today", value: fmtKshFull(stats.todayCommission), color: "text-emerald-600" },
        { label: "This Week", value: fmtKshFull(stats.weekCommission), color: "text-emerald-600" },
        { label: "This Month", value: fmtKsh(stats.monthCommission), color: "text-neutral-500" },
      ]} />
      <ChartCard title="Progress">
        <div className="flex justify-end mb-3">
          <PeriodToggle period={period} onChange={onPeriodChange} />
        </div>
        <FullChart data={stats.commBars} color="#10B981" formatter={fmtKsh} />
      </ChartCard>
      <ListCard title="Details">
        {stats.commByType.length === 0 ? (
          <EmptyState message="Commission by offer type will appear here once your device syncs." />
        ) : (
          stats.commByType.map((item, i) => (
            <DetailRow
              key={i}
              rank={i + 1}
              label={`${item.type} Bundles`}
              sub={`${item.count} sale${item.count !== 1 ? "s" : ""} · ${((item.amount / stats.weekCommission) * 100).toFixed(1)}% of total`}
              right={fmtKsh(item.amount)}
              typeBadge={item.type}
            />
          ))
        )}
      </ListCard>
    </div>
  );
}

// ─── Airtime Detail ───────────────────────────────────────────────────────────

function AirtimeDetail({ stats, period, onPeriodChange }: { stats: Stats; period: Period; onPeriodChange: (p: Period) => void }) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers items={[
        { label: "Today", value: fmtKsh(stats.todayAirtime), color: "text-violet-600" },
        { label: "This Week", value: fmtKsh(stats.weekAirtime), color: "text-violet-600" },
        { label: "This Month", value: fmtKsh(stats.monthAirtime), color: "text-neutral-500" },
      ]} />
      <ChartCard title="Progress">
        <div className="flex justify-end mb-3">
          <PeriodToggle period={period} onChange={onPeriodChange} />
        </div>
        <FullChart data={stats.airtimeBars} color="#9C27B0" formatter={fmtKsh} />
      </ChartCard>
      <ListCard title="Details">
        {stats.airtimeBars.filter(b => b.value > 0).length === 0 ? (
          <EmptyState message="No airtime data for this period." />
        ) : (
          [...stats.airtimeBars].reverse().filter(b => b.value > 0).map((b, i) => (
            <DetailRow key={i} rank={i + 1} label={b.label} right={fmtKsh(b.value)} />
          ))
        )}
      </ListCard>
    </div>
  );
}

// ─── Bundles Detail ───────────────────────────────────────────────────────────

function BundlesDetail({ stats, period, onPeriodChange }: { stats: Stats; period: Period; onPeriodChange: (p: Period) => void }) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers items={[
        { label: "Top Seller", value: stats.topBundle[0] === "—" ? "—" : stats.topBundle[0].length > 10 ? stats.topBundle[0].slice(0, 10) + "…" : stats.topBundle[0], color: "text-blue-600" },
        { label: "Total Sold", value: `${stats.bundleTotalInPeriod}`, color: "text-blue-600" },
        { label: "Bundles", value: `${stats.bundleEntries.length}`, color: "text-neutral-500" },
      ]} />
      <ChartCard title="Comparison">
        <div className="flex justify-end mb-3">
          <PeriodToggle period={period} onChange={onPeriodChange} />
        </div>
        <StackedBundleChart data={stats.bundleStackedBars} series={stats.bundleSeries} />
      </ChartCard>
      <ListCard title="Details">
        {stats.bundleEntries.length === 0 ? (
          <EmptyState message="No bundle sales for this period." />
        ) : (
          stats.bundleEntries.map(([name, count]: [string, number], i: number) => (
            <DetailRow
              key={i}
              rank={i + 1}
              label={name}
              sub={i === 0 ? "Top seller" : `${Math.round((count / stats.bundleTotalInPeriod) * 100)}% of sales`}
              right={`${count} sold`}
            />
          ))
        )}
      </ListCard>
    </div>
  );
}

// ─── Sales Detail ─────────────────────────────────────────────────────────────

function SalesDetail({ stats, period, onPeriodChange }: { stats: Stats; period: Period; onPeriodChange: (p: Period) => void }) {
  const statusLabels: Record<string, string> = {
    successful: "Successful",
    failed: "Failed",
    pending: "Pending",
    "not-viable": "Not Viable",
    disabled: "Disabled",
  };
  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers items={[
        { label: "Today", value: `${stats.todaySales}`, color: "text-amber-600" },
        { label: "This Week", value: `${stats.weekSales}`, color: "text-amber-600" },
        { label: "This Month", value: `${stats.monthSales}`, color: "text-neutral-500" },
      ]} />
      <ChartCard title="Progress">
        <div className="flex justify-end mb-3">
          <PeriodToggle period={period} onChange={onPeriodChange} />
        </div>
        <FullChart data={stats.salesBars} color="#F59E0B" />
      </ChartCard>
      <ListCard title="Details">
        {Object.keys(stats.salesByStatus).length === 0 ? (
          <EmptyState message="No transactions for this period." />
        ) : (
          Object.entries(stats.salesByStatus)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .map(([status, count], i) => (
              <DetailRow
                key={i}
                rank={i + 1}
                label={statusLabels[status] ?? status}
                sub={`${Math.round(((count as number) / stats.totalMsgs) * 100)}% of total`}
                right={`${count}`}
                statusBadge={status}
              />
            ))
        )}
      </ListCard>
    </div>
  );
}

// ─── AutoSaver Detail ─────────────────────────────────────────────────────────

function AutoSaverDetail({ stats, period, onPeriodChange }: { stats: Stats; period: Period; onPeriodChange: (p: Period) => void }) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers items={[
        { label: "Today", value: `${stats.todaySaved}`, color: "text-cyan-600" },
        { label: "This Week", value: `${stats.weekSaved}`, color: "text-cyan-600" },
        { label: "This Month", value: `${stats.monthSaved}`, color: "text-neutral-500" },
      ]} />
      <ChartCard title="Progress">
        <div className="flex justify-end mb-3">
          <PeriodToggle period={period} onChange={onPeriodChange} />
        </div>
        <FullChart data={stats.autoSaverBars} color="#06B6D4" />
      </ChartCard>
      <ListCard title="Details">
        {stats.autoSaverBars.filter(b => b.value > 0).length === 0 ? (
          <EmptyState message="AutoSaver data will appear here once your device syncs." />
        ) : (
          [...stats.autoSaverBars].reverse().filter(b => b.value > 0).map((b, i) => (
            <DetailRow key={i} rank={i + 1} label={b.label} right={`${b.value} saved`} />
          ))
        )}
      </ListCard>
    </div>
  );
}

// ─── View Titles ──────────────────────────────────────────────────────────────

const VIEW_TITLES: Record<View, string> = {
  overview: "Dashboard",
  commission: "Commission",
  airtime: "Airtime Used",
  bundles: "Top Bundles",
  sales: "Total Sales",
  autosaver: "New Users",
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function StatisticsMain({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>(0);
  const [view, setView] = useState<View>("overview");

  // Always fetch 6 months of data — bar generators slice it per period client-side
  const startTs = get6MonthsAgoStart();
  const endTs = getTodayMidnight() + 86_400_000;

  const commData = useQuery(api.features.totalCommission.getByUserIdAndDateRange, {
    userId, startDay: startTs, endDay: endTs,
  });
  const msgData = useQuery(api.features.statistics.getMessagesForStats, {
    userId, startTime: startTs, endTime: endTs,
  });
  const byTypeData = useQuery(api.features.statistics.getCommissionByTypeInRange, {
    userId, startDay: startTs, endDay: endTs,
  });
  const autoSaverData = useQuery(api.features.statistics.getAutoSaverStatsInRange, {
    userId, startDay: startTs, endDay: endTs,
  });

  const stats = useMemo(
    () => computeStats(commData, msgData, byTypeData, autoSaverData, period),
    [commData, msgData, byTypeData, autoSaverData, period]
  );

  const isLoading = commData === undefined || msgData === undefined;

  return (
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="p-3 md:p-5 md:pl-8 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-4 flex-1 w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {view !== "overview" && (
            <button
              onClick={() => setView("overview")}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-neutral-500" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-neutral-700 dark:text-neutral-200">{VIEW_TITLES[view]}</h2>
            {view === "overview" && (
              <p className="text-xs text-neutral-400 font-medium">Your business performance</p>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {isLoading ? (
            <LoadingState />
          ) : view === "overview" ? (
            <Overview stats={stats} period={period} onNavigate={setView} />
          ) : view === "commission" ? (
            <CommissionDetail stats={stats} period={period} onPeriodChange={setPeriod} />
          ) : view === "airtime" ? (
            <AirtimeDetail stats={stats} period={period} onPeriodChange={setPeriod} />
          ) : view === "bundles" ? (
            <BundlesDetail stats={stats} period={period} onPeriodChange={setPeriod} />
          ) : view === "sales" ? (
            <SalesDetail stats={stats} period={period} onPeriodChange={setPeriod} />
          ) : (
            <AutoSaverDetail stats={stats} period={period} onPeriodChange={setPeriod} />
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
