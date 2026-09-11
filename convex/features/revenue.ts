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
