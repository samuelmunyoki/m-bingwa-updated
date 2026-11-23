// TEST notice board: points test-build phones at the rehearsal deployment. Must never read Convex. Delete after migration tests.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "test failure" },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}
