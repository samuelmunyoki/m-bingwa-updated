import { ConvexHttpClient } from "convex/browser"; // or "convex/node" for server-side

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "http://localhost:4000"; // Use your Convex server URL

export const convexClient = new ConvexHttpClient(convexUrl);