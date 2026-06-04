import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/features/narraverse/auth/types";

/**
 * Middleware: protect routes and validate invite access.
 *
 * Public routes (no auth required):
 *   /, /api/auth/*, /api/invite/*, /invite-waiting, /login, /_next/*, /favicon.ico
 *
 * Invite-protected (auth + invite required):
 *   /chat, /worlds, /characters, /api/chat
 *
 * Flow:
 *   unauthenticated → /login?redirect=<original>
 *   authenticated, no invite → /invite-waiting?redirect=<original>
 *   authenticated, invited → normal access
 */
const PUBLIC_PATHS = [
  "/api/auth",
  "/api/invite",
  "/invite-waiting",
  "/_next",
  "/favicon.ico",
  "/login",
];
const INVITE_PROTECTED = ["/chat", "/worlds", "/characters", "/api/chat"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Allow home page
  if (pathname === "/") return NextResponse.next();

  // Check for session cookie
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Invite gating: redirect invite-protected paths to invite-waiting.
  // The invite-waiting page checks /api/invite/status and either shows
  // the invite form or redirects to the original target if already invited.
  const needsInvite = INVITE_PROTECTED.some((p) => pathname.startsWith(p));
  if (needsInvite) {
    const inviteUrl = new URL("/invite-waiting", req.url);
    inviteUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(inviteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
