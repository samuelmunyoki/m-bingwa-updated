import { api } from "@/convex/_generated/api";
import { convexClient } from "@/convex/client"; // You need to set up a Convex client instance

export async function GET() {
  const users = await convexClient.query(api.users.getAllUsers, {});
  return Response.json({ users });
}