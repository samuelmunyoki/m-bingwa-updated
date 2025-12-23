"use node";

// Import validation utilities for Convex.
import { v } from "convex/values";

// Import the action function from the Convex server.
import { action } from "../_generated/server";

// Import the API configuration.
import { api } from "../_generated/api";

// Define an action to send a scheduled SMS.
export const sendScheduleSMS = action({
  // Define the required arguments for the action.
  args: {
    // User ID of the person sending the SMS.
    userId: v.string(),

    // Recipient phone number.
    smsNumber: v.string(),

    // SMS message content.
    smsContent: v.string(),

    // ID of the scheduled event.
    scheduleId: v.string(),
  },

  // Define the handler function that executes the SMS sending logic.
  handler: async (ctx, args) => {
    // Extract relevant parameters from the arguments.
    const { smsNumber, smsContent } = args;

    // Load SMS API credentials from environment variables.
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
      shortcode: smsSenderID, // Sender ID for the SMS.
      mobile: smsNumber, // Recipient's phone number.
    };

    try {
      // Send the SMS request to the external API.
      const response = await fetch(smsEndpoint, {
        method: "POST", // HTTP method used for the request.
        headers: {
          "Content-Type": "application/json", // Specify JSON as the content type.
        },
        body: JSON.stringify(requestBody), // Convert request data to JSON format.
      });

      // Check if the API response indicates an error.
      if (!response.ok) {
        throw new Error(`SMS API Error: HTTP status ${response.status}`);
      }

      // Parse the API response.
      const data = await response.json();
      const { "response-description": responseDescription, messageid } =
        data.responses[0]; // Extract response details.

      // If the SMS was sent successfully, update the event status and log the SMS.
      if (responseDescription == "Success") {
        // Update the status of the scheduled event to "QUEUED".
        await ctx.runMutation(api.features.scheduled_events.updateEventStatus, {
          id: args.scheduleId,
          status: "QUEUED",
          messageId: messageid,
        });

        // Store SMS details in the database.
        await ctx
          .runMutation(api.features.sms.createSMS, {
            userId: args.userId,
            smsContent: args.smsContent,
            smsReciepient: args.smsNumber,
            service: "SCHEDULER",
          })
          .then(async (res) => {
            console.log("SCHEDULER RES", res); // Log response for debugging.

            // Update SMS record with message ID and status.
            await ctx.runMutation(api.features.sms.updateSMS, {
              smsId: res.data, // ID of the created SMS record.
              messageId: messageid, // Message ID returned by the API.
              status: responseDescription, // Status of the SMS.
              service: "SCHEDULER",
            });
          });
      } else {
        // If the SMS failed, update the event status to "ERRORED".
        await ctx.runMutation(api.features.scheduled_events.updateEventStatus, {
          id: args.scheduleId,
          status: "ERRORED",
        });
      }
    } catch (error) {
      // Handle errors by updating the event status to "ERRORED".
      await ctx.runMutation(api.features.scheduled_events.updateEventStatus, {
        id: args.scheduleId,
        status: "ERRORED",
      });
    }
  },
});
