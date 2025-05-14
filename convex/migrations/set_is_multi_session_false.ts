// import { m } from "@convex-dev/migrations";
// import { api } from "../_generated/api";

// export const setIsMultiSessionFalse = migration({
//   table: "bundles",
//   migrateOne: async (ctx, bundle) => {
//     if (bundle.isMultiSession === undefined) {
//       return { isMultiSession: false };
//     }
//   },
// });

// // Export a runner function to execute the migration
// export const runSetIsMultiSessionFalse = api.migrations.runner(
//   setIsMultiSessionFalse
// );
