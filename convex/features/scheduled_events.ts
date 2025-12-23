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
      v.literal("QUEUED"),
      v.literal("EXECUTED"),
      v.literal("FAILED")
    ),
    scheduledTimeStamp: v.number(),
    repeatDaily: v.boolean(),
    messageId: v.optional(v.string()),
    offerId: v.string(),
    offerName: v.string(),
    offerDuration: v.string(),
    offerPrice: v.number(),
    offerNum: v.string(),
    dialingSim: v.optional(v.string()),
    isMultiSession: v.optional(v.boolean()),
    isSimpleUSSD: v.optional(v.boolean()),
    responseValidatorText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const scheduleId = await ctx.db.insert("scheduled_events", {
        ussdCode: args.ussdCode,
        userId: args.userId,
        repeatDays: args.repeatDays,
        status: args.status,
        unscheduled: args.scheduledTimeStamp === undefined,
        scheduledTimeStamp: args.scheduledTimeStamp,
        repeatDaily: args.repeatDaily,
        messageId: args.messageId,
        offerId: args.offerId,
        offerName: args.offerName,
        offerDuration: args.offerDuration,
        offerPrice: args.offerPrice,
        offerNum: args.offerNum,
        // USE DEFAULTS IF NOT PROVIDED
        dialingSim: args.dialingSim || "SIM1",
        isMultiSession: args.isMultiSession ?? false,
        isSimpleUSSD: args.isSimpleUSSD ?? false,
        responseValidatorText: args.responseValidatorText,
      });

      const createdSchedule = await ctx.db.get(scheduleId);

      return {
        status: "success",
        message: "Scheduled event created successfully.",
        data: createdSchedule
      };

    } catch (error) {
      console.error("Error creating scheduled event:", error);
      return {
        status: "error",
        message: "Unexpected error. Scheduled event not created.",
      };
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
      v.literal("QUEUED"),
      v.literal("EXECUTED"),
      v.literal("FAILED")
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

export const updateScheduledEvent = mutation({
  args: {
    id: v.string(),
    status: v.optional(v.union(
      v.literal("PENDING"),
      v.literal("SUCCESS"),
      v.literal("ERRORED"),
      v.literal("CANCELLED"),
      v.literal("QUEUED"),
      v.literal("EXECUTED"),
      v.literal("FAILED")
    )),
    messageId: v.optional(v.string()),
    userId: v.optional(v.string()),
    ussdCode: v.optional(v.string()),
    isDynamicUSSD: v.optional(v.boolean()),
    scheduleTime: v.optional(v.number()),
    isRepetitive: v.optional(v.boolean()),
    repeatDays: v.optional(v.number()),
    offerId: v.optional(v.string()),
    offerName: v.optional(v.string()),
    offerDuration: v.optional(v.string()),
    offerPrice: v.optional(v.number()),
    offerNum: v.optional(v.string()),
    dialingSim: v.optional(v.string()),
    isMultiSession: v.optional(v.boolean()),
    isSimpleUSSD: v.optional(v.boolean()),
    responseValidatorText: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ status: string; message: string }> => {
    try {
      const ev = await ctx.db
        .query("scheduled_events")
        .filter((q) => q.eq(q.field("_id"), args.id))
        .first();
        
      if (!ev) {
        throw new Error("Scheduled event not found");
      }

      const updateFields: any = {};
      
      // Only include fields that are provided (not undefined)
      if (args.status !== undefined) updateFields.status = args.status;
      if (args.messageId !== undefined) updateFields.messageId = args.messageId;
      if (args.ussdCode !== undefined) updateFields.ussdCode = args.ussdCode;
      if (args.isDynamicUSSD !== undefined) updateFields.isDynamicUSSD = args.isDynamicUSSD;
      if (args.scheduleTime !== undefined) updateFields.scheduledTimeStamp = args.scheduleTime;
      if (args.isRepetitive !== undefined) updateFields.repeatDaily = args.isRepetitive;
      if (args.repeatDays !== undefined) updateFields.repeatDays = args.repeatDays;
      if (args.offerId !== undefined) updateFields.offerId = args.offerId;
      if (args.offerName !== undefined) updateFields.offerName = args.offerName;
      if (args.offerDuration !== undefined) updateFields.offerDuration = args.offerDuration;
      if (args.offerPrice !== undefined) updateFields.offerPrice = args.offerPrice;
      if (args.offerNum !== undefined) updateFields.offerNum = args.offerNum;
      if (args.dialingSim !== undefined) updateFields.dialingSim = args.dialingSim;
      if (args.isMultiSession !== undefined) updateFields.isMultiSession = args.isMultiSession;
      if (args.isSimpleUSSD !== undefined) updateFields.isSimpleUSSD = args.isSimpleUSSD;
      if (args.responseValidatorText !== undefined) updateFields.responseValidatorText = args.responseValidatorText;

      // Update the scheduled event
      await ctx.db.patch(ev._id, updateFields);

      return {
        status: "success",
        message: "Scheduled event updated successfully"
      };

    } catch (error) {
      console.error("Error updating scheduled event:", error);
      return {
        status: "error",
        message: "Failed to update scheduled event"
      };
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
              offerId: event.offerId || "",
              offerName: event.offerName || "",
              offerDuration: event.offerDuration || "",
              offerPrice: event.offerPrice || 0,
              offerNum: event.offerNum || "",
              // NEW FIELDS WITH DEFAULTS
              dialingSim: event.dialingSim || "SIM1",
              isMultiSession: event.isMultiSession ?? false,
              isSimpleUSSD: event.isSimpleUSSD ?? false,
              responseValidatorText: event.responseValidatorText || undefined,
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
    return { success: true, message: "Deleted successfully" };
  },
});