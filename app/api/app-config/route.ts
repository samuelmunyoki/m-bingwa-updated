import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexClient } from "@/convex/client";

export async function GET() {
  try {
    const config = await convexClient.query(api.features.appConfig.get, {});
    return NextResponse.json({ minimumVersion: config.minimumVersion });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch app config" },
      { status: 500 }
    );
  }
}
