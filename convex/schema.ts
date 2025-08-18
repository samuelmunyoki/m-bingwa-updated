import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(),
    isAdmin: v.boolean(),
    isSubscribed: v.optional(v.boolean()),
    isSubscriptionEndingSMSsent: v.optional(v.boolean()),
    profileImage: v.string(),
    suspended: v.boolean(),
    storageID: v.optional(v.string()),
    subscriptionEnds: v.optional(v.number()),
    subscriptionId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_checkoutRequestID", ["subscriptionId"])
    .index("by_email", ["email"]),

  bundles: defineTable({
    userId: v.string(),
    status: v.union(v.literal("available"), v.literal("disabled")),
    offerName: v.string(),
    bundlesUSSD: v.string(),
    duration: v.string(),
    price: v.number(),
    isMultiSession: v.boolean(),
    dialingSIM: v.union(v.literal("SIM1"), v.literal("SIM2")),
  }).index("by_user", ["userId"]),

  subscription_price: defineTable({
    price: v.number(),
    paymentMethod: v.string(),
    paymentAccount: v.string(),
  }),

  mpesa_transactions: defineTable({
    merchantRequestID: v.string(),
    checkoutRequestID: v.string(),
    resultCode: v.number(),
    resultDesc: v.string(),
    phoneNumber: v.string(),
    accountReference: v.string(),
    transactionDesc: v.string(),
    paymentMethod: v.string(),
    paymentAccount: v.string(),
    amount: v.optional(v.number()),
    mpesaReceiptNumber: v.optional(v.string()),
    paymentFor: v.union(v.literal("STORE"), v.literal("SUBSCRIPTION")),
  })
    .index("by_checkoutRequestID", ["checkoutRequestID"])
    .index("by_paymentAccount", ["paymentAccount"])
    .index("by_phoneNumber", ["phoneNumber"]),

  sms: defineTable({
    smsContent: v.string(),
    smsReciepient: v.string(),
    userId: v.string(),
    service: v.union(
      v.literal("USSD"),
      v.literal("SCHEDULER"),
      v.literal("STORE"),
      v.literal("NOTIFICATION")
    ),
    status: v.optional(v.string()),
    timeTaken: v.optional(v.string()),
    messageId: v.optional(v.string()),
    timeStamp: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_messageId", ["messageId"]),

  scheduled_events: defineTable({
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
    unscheduled: v.boolean(),
    scheduledTimeStamp: v.number(),
    repeatDaily: v.boolean(),
    messageId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_messageId", ["messageId"]),

  stores: defineTable({
    storeName: v.string(),
    storeOwnerId: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("disabled"),
      v.literal("maintenance")
    ),
    statusDescription: v.string(),
    paymentAccount: v.string(),
    paymentMethod: v.union(v.literal("TILL"), v.literal("PAYBILL")),
  })
    .index("by_user", ["storeOwnerId"])
    .index("by_storeName", ["storeName"]),

  notifications: defineTable({
    notification_id: v.string(),
    notificationIsRead: v.boolean(),
    notificationBody: v.string(),
  }).index("by_notification_id", ["notification_id"]),

  blacklist: defineTable({
    phoneNumber: v.string(),
    userId: v.string(),
  })
    .index("by_phoneNumber", ["phoneNumber"])
    .index("by_userId", ["userId"]),

  otps: defineTable({
    phoneNumber: v.string(),
    userId: v.string(),
    otpCode: v.number(),
    isVerified: v.boolean(),
  })
    .index("by_phoneNumber", ["phoneNumber"])
    .index("by_otp_code", ["otpCode"])
    .index("by_userId", ["userId"]),

  // Cooldown timers table to store OTP request cooldowns
  cooldownTimers: defineTable({
    userId: v.string(),
    expiresAt: v.number(),
  }).index("by_userId", ["userId"]),

  system: defineTable({
    hasUpdate: v.boolean(),
    userId: v.string(),
  }).index("by_userId", ["userId"]),

  transactions: defineTable({
    storeId: v.string(),
    checkoutRequestID: v.optional(v.string()),
    messadeId: v.optional(v.string()),
    storeOwnerId: v.string(),
    bundlesID: v.string(),
    bundlesPrice: v.number(),
    payingNumber: v.string(),
    receivingNumber: v.string(),
    paymentMethod: v.string(),
    paymentAccount: v.string(),
    paymentStatus: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("CANCELLED"),
        v.literal("TIMEDOUT"),
        v.literal("CONFIRMED"),
        v.literal("ERRORED")
      )
    ),
  })
    .index("by_recieving_number_id", ["receivingNumber"])
    .index("by_paying_number_id", ["payingNumber"])
    .index("by_bundles_id", ["bundlesID"])
    .index("by_checkoutrequest_id", ["checkoutRequestID"])
    .index("by_store_owner_id", ["storeOwnerId"]),

  mpesaMessages: defineTable({
    name: v.string(),
    amount: v.number(),
    phoneNumber: v.string(),
    senderId: v.string(),
    time: v.number(),
    userId: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_phone_number", ["phoneNumber"])
    .index("by_sender_id", ["senderId"])
    .index("by_time", ["time"]),

  userSenderRelations: defineTable({
    userId: v.string(),
    senderId: v.string(),
    lastUpdateTimeStamp: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_sender_id", ["senderId"])
    .index("by_user_sender", ["userId", "senderId"])
    .index("by_timestamp", ["lastUpdateTimeStamp"]),
});
