"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { BackendResponse } from "../../lib/custom_types";

export const sendSMS = action({
  args: {
    smsNumber: v.string(),
    smsContent: v.string(),
    smsId: v.string(),
    service: v.union(
      v.literal("USSD"),
      v.literal("SCHEDULER"),
      v.literal("STORE"),
      v.literal("NOTIFICATION"),
    ),
  },
  handler: async (ctx, args) => {
    const { smsNumber, smsContent } = args;

    // Load environment variables
    const smsApiKey = process.env.SMS_API_KEY;
    const smsPartnerID = process.env.SMS_PARTNER_ID;
    const smsSenderID = process.env.SMS_SENDER_ID;
    const smsEndpoint = process.env.SMS_SEND_ENDPOINT;

    if (!smsApiKey || !smsPartnerID || !smsEndpoint || !smsSenderID) {
      throw new Error(
        "SMS API configuration is missing in environment variables."
      );
    }

    const requestBody = {
      apikey: smsApiKey,
      partnerID: smsPartnerID,
      message: smsContent,
      shortcode: smsSenderID,
      mobile: smsNumber,
    };

    try {
      const response = await fetch(smsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.log(`SMS API Error: HTTP status ${response.status}`);
        return {
          status: "error",
        } as BackendResponse;
      }

      const data = await response.json();
      const { "response-description": responseDescription, messageid } =
        data.responses[0];

      await ctx.runMutation(api.features.sms.updateSMS, {
        smsId: args.smsId,
        messageId: messageid,
        status: responseDescription,
        service: args.service,
      });
      return {
        status: "success",
        data,
      } as BackendResponse;
    } catch (error) {
      await ctx.runMutation(api.features.sms.updateSMS, {
        smsId: args.smsId,
        status: "Errored",
        service: args.service,
      });
      return {
        status: "error",
      } as BackendResponse;
    }
  },
});

export const sendOTPSMS = action({
  args: {
    smsNumber: v.string(),
    smsContent: v.string(),
    smsId: v.string(),
    service: v.union(
      v.literal("USSD"),
      v.literal("SCHEDULER"),
      v.literal("STORE"),
      v.literal("NOTIFICATION")
    ),
  },
  handler: async (ctx, args) => {
    const { smsNumber, smsContent } = args;

    // Load environment variables
    const smsApiKey = process.env.SMS_API_KEY;
    const smsPartnerID = process.env.SMS_PARTNER_ID;
    const smsSenderID = process.env.SMS_SENDER_ID;
    const smsEndpoint = process.env.SMS_OTP_ENDPOINT;

    if (!smsApiKey || !smsPartnerID || !smsEndpoint || !smsSenderID) {
      throw new Error(
        "SMS API configuration is missing in environment variables."
      );
    }

    const requestBody = {
      apikey: smsApiKey,
      partnerID: smsPartnerID,
      message: smsContent,
      shortcode: smsSenderID,
      mobile: smsNumber,
    };

    try {
      const response = await fetch(smsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.log(`SMS API Error: HTTP status ${response.status}`);
        return {
          status: "error",
        } as BackendResponse;
      }

      const data = await response.json();

      const { "response-description": responseDescription, messageid } =
        data.responses[0];

      await ctx.runMutation(api.features.sms.updateSMS, {
        smsId: args.smsId,
        messageId: messageid,
        status: responseDescription,
        service: args.service,
      });
      return {
        status: "success",
        data,
      } as BackendResponse;
    } catch (error) {
      await ctx.runMutation(api.features.sms.updateSMS, {
        smsId: args.smsId,
        status: "Errored",
        service: args.service,
      });
      return {
        status: "error",
      } as BackendResponse;
    }
  },
});

export const getDeliveryReport = action({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Load environment variables
    const smsApiKey = process.env.SMS_API_KEY;
    const smsPartnerID = process.env.SMS_PARTNER_ID;
    const smsEndpoint = process.env.SMS_DELIVERY_REPORT_ENDPOINT;

    if (!smsApiKey || !smsPartnerID || !smsEndpoint ) {
      throw new Error(
        "SMS API configuration is missing in environment variables."
      );
    }

    const requestBody = {
      apikey: smsApiKey,
      partnerID: smsPartnerID,
      messageID: args.messageId,
    };

    try {
      const response = await fetch(smsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.log(
          `SMS GET DELIVERY REPORT API Error: HTTP status ${response.status}`
        );
        return {
          status: "error",
          message: `HTTP error: ${response.status}`,
          data: null,
        } as BackendResponse;
      }

      const data = await response.json();

      // Check for response-code in the API response
      const {
        "response-code": responseCode,
        "response-description": responseDescription,
      } = data;

      if (responseCode !== 200) {
        // Error response handling
        return {
          status: "error",
          message: responseDescription || `Error code: ${responseCode}`,
          data,
        } as BackendResponse;
      }

      // Success response handling
      const {
        "message-id": messageId,
        "delivery-status": deliveryStatus,
        "delivery-description": deliveryDescription,
      } = data;

      return {
        status: "success",
        message: "Delivery report fetched successfully",
        data: {
          messageId,
          deliveryStatus,
          deliveryDescription,
        },
      } as BackendResponse;
    } catch (error) {
      console.error("Error in fetching delivery report:", error);
      return {
        status: "error",
        message: "An error occurred while processing the request.",
        data: null,
      } as BackendResponse;
    }
  },
});
