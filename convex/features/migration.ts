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
      const tableData = await db.query(table).collect();
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
    const allRecords = await db.query(table).collect();
    for (const record of allRecords) {
      await db.delete(record._id);
    }
  }
}
