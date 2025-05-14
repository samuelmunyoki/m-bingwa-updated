"use node"; // Specifies that this script is running in a Node.js environment.

import { v } from "convex/values"; // Import validation utilities for Convex.
import { api } from "../_generated/api"; // Import the API configuration.
import { action } from "../_generated/server"; // Import the action function from the Convex server.

export const sendNotificationSMS = action({
  args: {
    userId: v.string(), // User ID as a required string.
    smsNumber: v.string(), // Recipient phone number as a required string.
    smsContent: v.string(), // SMS message content as a required string.
  },
  handler: async (ctx, args) => {
    const { smsNumber, smsContent } = args;

    // Load environment variables for SMS API integration.
    const smsApiKey = process.env.SMS_API_KEY;
    const smsPartnerID = process.env.SMS_PARTNER_ID;
    const smsSenderID = process.env.SMS_SENDER_ID;
    const smsEndpoint = process.env.SMS_SEND_ENDPOINT;

    // Ensure all required environment variables are set.
    if (!smsApiKey || !smsPartnerID || !smsEndpoint) {
      throw new Error(
        "SMS API configuration is missing in environment variables."
      );
    }

    // Construct the request body for the SMS API.
    const requestBody = {
      apikey: smsApiKey,
      partnerID: smsPartnerID,
      message: smsContent,
      shortcode: smsSenderID, // Sender ID (shortcode) for the SMS.
      mobile: smsNumber, // Recipient's phone number.
    };

    try {
      // Send the SMS request to the external API.
      const response = await fetch(smsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody), // Convert request data to JSON format.
      });

      // Check if the API response is unsuccessful.
      if (!response.ok) {
        throw new Error(`SMS API Error: HTTP status ${response.status}`);
      }

      // Parse the API response.
      const data = await response.json();
      const { "response-description": responseDescription, messageid } =
        data.responses[0]; // Extract response details.

      // If the SMS was sent successfully, log the SMS details in the database.
      if (responseDescription == "Success") {
        await ctx.runMutation(api.features.sms.createSMS, {
          userId: args.userId,
          smsContent: args.smsContent,
          smsReciepient: args.smsNumber,
          service: "NOTIFICATION",
        }).then(async (res) => {
          // Update the SMS record with message ID and status.
          await ctx.runMutation(api.features.sms.updateSMS, {
            smsId: res.data, // ID of the created SMS record.
            messageId: messageid, // Message ID returned by the API.
            status: responseDescription, // Status of the SMS.
            service: "NOTIFICATION",
          });
        });
      }
    } catch (error) {
      // Log an error message if the SMS fails to send.
      console.log("Error sending notification.", error);
    }
  },
});
