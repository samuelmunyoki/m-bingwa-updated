import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { BackendResponse } from "../../lib/custom_types";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Helper function to parse the scheduledTimeStamp in East Africa Time
function parseScheduledTimeEAT(
  timeStamp: string | null | undefined
): Date | null {
  // Check if timeStamp is null, undefined, or an empty string
  if (!timeStamp || typeof timeStamp !== "string" || timeStamp.trim() === "") {
    console.log(`Invalid or empty timeStamp: ${timeStamp}`);
    return null;
  }

  try {
    // Parse the date string in the format "January 14, 2025 at 02:04 PM"
    const [datePart, timePart] = timeStamp.split(" at ");
    if (!datePart || !timePart) {
      throw new Error("Invalid date format");
    }

    const [month, day, year] = datePart.split(" ");
    const [time, period] = timePart.trim().split(" ");
    const [hours, minutes] = time.split(":");

    if (!month || !day || !year || !hours || !minutes || !period) {
      throw new Error("Invalid date components");
    }

    // Convert hours to 24-hour format
    let hour = parseInt(hours);
    if (isNaN(hour)) {
      throw new Error("Invalid hour");
    }

    if (period.toLowerCase() === "pm" && hour !== 12) {
      hour += 12;
    } else if (period.toLowerCase() === "am" && hour === 12) {
      hour = 0;
    }

    // Create a Date object (months are 0-indexed in JavaScript Date)
    const monthIndex = new Date(Date.parse(month + " 1, 2012")).getMonth();
    if (isNaN(monthIndex)) {
      throw new Error("Invalid month");
    }

    const parsedYear = parseInt(year);
    const parsedDay = parseInt(day);
    const parsedMinutes = parseInt(minutes);

    if (isNaN(parsedYear) || isNaN(parsedDay) || isNaN(parsedMinutes)) {
      throw new Error("Invalid year, day, or minutes");
    }

    const date = new Date(
      parsedYear,
      monthIndex,
      parsedDay,
      hour,
      parsedMinutes
    );

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return date;
  } catch (error) {
    console.error(`Error parsing date: ${error}`);
    return null;
  }
}

export const createScheduledEvent = mutation({
  args: {
    ussdCode: v.string(),
    userId: v.string(),
    repeatDays: v.optional(v.number()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("SUCCESS"),
      v.literal("ERRORED"),
      v.literal("CANCELLED"),
      v.literal("QUEUED")
    ),
    scheduledTimeStamp: v.number(),
    repeatDaily: v.boolean(),
    messageId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      ussdCode,
      userId,
      repeatDays,
      status,
      scheduledTimeStamp,
      repeatDaily,
      messageId,
    }
  ): Promise<BackendResponse> => {
    try {
      await ctx.db.insert("scheduled_events", {
        ussdCode,
        userId,
        repeatDays,
        status,
        unscheduled: scheduledTimeStamp === undefined,
        scheduledTimeStamp,
        repeatDaily,
        messageId,
      });

      return {
        status: "success",
        message: "Scheduled event created successfully.",
      } as BackendResponse;

    } catch (error) {
      console.error("Error creating scheduled event:", error);
      return {
        status: "error",
        message: "Unexpected error. Scheduled event not created.",
      } as BackendResponse;
    }
  },
});

export const getScheduledEvents = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    const events = await ctx.db
      .query("scheduled_events")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return events;
  },
});

// Query to get all pending scheduled events
export const getPendingScheduledEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("scheduled_events")
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();
  },
});

export const getScheduledEventsByMessageID = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduled_events")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .first();
  },
});

// Mutation to update the status of a scheduled event
export const updateEventStatus = mutation({
  args: {
    id: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("SUCCESS"),
      v.literal("ERRORED"),
      v.literal("CANCELLED"),
      v.literal("QUEUED")
    ),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ev = await ctx.db
      .query("scheduled_events")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .first();
    if (ev) {
      const updateFields = {
        ...(args.messageId && { messageId: args.messageId }),
        ...(args.status && { status: args.status }),
      };

      // Update the SMS record
      await ctx.db.patch(ev._id, updateFields);
    }
  },
});

export const checkScheduledEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const nowEAT = Math.floor(Date.now() / 1000);
    const events = await ctx.runQuery(
      api.features.scheduled_events.getPendingScheduledEvents
    );

    for (const event of events) {
      if (!event.scheduledTimeStamp) {
        await sendSMS(ctx, event);
        continue;
      }

      if (event.scheduledTimeStamp <= nowEAT) {
        console.log(`Executing event: ${JSON.stringify(event, null, 2)}`);
        await sendSMS(ctx, event);

        if (event.repeatDaily && event.repeatDays && event.repeatDays > 0) {
          // Calculate next scheduled time (next day)
          const nextScheduledTime = event.scheduledTimeStamp + 24 * 60 * 60; // Add 24 hours

          // Decrement repeatDays since it's a countdown
          const updatedRepeatDays = event.repeatDays - 1;

          if (updatedRepeatDays > 0) {
            await ctx.db.insert("scheduled_events", {
              repeatDaily: event.repeatDaily,
              repeatDays: updatedRepeatDays, // Store the updated count
              unscheduled: event.unscheduled,
              userId: event.userId,
              ussdCode: event.ussdCode,
              scheduledTimeStamp: nextScheduledTime,
              status: "PENDING",
            });
          }

          // Mark original event as completed
          await ctx.db.patch(event._id, {
            repeatDays: updatedRepeatDays,
          });
        }
      }
    }
  },
});


async function sendSMS(
  ctx: any,
  event: { _id: Id<"scheduled_events">; userId: string; ussdCode: string }
) {
  const userdata = await ctx.runQuery(api.users.getUserById, {
    userId: event.userId,
  });

  if (userdata && userdata.phoneNumber !== undefined) {
    await ctx.scheduler.runAfter(
      0,
      api.actions.scheduled_events.sendScheduleSMS,
      {
        scheduleId: event._id,
        smsContent: event.ussdCode,
        smsNumber: userdata.phoneNumber,
        userId: event.userId,
      }
    );
  }
}

export const deleteScheduledEvent = mutation({
  args: { id: v.id("scheduled_events") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
