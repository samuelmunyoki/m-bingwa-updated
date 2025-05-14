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

export const run = migrations.runner();
