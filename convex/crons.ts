import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Sheduled events",
  { seconds: 30 },
  api.features.scheduled_events.checkScheduledEvents
);

crons.interval("Check subscription expiry", { seconds: 30 }, api.users.checkExpiry);

// Delete mpesa messages older than 30 days - runs once per day at 2 AM
crons.daily(
  "Delete old mpesa messages",
  { hourUTC: 2, minuteUTC: 0 },
  api.features.mpesaMessages.deleteOldMpesaMessages
);


// Delete all app logs every 2 hours in batches of 1000
crons.interval(
  "Delete all app logs",
  { hours: 2 },
  internal.features.appLogs.clearAllLogsScheduled
);

export default crons;
