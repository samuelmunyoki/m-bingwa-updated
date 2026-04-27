"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimB64 = btoa(JSON.stringify(claim))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${headerB64}.${claimB64}`;

  const pemKey = privateKey.replace(/\\n/g, "\n");
  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

export const sendBalanceCheckPush = action({
  args: { userId: v.string(), requestId: v.string() },
  handler: async (ctx, { userId, requestId }): Promise<{ success: boolean; error?: string }> => {
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
              data: { type: "check_balance", requestId, userId },
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
      console.error("FCM action error:", e);
      await ctx.runMutation(api.features.balanceRequests.failBalanceRequest, {
        requestId,
        error: e.message,
      });
      return { success: false, error: e.message };
    }
  },
});
