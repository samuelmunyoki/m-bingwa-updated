import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const DEFAULT_AIRTIME_CODE = "*144#";
const DEFAULT_BONGA_CODE = "*126*6*2*1#";

/**
 * Get the global USSD codes record.
 * Returns defaults if no record exists yet.
 */
export const getUssdCodes = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("ussdCodes").collect();
    if (records.length === 0) {
      return {
        airtimeUssdCode: DEFAULT_AIRTIME_CODE,
        bongaUssdCode: DEFAULT_BONGA_CODE,
        updatedAt: 0,
      };
    }
    return records[0];
  },
});

/**
 * Upsert the global USSD codes record.
 * If a record exists, update it. If not, create it.
 */
export const upsertUssdCodes = mutation({
  args: {
    airtimeUssdCode: v.string(),
    bongaUssdCode: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db.query("ussdCodes").collect();

    if (records.length > 0) {
      await ctx.db.patch(records[0]._id, {
        airtimeUssdCode: args.airtimeUssdCode,
        bongaUssdCode: args.bongaUssdCode,
        updatedAt: Date.now(),
      });
      return {
        status: "success",
        message: "USSD codes updated successfully",
      };
    } else {
      await ctx.db.insert("ussdCodes", {
        airtimeUssdCode: args.airtimeUssdCode,
        bongaUssdCode: args.bongaUssdCode,
        updatedAt: Date.now(),
      });
      return {
        status: "success",
        message: "USSD codes created successfully",
      };
    }
  },
});