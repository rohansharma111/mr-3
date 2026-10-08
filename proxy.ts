import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getRequestId, requestIdHeaders } from "@/lib/request-id";

export default auth((request) => {
  const requestId = getRequestId(request);
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const isAuthenticated = Boolean(request.auth);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (isApiRequest) {
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
