import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Sheduled events",
  { seconds: 30 },
  api.features.scheduled_events.checkScheduledEvents
);

crons.interval("Check subscription expiry", { seconds: 30 }, api.users.checkExpiry);

export default crons;
