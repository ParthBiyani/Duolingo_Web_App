/**
 * Session basics shared by the proxy (server) and the app (browser). The API sets and clears
 * the HttpOnly session cookie (docs/adr/0003); the app only checks whether it is there.
 */

import { API_BASE } from "@/lib/api/client";

/** Name of the session cookie set by POST /api/v1/auth/login. */
export const SESSION_COOKIE = "duo_session";

export const LOGIN_PATH = "/login";

/** Where a learner lands after logging in. */
export const HOME_PATH = "/learn";

let leaving = false;

/**
 * Sends the browser to the login page after the API answered 401 (an expired or forged
 * session, or learners recreated without the one in the cookie). The cookie is cleared
 * first; otherwise the proxy, which only sees that a cookie exists, would send the browser
 * straight back. Several failing requests trigger this at once, so it runs only once.
 */
export function leaveForLogin(): void {
  if (leaving || window.location.pathname === LOGIN_PATH) return;
  leaving = true;
  void fetch(`${API_BASE}/auth/logout`, { method: "POST", cache: "no-store" })
    .catch(() => undefined)
    .finally(() => window.location.replace(LOGIN_PATH));
}
