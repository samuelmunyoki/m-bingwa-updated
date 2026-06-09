import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-version";

export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
