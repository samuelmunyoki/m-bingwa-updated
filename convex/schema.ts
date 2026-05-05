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
    webSessionToken: v.optional(v.string()),
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
    commission: v.optional(v.number()),
    isMultiSession: v.boolean(),
    isSimpleUSSD: v.optional(v.boolean()),
    responseValidatorText: v.optional(v.string()),
    autoReschedule: v.optional(v.string()),
    dialingSIM: v.union(v.literal("SIM1"), v.literal("SIM2")),
    offerType: v.optional(v.union(
    v.literal("Data"), 
    v.literal("SMS"), 
    v.literal("Minutes"), 
    v.literal("Airtime"),
    v.literal("Bundles"),
    v.literal("Other"))
  ),
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
    subscriptionEnds: v.optional(v.number()), // ADD THIS
    userId: v.optional(v.string()), // ADD THIS
    verified: v.optional(v.boolean()),
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
      v.literal("QUEUED"),
      v.literal("EXECUTED"),
      v.literal("FAILED")
    ),
    unscheduled: v.boolean(),
    scheduledTimeStamp: v.number(),
    repeatDaily: v.boolean(),
    messageId: v.optional(v.string()),
    localId: v.optional(v.string()),
    offerId: v.optional(v.string()),
    offerName: v.optional(v.string()),
    offerDuration: v.optional(v.string()),
    offerPrice: v.optional(v.number()),
    offerNum: v.optional(v.string()),
    dialingSim: v.optional(v.string()),
    isMultiSession: v.optional(v.boolean()),
    isSimpleUSSD: v.optional(v.boolean()),
    responseValidatorText: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_messageId", ["messageId"])
    .index("by_localId", ["localId", "userId"]),

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
    createdAt: v.optional(v.number()),
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
  amount: v.float64(),//amount: v.number(),
  phoneNumber: v.string(),
  senderId: v.string(),
  time: v.float64(),//time: v.number(),
  userId: v.string(),
  transactionId: v.optional(v.string()),
  processed: v.optional(v.union(
    v.literal("pending"),
    v.literal("successful"),
    v.literal("failed"),
    v.literal("not-viable"),
    v.literal("disabled")
  )),
  fullMessage: v.optional(v.string()),
  processResponse: v.optional(v.string()),
  offerName: v.optional(v.string()),
  processedUSSD: v.optional(v.string()),
  verified: v.optional(v.boolean()),
  mpesaDate: v.optional(v.float64()),
  })
    .index("by_user_id", ["userId"])
    .index("by_phone_number", ["phoneNumber"])
    .index("by_sender_id", ["senderId"])
    .index("by_time", ["time"])
    .index("by_processed", ["processed"])
    .index("by_user_id_time", ["userId", "time"]),

  userSenderRelations: defineTable({
    userId: v.string(),
    senderId: v.string(),
    lastUpdateTimeStamp: v.float64()
  })
    .index("by_user_id", ["userId"])
    .index("by_sender_id", ["senderId"])
    .index("by_user_sender", ["userId", "senderId"])
    .index("by_timestamp", ["lastUpdateTimeStamp"]),


  promoCodes: defineTable({
     promoCode: v.string(), 
     validDays: v.number(), 
     endDate: v.number(), 
     createdAt: v.number(),
     isActive: v.boolean(), 
     description: v.optional(v.string()), 
     maxUsages: v.optional(v.number()), 
     currentUsages: v.optional(v.number()),
  })
    .index("by_code", ["promoCode"])
    .index("by_active", ["isActive"])
    .index("by_end_date", ["endDate"]),

  promoUsers: defineTable({
     userId: v.string(),
     promoCode: v.string(),
     usedAt: v.number(),
     subscriptionExtended: v.number(), 
     subscriptionEnds: v.number(), 
  })
    .index("by_user", ["userId"])
    .index("by_code", ["promoCode"])
    .index("by_user_and_code", ["userId", "promoCode"]),

  airtimeTransactions: defineTable({
     userId: v.string(),
     phoneNumber: v.string(),
     recipientNumber: v.string(), // 0743020413
     amount: v.number(),
     transactionDate: v.number(), 
     ussdCode: v.string(),
     ussdResponse: v.string(), 
     parsedAmount: v.optional(v.number()), 
     parsedRecipient: v.optional(v.string()), 
     status: v.union(v.literal("PENDING"), v.literal("SUCCESS"), v.literal("FAILED")),
     subscriptionEnds: v.number(), 
     subscriptionDays: v.number(), 
     paidDays: v.number(), 
     promoDays: v.optional(v.number()), 
     promoCode: v.optional(v.string()), 
     failureReason: v.optional(v.string()), 
     simSlot: v.string(), 
})
     .index("by_user", ["userId"])
     .index("by_status", ["status"])
     .index("by_date", ["transactionDate"])
     .index("by_user_and_status", ["userId", "status"]),


   deviceSessions: defineTable({
    phoneNumber: v.string(),       
    deviceId: v.string(),       
    deviceModel: v.string(),  
    userId: v.string(),        
    loginTimestamp: v.number(),     
    lastActiveTimestamp: v.number(), 
    isActive: v.boolean(),     
  })
    .index("by_phone", ["phoneNumber"])   
    .index("by_device", ["deviceId"])     
    .index("by_userId", ["userId"]),


  bridgeOffers: defineTable({
    userId: v.string(),
    phoneNumber: v.string(),
    name: v.string(),
    type: v.union(v.literal("Data"), v.literal("SMS"), v.literal("Minutes")),
    price: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_phone", ["phoneNumber"])
    .index("by_price", ["userId", "price"]),  

  bridgeDevices: defineTable({
    userId: v.string(),
    phoneNumber: v.string(),           // Owner/Sender phone number
    deviceName: v.string(),
    devicePhoneNumber: v.string(),     // Receiver device phone number
    selectedOfferIds: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_phone", ["phoneNumber"]),  

  bridgeWhitelist: defineTable({
    userId: v.string(),
    phoneNumber: v.string(),           // Receiver phone number (owner)
    whitelistedNumber: v.string(),     // Sender phone number (allowed)
    createdAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_receiver", ["phoneNumber"])
    .index("by_whitelist", ["phoneNumber", "whitelistedNumber"]),  

  bridgeTransactions: defineTable({
    id: v.string(),
    userId: v.string(),
    phoneNumber: v.string(),
    deviceId: v.string(),
    offerId: v.string(),
    status: v.union(v.literal("Success"), v.literal("Failed"), v.literal("Pending")),
    smsContent: v.optional(v.string()),
    executedAt: v.optional(v.number()),
    createdAt: v.number()
  })
    .index("by_device", ["deviceId"])
    .index("by_user", ["userId"])
    .index("by_status", ["userId", "status"]),

  totalCommission: defineTable({
    day: v.number(), // Timestamp for the day (e.g., start of day)
    userId: v.string(),
    totalCommissionAmount: v.number(),
    totalAirtimeUsed: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_day", ["day"])
    .index("by_user_and_day", ["userId", "day"]),

  onlineBridgeOffers: defineTable({
    userId: v.string(),
    phoneNumber: v.string(),
    name: v.string(),
    type: v.union(v.literal("Data"), v.literal("SMS"), v.literal("Minutes")),
    price: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_phone", ["phoneNumber"])
    .index("by_price", ["userId", "price"]),

  onlineBridgeDevices: defineTable({
    userId: v.string(),
    phoneNumber: v.string(),           // Owner/Sender phone number
    deviceName: v.string(),
    devicePhoneNumber: v.string(),     // Receiver device phone number
    selectedOfferIds: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_phone", ["phoneNumber"]),

  onlineBridgeWhitelist: defineTable({
    userId: v.string(),
    phoneNumber: v.string(),           // Receiver phone number (owner)
    whitelistedNumber: v.string(),     // Sender phone number (allowed)
    createdAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_receiver", ["phoneNumber"])
    .index("by_whitelist", ["phoneNumber", "whitelistedNumber"]),  

  onlineBridgeTransactions: defineTable({
    userId: v.string(),
    senderPhoneNumber: v.string(),
    receiverPhoneNumber: v.string(),
    deviceId: v.string(),
    offerId: v.string(),
    amount: v.float64(),
    smsContent: v.string(),
    ussdCode: v.optional(v.string()),
    status: v.string(), // "Pending", "Executing", "Success", "Failed", "Rejected"
    result: v.optional(v.string()),
    executedAt: v.optional(v.float64()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
    isDeleted: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_deleted", ["userId", "isDeleted"])
    .index("by_sender", ["senderPhoneNumber"])
    .index("by_receiver", ["receiverPhoneNumber"])
    .index("by_receiver_and_status", ["receiverPhoneNumber", "status"])
    .index("by_status", ["status"])
    .index("by_device", ["deviceId"]),  

  serviceStatus: defineTable({
    phoneNumber: v.string(),
    isServiceRunning: v.boolean(),
    lastUpdated: v.number(),
  })
   .index("by_phone", ["phoneNumber"]),

  emailTokens: defineTable({
    email: v.string(),
    userId: v.string(),
    token: v.number(),
    isVerified: v.boolean(),
    expiresAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  commissionByType: defineTable({
    userId: v.string(),
    day: v.number(),
    offerType: v.string(),
    commissionAmount: v.number(),
    salesCount: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_day", ["userId", "day"])
    .index("by_user_day_type", ["userId", "day", "offerType"]),

  autoSaverStats: defineTable({
    userId: v.string(),
    day: v.number(),
    savedCount: v.number(),
    skippedCount: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_day", ["userId", "day"]),

  deviceHeartbeats: defineTable({
    phoneNumber: v.string(),
    lastSeenTimestamp: v.number(),
    userId: v.string(),
  })
   .index("by_phoneNumber", ["phoneNumber"])
   .index("by_userId", ["userId"]), 

  onlineServiceStatus: defineTable({
    phoneNumber: v.string(),
    userId: v.string(),
    isServiceRunning: v.boolean(),
    updatedAt: v.number(),
  })
   .index("by_phoneNumber", ["phoneNumber"])
   .index("by_userId", ["userId"]), 

  ussdHistory: defineTable({
    userId: v.string(),
    ussdCode: v.string(),
    targetNumber: v.optional(v.string()),
    offerName: v.optional(v.string()),
    status: v.string(), // "Success", "Failed", "Timeout", "Cancelled", "Validation Failed"
    timeTaken: v.string(), 
    timeStamp: v.string(), 
    ussdResponse: v.optional(v.string()), 
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_user_and_timestamp", ["userId", "timeStamp"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_composite_key", ["userId", "timeStamp", "ussdCode"]), 

  retryConfigs: defineTable({
    userId: v.string(),
    name: v.string(),
    timeoutSeconds: v.number(),
    autoRetryEnabled: v.boolean(),
    numberOfRetries: v.number(),
    retryIntervalMinutes: v.number(),
    selectedOffers: v.array(v.string()),
    autoRetryConnectionProblems: v.boolean(),
    updatedAt: v.number(), 
  })
    .index("by_user", ["userId"]),  
  
  ussdCodes: defineTable({
    airtimeUssdCode: v.string(),
    bongaUssdCode: v.string(),
    updatedAt: v.number(), 
  }),  

  userModeSettings: defineTable({
    userId: v.string(),
    isNormalMode: v.boolean(),
    isSimpleMode: v.boolean(),
    isAdvancedMode: v.boolean(),
    updatedAt: v.number(), 
  }).index("by_user", ["userId"]),

  appLogs: defineTable({
    userId: v.optional(v.string()),
    deviceModel: v.string(),
    deviceManufacturer: v.string(),
    androidVersion: v.string(),
    tag: v.string(),
    message: v.string(),
    level: v.string(), // "D", "I", "W", "E"
    timestamp: v.number(),
    sessionId: v.string(), // to group logs from same execution
  }).index("by_device", ["deviceManufacturer", "deviceModel"])
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"]),

  fcmTokens: defineTable({
    userId: v.string(),
    deviceId: v.string(),
    token: v.string(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_deviceId", ["deviceId"]),

  balanceRequests: defineTable({
    userId: v.string(),
    deviceId: v.string(),
    simSlot: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
    airtimeBalance: v.optional(v.string()),
    bongaPoints: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),

});

