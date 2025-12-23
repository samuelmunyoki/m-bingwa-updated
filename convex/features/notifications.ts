import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { v4 as uuidv4 } from "uuid";

export const createNotification = mutation({
  args: {
    notificationBody: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      notification_id: uuidv4(),
      notificationIsRead: false,
      notificationBody: args.notificationBody,
    });
  },
});

export const getPaginatedNotifications = query({
  args: {
    cursor: v.optional(v.number()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const { cursor, limit } = args;
    let query = ctx.db.query("notifications").order("desc");

    if (cursor) {
      query = query.filter((q) => q.lt(q.field("_creationTime"), cursor));
    }

    const notifications = await query.take(limit + 1);
    const hasMore = notifications.length > limit;
    const newCursor =
      notifications.length > 0
        ? notifications[notifications.length - 1]._creationTime
        : undefined;

    return {
      notifications: notifications.slice(0, limit),
      cursor: newCursor,
      hasMore,
    };
  },
});

export const markNotificationAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { notificationIsRead: true });
  },
});
