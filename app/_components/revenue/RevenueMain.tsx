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
  Legend,
} from "recharts";
import { TrendingUp, Calendar, DollarSign, Users, Smartphone, Wallet } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 0 | 1 | 2; // 0=Daily, 1=Weekly, 2=Monthly

interface ChartPoint { ts: number; amount: number }
interface BarItem { label: string; mpesa: number; airtime: number }

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function genRevenueBars(
  period: Period,
  mpesaPoints: ChartPoint[],
  airtimePoints: ChartPoint[]
): BarItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  function sum(points: ChartPoint[], start: number, end: number) {
    return points.filter((p) => p.ts >= start && p.ts < end).reduce((s, p) => s + p.amount, 0);
  }

  if (period === 0) {
    const weekStart = todayTs - today.getDay() * 86_400_000;
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => {
      const s = weekStart + i * 86_400_000;
      return { label, mpesa: sum(mpesaPoints, s, s + 86_400_000), airtime: sum(airtimePoints, s, s + 86_400_000) };
    });
  }

  if (period === 1) {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const maxWeek = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
    return Array.from({ length: maxWeek }, (_, i) => {
      const w = i + 1;
      const startDay = Math.max(1, (w - 1) * 7 - firstDayOfWeek + 1);
      const endDay = Math.min(daysInMonth, w * 7 - firstDayOfWeek);
      const s = new Date(year, month, startDay).getTime();
      const e = new Date(year, month, endDay + 1).getTime();
      return { label: `W${w}`, mpesa: sum(mpesaPoints, s, e), airtime: sum(airtimePoints, s, e) };
    });
  }

  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    const s = d.getTime();
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    return { label: names[d.getMonth()], mpesa: sum(mpesaPoints, s, e), airtime: sum(airtimePoints, s, e) };
  });
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtKsh(v: number): string {
  if (v >= 1_000_000) return `KSh ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KSh ${(v / 1_000).toFixed(1)}K`;
  return `KSh ${v.toFixed(0)}`;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-neutral-700 dark:text-neutral-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmtKsh(p.value)}</p>
      ))}
    </div>
  );
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ title, value, icon, gradient, border }: {
  title: string; value: string; icon: React.ReactNode; gradient: string; border: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 p-4 rounded-2xl border", gradient, border)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{title}</span>
        <div className="opacity-70">{icon}</div>
      </div>
      <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{value}</span>
    </div>
  );
}

// ─── Breakdown Card ───────────────────────────────────────────────────────────

function BreakdownCard({ title, value, sub, icon, color }: {
  title: string; value: string; sub: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className={cn("p-3 rounded-xl", color)}>{icon}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{title}</span>
        <span className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{value}</span>
        <span className="text-xs text-neutral-400">{sub}</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RevenueMain({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>(0);

  const data = useQuery(api.features.revenue.getRevenueStats, { requestingUserId: userId });

  const bars = useMemo(() => {
    if (!data) return [];
    return genRevenueBars(period, data.chart.mpesa, data.chart.airtime);
  }, [data, period]);

  const periodLabels: { label: string; value: Period }[] = [
    { label: "Daily", value: 0 },
    { label: "Weekly", value: 1 },
    { label: "Monthly", value: 2 },
  ];

  return (
    <div className="flex flex-1 !mb-2">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-4 overflow-hidden">
        <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Revenue
        </h2>

        <ScrollArea className="flex-1 pr-2">
          <div className="flex flex-col gap-4 pb-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard
                title="Total Revenue"
                value={data ? fmtKsh(data.summary.totalRevenue) : "—"}
                icon={<DollarSign className="h-4 w-4 text-green-600" />}
                gradient="bg-green-50 dark:bg-green-950/30"
                border="border-green-200 dark:border-green-800"
              />
              <SummaryCard
                title="This Month"
                value={data ? fmtKsh(data.summary.monthRevenue) : "—"}
                icon={<Calendar className="h-4 w-4 text-blue-600" />}
                gradient="bg-blue-50 dark:bg-blue-950/30"
                border="border-blue-200 dark:border-blue-800"
              />
              <SummaryCard
                title="Today"
                value={data ? fmtKsh(data.summary.todayRevenue) : "—"}
                icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
                gradient="bg-purple-50 dark:bg-purple-950/30"
                border="border-purple-200 dark:border-purple-800"
              />
              <SummaryCard
                title="Active Subscribers"
                value={data ? String(data.summary.activeSubscribers) : "—"}
                icon={<Users className="h-4 w-4 text-orange-600" />}
                gradient="bg-orange-50 dark:bg-orange-950/30"
                border="border-orange-200 dark:border-orange-800"
              />
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BreakdownCard
                title="M-Pesa Payments"
                value={data ? fmtKsh(data.breakdown.mpesa) : "—"}
                sub="Successful STK push payments"
                icon={<Smartphone className="h-5 w-5 text-green-600" />}
                color="bg-green-100 dark:bg-green-900/40"
              />
              <BreakdownCard
                title="Airtime Payments"
                value={data ? fmtKsh(data.breakdown.airtime) : "—"}
                sub="Successful airtime deductions"
                icon={<Wallet className="h-5 w-5 text-blue-600" />}
                color="bg-blue-100 dark:bg-blue-900/40"
              />
            </div>

            {/* Chart */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Revenue Over Time</span>
                <div className="flex gap-1">
                  {periodLabels.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                        period === p.value
                          ? "bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {bars.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bars} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)", radius: 4 }} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value) => value === "mpesa" ? "M-Pesa" : "Airtime"}
                    />
                    <Bar dataKey="mpesa" name="mpesa" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
                    <Bar dataKey="airtime" name="airtime" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400">
                  Loading chart...
                </div>
              )}
            </div>

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
