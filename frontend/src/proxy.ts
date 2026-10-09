import { NextResponse, type NextRequest } from "next/server";

import { HOME_PATH, LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth";

/**
 * Optimistic session check before a page renders: without the session cookie every app page
 * redirects to the login page, and with it the login page redirects to the app. The cookie's
 * signature is checked by the API, which answers 401 when it is not valid; the app then
 * clears the cookie and comes back here (see leaveForLogin).
 */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has(SESSION_COOKIE);
  const onLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  if (onLoginPage && signedIn) return NextResponse.redirect(new URL(HOME_PATH, request.url));
  if (!onLoginPage && !signedIn) return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  return NextResponse.next();
}

export const config = {
  // Pages only: not the API (proxied to the backend, which checks the session itself), Next's
  // own assets, or files with an extension (fonts, icons, robots.txt).
  matcher: ["/((?!api/|_next/|.*\\.[^/]+$).*)"],
};
