import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Sheduled events",
  { seconds: 30 },
  api.features.scheduled_events.checkScheduledEvents
);

crons.interval("Check subscription expiry", { seconds: 30 }, api.users.checkExpiry);

// Delete mpesa messages older than 2 days - runs once per day at 2 AM, then self-reschedules
// (see deleteOldMpesaMessages) until the whole backlog past the cutoff is drained.
crons.daily(
  "Delete old mpesa messages",
  { hourUTC: 2, minuteUTC: 0 },
  internal.features.mpesaMessages.deleteOldMpesaMessages
);


// Delete bridge transactions older than 2 days - runs once per day at 5 AM UTC, then
// self-reschedules (see deleteOldOnlineBridgeTransactions) until the whole backlog is drained.
crons.daily(
  "Delete old online bridge transactions",
  { hourUTC: 5, minuteUTC: 0 },
  internal.features.onlineBridge.deleteOldOnlineBridgeTransactions
);

// Prune app logs older than the 4h retention window — hourly, throttled, self-terminating.
crons.interval(
  "Prune old app logs",
  { hours: 1 },
  internal.features.appLogs.pruneOldLogsScheduled
);

// Safety net for store-purchase SKIP entries whose STK callback never arrived — without this,
// a lost callback would leave that phone number permanently skipped. See skips.ts.
crons.interval(
  "Release stale store-purchase skips",
  { minutes: 5 },
  internal.features.skips.releaseStaleSkips
);

export default crons;
