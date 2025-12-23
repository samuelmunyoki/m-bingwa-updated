import { query } from "../_generated/server";

export const getAnalyticsData = query({
  handler: async (ctx) => {
    const customers = await ctx.db.query("users").collect();

    // Group customers by creation date
    const customersByDate = customers.reduce(
      (acc, customer) => {
        const date = new Date(customer._creationTime)
          .toISOString()
          .split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );



    // Combine the data
    const combinedData = Object.keys({ ...customersByDate})
      .sort()
      .map((date) => ({
        date,
        customers: customersByDate[date] || 0,
      }));

    return combinedData;
  },
});
