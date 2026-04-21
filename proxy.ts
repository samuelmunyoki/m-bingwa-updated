import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const request = req as NextRequest;
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const [hostWithoutPort] = hostname.split(":"); 
  const parts = hostWithoutPort.split(".");

  // Determine subdomain
  let subdomain = "";
  if (parts.length > 1) {
    // For localhost subdomain: store.localhost
    subdomain = parts[0];
  }

  // Protect dashboard routes with Clerk
  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  // Rewrite if it's a subdomain and not the main domain
  if (
    subdomain && 
    hostWithoutPort !== process.env.NEXT_SERVER_DOMAIN // skip main domain
  ) {
    url.pathname = `/store/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Otherwise, go to normal route
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/dashboard(.*)",
  ],
};
