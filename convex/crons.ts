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

export default crons;
