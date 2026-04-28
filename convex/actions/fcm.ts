"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

function toBase64Url(input: string): string {
  return Buffer.from(input).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimB64 = toBase64Url(JSON.stringify(claim));
  const signingInput = `${headerB64}.${claimB64}`;

  // Normalize private key — handle both literal \n and actual newlines
  const pemKey = privateKey.replace(/\\n/g, "\n").trim();
  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binaryKey = Buffer.from(keyData, "base64");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(signingInput)
  );

  const signatureB64 = Buffer.from(signature).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData: any = await tokenResp.json();
  if (!tokenData.access_token) {
    console.error("Token exchange failed:", JSON.stringify(tokenData));
    throw new Error(`Token exchange failed: ${tokenData.error_description ?? tokenData.error ?? "unknown"}`);
  }
  return tokenData.access_token;
}

export const sendBalanceCheckPush = action({
  args: { userId: v.string(), requestId: v.string(), simSlot: v.string() },
  handler: async (ctx, { userId, requestId, simSlot }): Promise<{ success: boolean; error?: string }> => {
    const clientEmail: string | undefined = process.env.FCM_CLIENT_EMAIL;
    const privateKey: string | undefined = process.env.FCM_PRIVATE_KEY;
    const projectId: string | undefined = process.env.FCM_PROJECT_ID;

    if (!clientEmail || !privateKey || !projectId) {
      console.error("FCM env vars not set");
      return { success: false, error: "FCM not configured" };
    }

    const fcmRecord: { token: string; deviceId: string } | null = await ctx.runQuery(
      api.features.balanceRequests.getFcmToken, { userId }
    );
    if (!fcmRecord?.token) {
      await ctx.runMutation(api.features.balanceRequests.failBalanceRequest, {
        requestId,
        error: "No FCM token found for device. Open the app first.",
      });
      return { success: false, error: "No FCM token" };
    }

    try {
      const accessToken: string = await getAccessToken(clientEmail, privateKey);

      const fcmResp: Response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: fcmRecord.token,
              data: { type: "check_balance", requestId, userId, simSlot },
            },
          }),
        }
      );

      const fcmData: any = await fcmResp.json();
      if (!fcmResp.ok) {
        console.error("FCM send failed:", fcmData);
        await ctx.runMutation(api.features.balanceRequests.failBalanceRequest, {
          requestId,
          error: `FCM error: ${fcmData?.error?.message ?? "unknown"}`,
        });
        return { success: false, error: fcmData?.error?.message };
      }

      return { success: true };
    } catch (e: any) {
      console.error("FCM error name:", e?.name);
      console.error("FCM error message:", e?.message);
      console.error("FCM error stack:", e?.stack);
      const errMsg = e?.message || e?.name || String(e) || "Unknown error";
      await ctx.runMutation(api.features.balanceRequests.failBalanceRequest, {
        requestId,
        error: errMsg,
      });
      return { success: false, error: errMsg };
    }
  },
});
