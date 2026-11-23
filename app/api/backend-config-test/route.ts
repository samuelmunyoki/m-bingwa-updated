// TEST notice board: points test-build phones at the rehearsal deployment. Must never read Convex. Delete after migration tests.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      syncUrl: "https://nothing-here-123.eu-west-1.convex.cloud",
      webUrl: "https://nothing-here-123.eu-west-1.convex.site/",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
