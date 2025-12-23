// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// import { NextRequest, NextResponse } from "next/server";

// const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// // Combine Clerk middleware and subdomain handling
// export default clerkMiddleware(async (auth, req) => {
//   const request = req as NextRequest;
//   const url = request.nextUrl.clone();
//   const hostname = request.headers.get("host") || "";
//   const [subdomain, domain] = hostname.split(".");


//   // First, handle Clerk authentication for protected routes
//   if (isProtectedRoute(request)) {
//     await auth.protect();
//   }

//   // // Then, handle subdomain routing
//   // // Check if we're dealing with a localhost subdomain
//   if (subdomain !== process.env.NEXT_SERVER_DOMAIN && subdomain !== "10") {
//     // Rewrite the URL for localhost subdomains
//     url.pathname = `/store/${subdomain}${url.pathname}`;
//     return NextResponse.rewrite(url);
//   }

//   // If it's not a subdomain we want to handle, continue without rewriting
//   return NextResponse.next();
// });

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
//     // Always run for API routes
//     "/(api|trpc)(.*)",
//     // Include dashboard routes for Clerk protection
//     "/dashboard(.*)",
//   ],
// };
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const request = req as NextRequest;
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || ""; // e.g. store.localhost:3000 or m-bingwa.com
  const [hostWithoutPort] = hostname.split(":"); // remove port if exists
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
