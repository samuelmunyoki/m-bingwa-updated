import { mutation, query } from "../_generated/server";
import { Doc, TableNames } from "../_generated/dataModel";

// Helper type to get all table names
type AllTableNames = TableNames;

// Helper type to create a record of all tables and their document types
type AllTablesData = {
  [K in AllTableNames]: Doc<K>[];
};

export const downloadAllData = mutation(
  async ({ db }): Promise<Partial<AllTablesData>> => {
    const tables: AllTableNames[] = [
      "users",
      "bundles",
      "subscription_price",
      "mpesa_transactions",
      "sms",
      "scheduled_events",
      "stores",
      "notifications",
      "blacklist",
      "transactions",
    ];

    const allData: Partial<AllTablesData> = {};

    for (const table of tables) {
      // Paginated instead of a single unbounded collect() — a table past Convex's 8192-row
      // cap would otherwise make this whole backup fail outright. Same full contents returned
      // per table either way, just fetched in bounded pages instead of one grab (2026-08-11).
      const tableData: Doc<typeof table>[] = [];
      let cursor: string | null = null;
      let isDone = false;
      while (!isDone) {
        const result = await db.query(table).paginate({ numItems: 200, cursor });
        tableData.push(...result.page);
        isDone = result.isDone;
        cursor = result.continueCursor;
      }
      (allData[table] as Doc<typeof table>[]) = tableData;
    }

    return allData;
  }
);

export const uploadAllData = mutation(
  async ({ db }, data: Partial<AllTablesData>) => {
    // Delete all existing data from each table
    await deleteAllData(db);

    // Insert new data
    for (const [tableName, records] of Object.entries(data)) {
      if (records) {
        for (const record of records) {
          const { _id, _creationTime, ...insertFields } = record;
          await db.insert(tableName as TableNames, insertFields);
        }
      }
    }
  }
);

async function deleteAllData(db: any) {
  const tables: TableNames[] = [
    "users",
    "bundles",
    "subscription_price",
    "mpesa_transactions",
    "sms",
    "scheduled_events",
    "stores",
    "notifications",
    "blacklist",
    "transactions",
  ];

  for (const table of tables) {
    // Repeatedly take a bounded batch and delete it, instead of collecting the whole table
    // first — same 8192-row cap reasoning as downloadAllData above. Taking with no cursor each
    // time (rather than paginating) sidesteps any question of cursor validity after deletion:
    // each pass just asks for "whatever's left," up to 200 rows, until nothing remains
    // (2026-08-11).
    while (true) {
      const batch = await db.query(table).take(200);
      if (batch.length === 0) break;
      for (const record of batch) {
        await db.delete(record._id);
      }
    }
  }
}
