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

type Period = 0 | 1 | 2;
type View = "overview" | "commission" | "airtime" | "bundles" | "sales" | "autosaver";

interface BarItem {
  label: string;
  value: number;
  fullName?: string;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getTodayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function tsToMidnight(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(ts: number, period: Period): string {
  const d = new Date(ts);
  if (period === 1) return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
  return `${d.getDate()}`;
}

// ─── Bar Generators ───────────────────────────────────────────────────────────

function genCommBars(
  records: { day: number; totalCommissionAmount: number; totalAirtimeUsed?: number | null }[],
  period: Period,
  field: "totalCommissionAmount" | "totalAirtimeUsed"
): BarItem[] {
  const days = period === 0 ? 1 : period === 1 ? 7 : 30;
  const today = getTodayMidnight();
  return Array.from({ length: days }, (_, i) => {
    const dayTs = today - (days - 1 - i) * 86_400_000;
    const rec = records.find((r) => tsToMidnight(r.day) === dayTs);
    const val =
      field === "totalAirtimeUsed"
        ? (rec?.totalAirtimeUsed ?? 0)
        : (rec?.totalCommissionAmount ?? 0);
    return { label: days === 1 ? "Today" : dayLabel(dayTs, period), value: val };
  });
}

function genMsgBars(
  messages: { time: number; processed?: string | null }[],
  period: Period
): BarItem[] {
  const days = period === 0 ? 1 : period === 1 ? 7 : 30;
  const today = getTodayMidnight();
  return Array.from({ length: days }, (_, i) => {
    const dayTs = today - (days - 1 - i) * 86_400_000;
    const dayEnd = dayTs + 86_400_000;
    const count = messages.filter(
      (m) => m.time >= dayTs && m.time < dayEnd && m.processed === "successful"
    ).length;
    return { label: days === 1 ? "Today" : dayLabel(dayTs, period), value: count };
  });
}

function genAutoSaverBars(
  records: { day: number; savedCount: number }[],
  period: Period
): BarItem[] {
  const days = period === 0 ? 1 : period === 1 ? 7 : 30;
  const today = getTodayMidnight();
  return Array.from({ length: days }, (_, i) => {
    const dayTs = today - (days - 1 - i) * 86_400_000;
    const rec = records.find((r) => tsToMidnight(r.day) === dayTs);
    return { label: days === 1 ? "Today" : dayLabel(dayTs, period), value: rec?.savedCount ?? 0 };
  });
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtKsh(v: number): string {
  if (v >= 1_000_000) return `KSh ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KSh ${(v / 1_000).toFixed(1)}K`;
  return `KSh ${v.toFixed(0)}`;
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
      <BarChart
        data={data}
        barCategoryGap="25%"
        margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
      >
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          interval={data.length > 14 ? Math.floor(data.length / 7) : 0}
        />
        <Tooltip
          content={<CustomTooltip formatter={formatter} />}
          cursor={{ fill: "rgba(0,0,0,0.04)", radius: 4 }}
        />
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

function StatCard({
  title,
  value,
  subtitle,
  bars,
  color,
  gradient,
  border,
  icon,
  onClick,
}: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-200 text-left w-full",
        "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        gradient,
        border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-white/70 dark:bg-white/10 shadow-sm">
            {icon}
          </div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            {title}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
      <div className="mt-0.5">
        <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 leading-tight tracking-tight">
          {value}
        </div>
        <div className="text-xs text-neutral-400 mt-0.5 font-medium truncate">{subtitle}</div>
      </div>
      <MiniBar data={bars} color={color} />
    </button>
  );
}

// ─── Period Toggle ────────────────────────────────────────────────────────────

function PeriodToggle({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  const labels = ["Today", "Week", "Month"];
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

// ─── Summary Numbers ──────────────────────────────────────────────────────────

function SummaryNumbers({
  items,
}: {
  items: { label: string; value: string; color: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-1">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-gray-50 dark:bg-neutral-800 rounded-2xl p-3 text-center border border-neutral-100 dark:border-neutral-700"
        >
          <div className={cn("text-lg font-bold leading-tight", item.color)}>{item.value}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5 font-semibold uppercase tracking-wide">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
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

function DetailRow({
  label,
  sub,
  right,
  typeBadge,
  statusBadge,
  rank,
}: {
  label: string;
  sub?: string;
  right: string;
  typeBadge?: string;
  statusBadge?: string;
  rank?: number;
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
          <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate">
            {label}
          </div>
          {sub && <div className="text-xs text-neutral-400 mt-0.5">{sub}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {typeBadge && (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold",
              TYPE_PILL[typeBadge] ?? TYPE_PILL.Other
            )}
          >
            {typeBadge}
          </span>
        )}
        {statusBadge && (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold capitalize",
              STATUS_PILL[statusBadge] ?? "bg-gray-100 text-gray-500"
            )}
          >
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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
        <BarChart2 className="h-6 w-6 text-neutral-300 dark:text-neutral-500" />
      </div>
      <p className="text-xs text-neutral-400 text-center max-w-[220px] leading-relaxed">
        {message}
      </p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-gray-100 dark:bg-neutral-800" />
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-gray-100 dark:bg-neutral-800" />
    </div>
  );
}

// ─── Stats Computation ────────────────────────────────────────────────────────

function computeStats(
  commData: { day: number; totalCommissionAmount: number; totalAirtimeUsed?: number | null }[] | undefined,
  msgData: { time: number; processed?: string | null; offerName?: string | null }[] | undefined,
  byTypeData: { offerType: string; commissionAmount: number; salesCount: number }[] | undefined,
  autoSaverData: { day: number; savedCount: number; skippedCount: number }[] | undefined,
  period: Period
) {
  const commRecords = commData ?? [];
  const msgs = msgData ?? [];

  const totalCommission = commRecords.reduce((s, r) => s + r.totalCommissionAmount, 0);
  const totalAirtime = commRecords.reduce((s, r) => s + (r.totalAirtimeUsed ?? 0), 0);
  const commBars = genCommBars(commRecords, period, "totalCommissionAmount");
  const airtimeBars = genCommBars(commRecords, period, "totalAirtimeUsed");

  const successful = msgs.filter((m) => m.processed === "successful");
  const bundleMap: Record<string, number> = {};
  successful.forEach((m) => {
    const n = (m.offerName ?? "Unknown").trim() || "Unknown";
    bundleMap[n] = (bundleMap[n] ?? 0) + 1;
  });
  const bundleEntries = Object.entries(bundleMap).sort((a, b) => b[1] - a[1]);
  const topBundle: [string, number] = bundleEntries[0] ?? ["—", 0];
  const bundleBars: BarItem[] = bundleEntries.slice(0, 6).map(([name, count]) => ({
    label: name.length > 7 ? name.slice(0, 7) + "…" : name,
    value: count,
    fullName: name,
  }));

  const salesByStatus: Record<string, number> = {};
  msgs.forEach((m) => {
    const s = m.processed ?? "pending";
    salesByStatus[s] = (salesByStatus[s] ?? 0) + 1;
  });
  const totalSales = msgs.length;
  const successRate =
    totalSales > 0
      ? Math.round(((salesByStatus["successful"] ?? 0) / totalSales) * 100)
      : 0;
  const salesBars = genMsgBars(msgs, period);

  const totalSaved = (autoSaverData ?? []).reduce((s, r) => s + r.savedCount, 0);
  const totalSkipped = (autoSaverData ?? []).reduce((s, r) => s + r.skippedCount, 0);
  const autoSaverBars = genAutoSaverBars(autoSaverData ?? [], period);

  const typeMap: Record<string, { amount: number; count: number }> = {};
  (byTypeData ?? []).forEach((r) => {
    if (!typeMap[r.offerType]) typeMap[r.offerType] = { amount: 0, count: 0 };
    typeMap[r.offerType].amount += r.commissionAmount;
    typeMap[r.offerType].count += r.salesCount;
  });
  const commByType = Object.entries(typeMap)
    .map(([type, d]) => ({ type, ...d }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalCommission, totalAirtime, commBars, airtimeBars,
    topBundle, totalBundlesSold: successful.length, bundleEntries, bundleBars,
    salesByStatus, totalSales, successRate, salesBars,
    totalSaved, totalSkipped, autoSaverBars,
    commByType,
  };
}

type Stats = ReturnType<typeof computeStats>;

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({
  stats,
  period,
  onNavigate,
}: {
  stats: Stats;
  period: Period;
  onNavigate: (v: View) => void;
}) {
  const periodLabel = ["today", "this week", "this month"][period];

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Commission"
          value={fmtKsh(stats.totalCommission)}
          subtitle={`Earned ${periodLabel}`}
          bars={stats.commBars}
          color="#10B981"
          gradient="bg-gradient-to-br from-emerald-50 to-green-100/90 dark:from-emerald-950/40 dark:to-green-900/20"
          border="border-emerald-200 dark:border-emerald-800/40"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          onClick={() => onNavigate("commission")}
        />
        <StatCard
          title="Airtime"
          value={fmtKsh(stats.totalAirtime)}
          subtitle={`Spent ${periodLabel}`}
          bars={stats.airtimeBars}
          color="#3B82F6"
          gradient="bg-gradient-to-br from-blue-50 to-indigo-100/90 dark:from-blue-950/40 dark:to-indigo-900/20"
          border="border-blue-200 dark:border-blue-800/40"
          icon={<Zap className="h-4 w-4 text-blue-600" />}
          onClick={() => onNavigate("airtime")}
        />
        <StatCard
          title="Top Bundle"
          value={stats.topBundle[0] === "—" ? "—" : `${stats.totalBundlesSold}`}
          subtitle={
            stats.topBundle[0] === "—"
              ? "No sales yet"
              : `${stats.topBundle[0].length > 14 ? stats.topBundle[0].slice(0, 14) + "…" : stats.topBundle[0]} · ${stats.topBundle[1]}x`
          }
          bars={stats.bundleBars.length ? stats.bundleBars : [{ label: "", value: 0 }]}
          color="#8B5CF6"
          gradient="bg-gradient-to-br from-violet-50 to-purple-100/90 dark:from-violet-950/40 dark:to-purple-900/20"
          border="border-violet-200 dark:border-violet-800/40"
          icon={<Package className="h-4 w-4 text-violet-600" />}
          onClick={() => onNavigate("bundles")}
        />
        <StatCard
          title="Total Sales"
          value={`${stats.totalSales}`}
          subtitle={`${stats.successRate}% success rate`}
          bars={stats.salesBars}
          color="#F59E0B"
          gradient="bg-gradient-to-br from-amber-50 to-orange-100/90 dark:from-amber-950/40 dark:to-orange-900/20"
          border="border-amber-200 dark:border-amber-800/40"
          icon={<BarChart2 className="h-4 w-4 text-amber-600" />}
          onClick={() => onNavigate("sales")}
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
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              AutoSaver
            </div>
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 leading-tight tracking-tight">
              {stats.totalSaved}
            </div>
            <div className="text-xs text-neutral-400 font-medium mt-0.5">
              {stats.totalSkipped > 0 ? `${stats.totalSkipped} skipped · ` : ""}
              new contacts {periodLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28">
            <MiniBar data={stats.autoSaverBars} color="#06B6D4" />
          </div>
          <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </button>
    </div>
  );
}

// ─── Commission Detail ────────────────────────────────────────────────────────

function CommissionDetail({ stats, period }: { stats: Stats; period: Period }) {
  const todayVal = stats.commBars.at(-1)?.value ?? 0;
  const activeDays = stats.commBars.filter((b) => b.value > 0).length;

  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers
        items={[
          { label: "Today", value: fmtKsh(todayVal), color: "text-emerald-600" },
          {
            label: period === 1 ? "This Week" : "This Month",
            value: fmtKsh(stats.totalCommission),
            color: "text-emerald-600",
          },
          {
            label: "Avg / day",
            value: fmtKsh(activeDays > 0 ? stats.totalCommission / activeDays : 0),
            color: "text-neutral-500",
          },
        ]}
      />
      <ChartCard title="Earnings Trend">
        <FullChart data={stats.commBars} color="#10B981" formatter={fmtKsh} />
      </ChartCard>
      <ListCard title="By Offer Type">
        {stats.commByType.length === 0 ? (
          <EmptyState message="Commission by offer type will appear here once your device syncs." />
        ) : (
          stats.commByType.map((item, i) => (
            <DetailRow
              key={i}
              rank={i + 1}
              label={item.type}
              sub={`${item.count} sale${item.count !== 1 ? "s" : ""}`}
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

function AirtimeDetail({ stats, period }: { stats: Stats; period: Period }) {
  const todayVal = stats.airtimeBars.at(-1)?.value ?? 0;
  const activeDays = stats.airtimeBars.filter((b) => b.value > 0).length;

  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers
        items={[
          { label: "Today", value: fmtKsh(todayVal), color: "text-blue-600" },
          {
            label: period === 1 ? "This Week" : "This Month",
            value: fmtKsh(stats.totalAirtime),
            color: "text-blue-600",
          },
          {
            label: "Avg / day",
            value: fmtKsh(activeDays > 0 ? stats.totalAirtime / activeDays : 0),
            color: "text-neutral-500",
          },
        ]}
      />
      <ChartCard title="Airtime Trend">
        <FullChart data={stats.airtimeBars} color="#3B82F6" formatter={fmtKsh} />
      </ChartCard>
      <ListCard title="Daily Breakdown">
        {stats.airtimeBars.filter((b) => b.value > 0).length === 0 ? (
          <EmptyState message="No airtime data for this period." />
        ) : (
          [...stats.airtimeBars]
            .reverse()
            .filter((b) => b.value > 0)
            .map((b, i) => <DetailRow key={i} label={b.label} right={fmtKsh(b.value)} />)
        )}
      </ListCard>
    </div>
  );
}

// ─── Bundles Detail ───────────────────────────────────────────────────────────

function BundlesDetail({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers
        items={[
          { label: "Total Sold", value: `${stats.totalBundlesSold}`, color: "text-violet-600" },
          {
            label: "Bundle Types",
            value: `${stats.bundleEntries.length}`,
            color: "text-violet-600",
          },
          {
            label: "Top Bundle",
            value: stats.topBundle[0] === "—" ? "—" : `${stats.topBundle[1]}x`,
            color: "text-neutral-500",
          },
        ]}
      />
      {stats.bundleBars.length > 0 && (
        <ChartCard title="Sales by Bundle">
          <FullChart data={stats.bundleBars} color="#8B5CF6" />
        </ChartCard>
      )}
      <ListCard title="Bundle Rankings">
        {stats.bundleEntries.length === 0 ? (
          <EmptyState message="No bundle sales for this period." />
        ) : (
          stats.bundleEntries.map(([name, count]: [string, number], i: number) => (
            <DetailRow
              key={i}
              rank={i + 1}
              label={name}
              sub={
                i === 0
                  ? "Top seller"
                  : `${Math.round((count / stats.totalBundlesSold) * 100)}% of sales`
              }
              right={`${count} sold`}
            />
          ))
        )}
      </ListCard>
    </div>
  );
}

// ─── Sales Detail ─────────────────────────────────────────────────────────────

function SalesDetail({ stats, period }: { stats: Stats; period: Period }) {
  const statusLabels: Record<string, string> = {
    successful: "Successful",
    failed: "Failed",
    pending: "Pending",
    "not-viable": "Not Viable",
    disabled: "Disabled",
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers
        items={[
          { label: "Total", value: `${stats.totalSales}`, color: "text-amber-600" },
          {
            label: "Successful",
            value: `${stats.salesByStatus["successful"] ?? 0}`,
            color: "text-emerald-600",
          },
          {
            label: "Success Rate",
            value: `${stats.successRate}%`,
            color:
              stats.successRate >= 70
                ? "text-emerald-600"
                : stats.successRate >= 40
                ? "text-amber-600"
                : "text-red-500",
          },
        ]}
      />
      <ChartCard title="Daily Volume">
        <FullChart data={stats.salesBars} color="#F59E0B" />
      </ChartCard>
      <ListCard title="By Status">
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
                sub={`${Math.round(((count as number) / stats.totalSales) * 100)}% of total`}
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

function AutoSaverDetail({ stats, period }: { stats: Stats; period: Period }) {
  const todayVal = stats.autoSaverBars.at(-1)?.value ?? 0;

  return (
    <div className="flex flex-col gap-3 pb-4">
      <SummaryNumbers
        items={[
          { label: "Today", value: `${todayVal}`, color: "text-cyan-600" },
          {
            label: period === 1 ? "This Week" : "This Month",
            value: `${stats.totalSaved}`,
            color: "text-cyan-600",
          },
          { label: "Skipped", value: `${stats.totalSkipped}`, color: "text-neutral-400" },
        ]}
      />
      <ChartCard title="New Contacts Trend">
        <FullChart data={stats.autoSaverBars} color="#06B6D4" />
      </ChartCard>
      <ListCard title="Daily Breakdown">
        {stats.autoSaverBars.filter((b) => b.value > 0).length === 0 ? (
          <EmptyState message="AutoSaver data will appear here once your device syncs." />
        ) : (
          [...stats.autoSaverBars]
            .reverse()
            .filter((b) => b.value > 0)
            .map((b, i) => (
              <DetailRow key={i} label={b.label} right={`${b.value} saved`} />
            ))
        )}
      </ListCard>
    </div>
  );
}

// ─── View Titles ──────────────────────────────────────────────────────────────

const VIEW_TITLES: Record<View, string> = {
  overview: "Statistics",
  commission: "Commission",
  airtime: "Airtime Used",
  bundles: "Top Bundles",
  sales: "Total Sales",
  autosaver: "New Users",
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function StatisticsMain({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>(1);
  const [view, setView] = useState<View>("overview");

  const { startTs, endTs } = useMemo(() => {
    const today = getTodayMidnight();
    const end = today + 86_400_000;
    const start =
      period === 0
        ? today
        : period === 1
        ? today - 6 * 86_400_000
        : today - 29 * 86_400_000;
    return { startTs: start, endTs: end };
  }, [period]);

  const commData = useQuery(api.features.totalCommission.getByUserIdAndDateRange, {
    userId,
    startDay: startTs,
    endDay: endTs,
  });
  const msgData = useQuery(api.features.statistics.getMessagesForStats, {
    userId,
    startTime: startTs,
    endTime: endTs,
  });
  const byTypeData = useQuery(api.features.statistics.getCommissionByTypeInRange, {
    userId,
    startDay: startTs,
    endDay: endTs,
  });
  const autoSaverData = useQuery(api.features.statistics.getAutoSaverStatsInRange, {
    userId,
    startDay: startTs,
    endDay: endTs,
  });

  const stats = useMemo(
    () => computeStats(commData, msgData, byTypeData, autoSaverData, period),
    [commData, msgData, byTypeData, autoSaverData, period]
  );

  const isLoading = commData === undefined || msgData === undefined;

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="p-4 md:p-5 md:pl-8 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-4 flex-1 w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {view !== "overview" && (
              <button
                onClick={() => setView("overview")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-neutral-500" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-neutral-700 dark:text-neutral-200">
                {VIEW_TITLES[view]}
              </h2>
              {view === "overview" && (
                <p className="text-xs text-neutral-400 font-medium">
                  Your business performance
                </p>
              )}
            </div>
          </div>
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {isLoading ? (
            <LoadingState />
          ) : view === "overview" ? (
            <Overview stats={stats} period={period} onNavigate={setView} />
          ) : view === "commission" ? (
            <CommissionDetail stats={stats} period={period} />
          ) : view === "airtime" ? (
            <AirtimeDetail stats={stats} period={period} />
          ) : view === "bundles" ? (
            <BundlesDetail stats={stats} />
          ) : view === "sales" ? (
            <SalesDetail stats={stats} period={period} />
          ) : (
            <AutoSaverDetail stats={stats} period={period} />
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
