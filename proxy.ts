import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getRequestId, requestIdHeaders } from "@/lib/request-id";

function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export default auth((request) => {
  const requestId = getRequestId(request);
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const isAuthenticated = Boolean(request.auth);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (isApiRequest) {
    const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth/");
    const isMutation = request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS";

    if (isMutation && !isAuthRoute && !isSameOriginMutation(request)) {
      return NextResponse.json(
        { error: "Cross-origin request blocked", requestId },
        {
          status: 403,
          headers: requestIdHeaders(requestId)
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-Request-ID", requestId);
    return response;
  }

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname + request.nextUrl.search
    );
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("X-Request-ID", requestId);
    return response;
  }

  if (isAuthenticated && isLoginPage) {
    const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
    response.headers.set("X-Request-ID", requestId);
    return response;
  }

  const response = NextResponse.next();
  Object.entries(requestIdHeaders(requestId)).forEach(([key, value]) => response.headers.set(key, value));
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
