// Notice board: tells the Android app which backend to use. Must never read Convex.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_SYNC_URL = "https://convex-backend.m-bingwa.com:3210";
const DEFAULT_WEB_URL = "http://convex-backend.m-bingwa.com:3211/";

export async function GET() {
  const syncUrl = process.env.NEXT_PUBLIC_CONVEX_URL || DEFAULT_SYNC_URL;
  const webUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || DEFAULT_WEB_URL;
  return NextResponse.json(
    { syncUrl, webUrl: webUrl.endsWith("/") ? webUrl : `${webUrl}/` },
    { headers: { "Cache-Control": "no-store" } }
  );
}
