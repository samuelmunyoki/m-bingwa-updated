import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

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

// Delete non-pending mpesa messages - runs daily at midnight (00:00 UTC)
crons.daily(
  "Delete non-pending mpesa messages",
  { hourUTC: 0, minuteUTC: 0 },
  api.features.mpesaMessages.deleteNonPendingMpesaMessages
);

export default crons;
