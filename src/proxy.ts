import { NextRequest, NextResponse } from "next/server";

// Gates the dashboard (and its data API) behind a single shared password,
// via plain HTTP Basic Auth - the browser's own login prompt, no custom
// login page needed. Username is ignored; only the password matters.
export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    // Not configured - fail open rather than lock everyone out silently.
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const suppliedPassword = decoded.split(":").slice(1).join(":");
    if (suppliedPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ATI Leads Dashboard"' },
  });
}

export const config = {
  matcher: [
    "/dashboard",
    "/api/dashboard/:path*",
    "/sales-dashboard",
    "/api/sales-dashboard/:path*",
    "/SentEmailsCC",
    "/api/sent-emails-cc/:path*",
  ],
};
