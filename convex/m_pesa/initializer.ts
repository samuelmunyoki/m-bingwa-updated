"use node";

import { v } from "convex/values";
import {
  MPesaExpressRequest,
  MPesaExpressResponse,
  MPesaExpressError,
} from "./types";

import { action } from "../_generated/server";
import { api } from "../_generated/api";

export const initiateSTKPush = action({
  args: {
    phoneNumber: v.string(),
    amount: v.string(),
    accountReference: v.string(),
    transactionDesc: v.string(),
    paymentmethod: v.string(),
    paymentAccount: v.string()
  },
  handler: async (ctx, args): Promise<MPesaExpressResponse> => {
    const { phoneNumber, amount, accountReference, transactionDesc, paymentAccount, paymentmethod } = args;

    const url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    try {
      const { accessToken } = await ctx.runAction(
        api.m_pesa.utils.generateOAuthToken
      );

      const date = new Date();
      const timestamp =
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

      const short_code = "4151713";
      const passkey =
        "ec89dde86c2612cec7c04abcc92c1a96a513f810c85cac42d33a73841174f96f";

      const password = Buffer.from(short_code + passkey + timestamp).toString(
        "base64"
      );


      const requestBody: MPesaExpressRequest = {
        BusinessShortCode: short_code,
        Password: password,
        Timestamp: timestamp,
        TransactionType:
          paymentmethod === "TILL"
            ? "CustomerBuyGoodsOnline"
            : "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: paymentAccount,
        PhoneNumber: phoneNumber,
        CallBackURL: "https://convex-backend.m-bingwa.com/stkpush/callback",
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)} Access Token: ${accessToken} Password: ${password}`
        );
      }

      const data = (await response.json()) as MPesaExpressResponse;
     
      return data;
    } catch (error) {
      console.error("Error initiating STK push:", error);
      throw error;
    }
  },
});
