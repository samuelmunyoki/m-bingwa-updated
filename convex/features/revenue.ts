import { v } from "convex/values";
import { query } from "../_generated/server";

export const getRevenueStats = query({
  args: { requestingUserId: v.string() },
  handler: async (ctx, args) => {
    // Admin-only
    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
      .first();
    if (!requestingUser?.isAdmin) throw new Error("Unauthorized");

    // All successful M-Pesa subscription payments
    const allMpesa = await ctx.db.query("mpesa_transactions").collect();
    const mpesaTxs = allMpesa.filter(
      (t) => t.paymentFor === "SUBSCRIPTION" && t.resultCode === 0 && t.amount != null
    );

    // All successful airtime subscription payments
    const airtimeTxs = await ctx.db
      .query("airtimeTransactions")
      .withIndex("by_status", (q) => q.eq("status", "SUCCESS"))
      .collect();

    // Active subscribers — subscribed flag AND expiry is in the future
    const nowSeconds = Math.floor(Date.now() / 1000);
    const allUsers = await ctx.db.query("users").collect();
    const activeSubscribers = allUsers.filter(
      (u) => u.isSubscribed === true && (u.subscriptionEnds ?? 0) > nowSeconds
    ).length;

    // Day/month boundaries in Africa/Nairobi (EAT, UTC+3, no DST) — matches
    // messageDailyStats.ts getDayStart() / transactions.tsx nairobiStartOfDay().
    // NOT the server's UTC midnight, or sales made between midnight and 3 AM
    // Kenya time get filed under the previous day/month and today/this-month read short.
    const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
    const now = Date.now();
    const todayStart = (() => {
      const shifted = now + EAT_OFFSET_MS;
      return shifted - (shifted % 86_400_000) - EAT_OFFSET_MS;
    })();
    const monthStart = (() => {
      const shifted = new Date(now + EAT_OFFSET_MS);
      return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - EAT_OFFSET_MS;
    })();

    // Distinct users active today (Nairobi day) — one presence row per user per day in activeUsersToday.
    const activeTodayRows = await ctx.db
      .query("activeUsersToday")
      .withIndex("by_day", (q) => q.eq("dayStart", todayStart))
      .collect();
    const activeToday = new Set(activeTodayRows.map((r) => r.userId)).size;

    // M-Pesa uses _creationTime (ms); Airtime uses transactionDate (seconds)
    const mpesaTotal   = mpesaTxs.reduce((s, t) => s + (t.amount ?? 0), 0);
    const mpesaToday   = mpesaTxs.filter((t) => t._creationTime >= todayStart).reduce((s, t) => s + (t.amount ?? 0), 0);
    const mpesaMonth   = mpesaTxs.filter((t) => t._creationTime >= monthStart).reduce((s, t) => s + (t.amount ?? 0), 0);

    const airtimeTotal = airtimeTxs.reduce((s, t) => s + t.amount, 0);
    const airtimeToday = airtimeTxs.filter((t) => t.transactionDate * 1000 >= todayStart).reduce((s, t) => s + t.amount, 0);
    const airtimeMonth = airtimeTxs.filter((t) => t.transactionDate * 1000 >= monthStart).reduce((s, t) => s + t.amount, 0);

    return {
      summary: {
        totalRevenue:      mpesaTotal + airtimeTotal,
        todayRevenue:      mpesaToday + airtimeToday,
        monthRevenue:      mpesaMonth + airtimeMonth,
        activeSubscribers,
        activeToday,
      },
      breakdown: {
        mpesa:   mpesaTotal,
        airtime: airtimeTotal,
      },
      // Raw points for client-side chart bucketing
      chart: {
        mpesa:   mpesaTxs.map((t) => ({ ts: t._creationTime, amount: t.amount ?? 0 })),
        airtime: airtimeTxs.map((t) => ({ ts: t.transactionDate * 1000, amount: t.amount })),
      },
    };
  },
});

// Distinct active users for each of 7 consecutive Nairobi days starting at `weekStart` (ms, the Nairobi
// midnight of the first day — the website sends a Sunday). Reads the activeUsersToday presence table by
// its by_day index, so it never scans message rows. Admin-only, like getRevenueStats.
const ACTIVE_USERS_EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
// The table's real daily series starts here (older rows are strays); the UI uses it for a "no data" note.
const ACTIVE_USERS_TRACKING_START_MS = Date.UTC(2026, 8, 1) - ACTIVE_USERS_EAT_OFFSET_MS;

export const getActiveUsersByDay = query({
  args: { requestingUserId: v.string(), weekStart: v.number() },
  handler: async (ctx, args) => {
    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
      .first();
    if (!requestingUser?.isAdmin) throw new Error("Unauthorized");

    const DAY_MS = 86_400_000;
    const days: { dayStart: number; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = args.weekStart + i * DAY_MS;
      const rows = await ctx.db
        .query("activeUsersToday")
        .withIndex("by_day", (q) => q.eq("dayStart", dayStart))
        .collect();
      days.push({ dayStart, count: new Set(rows.map((r) => r.userId)).size });
    }
    return { days, trackingStart: ACTIVE_USERS_TRACKING_START_MS };
  },
});
