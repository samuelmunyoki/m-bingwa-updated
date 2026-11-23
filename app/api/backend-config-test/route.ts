// TEST notice board: points test-build phones at the rehearsal deployment. Must never read Convex. Delete after migration tests.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      syncUrl: "https://convex-backend.m-bingwa.com:3210",
      webUrl: "http://convex-backend.m-bingwa.com:3211/",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
