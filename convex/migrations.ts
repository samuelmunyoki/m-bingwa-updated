import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const migrations = new Migrations<DataModel>(components.migrations);

export const setIsMultiSessionFalse = migrations.define({
  table: "bundles",
  migrateOne: async (ctx, bundle) => {
    if (bundle.isMultiSession === undefined) {
      return { isMultiSession: true };
    }
  },
});

export const setMpesaMessagesProcessedToPending = migrations.define({
  table: "mpesaMessages",
  migrateOne: async (ctx, message) => {
    if (message.processed === undefined) {
      return { processed: "pending" as "pending" };
    }
  },
});

// Clears legacy string mpesaDate values (e.g. "01/10/25 9:05 AM").
// After running this, change schema mpesaDate back to v.optional(v.float64()).
export const clearStringMpesaDate = migrations.define({
  table: "mpesaMessages",
  migrateOne: async (ctx, message) => {
    if (typeof message.mpesaDate === "string") {
      await ctx.db.patch(message._id, { mpesaDate: undefined });
    }
  },
});

export const run = migrations.runner();
