"use node";

import fetch from "node-fetch";
import { action } from "../_generated/server";

interface SafaricomOAuthResponse {
  access_token: string;
  expires_in: string;
}

interface SafaricomErrorResponse {
  errorCode: string;
  errorMessage: string;
}

export const generateOAuthToken = action({
  handler: async (_): Promise<{ accessToken: string; expiresIn: number }> => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    console.log("Consumer Key exists:", !!consumerKey);
    console.log("Consumer Secret exists:", !!consumerSecret);
    console.log("Consumer Key length:", consumerKey?.length);

     const url =
       "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(consumerKey + ":" + consumerSecret).toString("base64"),
        },
      });

      
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response body:", responseText);

      /**if (!response.ok) {
        const errorData = (await response.json()) as SafaricomErrorResponse;
        switch (errorData.errorCode) {
          case "400.008.02":
            throw new Error(
              "Invalid grant type passed. Please select grant type as client credentials."
            );
          case "400.008.01":
            throw new Error(
              "Invalid Authentication passed. Please use Basic Auth."
            );
          default:
            throw new Error(
              `HTTP error! status: ${response.status}, message: ${errorData.errorMessage}`
            );
        }
      }**/
     if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText) as SafaricomErrorResponse;
        } catch {
          throw new Error(`HTTP error ${response.status}: ${responseText}`);
        }
        
        switch (errorData.errorCode) {
          case "400.008.02":
            throw new Error(
              "Invalid grant type passed. Please select grant type as client credentials."
            );
          case "400.008.01":
            throw new Error(
              "Invalid Authentication passed. Please use Basic Auth."
            );
          default:
            throw new Error(
              `HTTP error! status: ${response.status}, message: ${errorData.errorMessage}`
            );
        }
      }

      const data = JSON.parse(responseText) as SafaricomOAuthResponse;

      return {
        accessToken: data.access_token,
        expiresIn: parseInt(data.expires_in),
      };
    } catch (error) {
      console.error("Error generating OAuth token:", error);
      throw error;
    }
  },
});
