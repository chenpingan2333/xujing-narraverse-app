import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/features/narraverse/auth/types";

const PUBLIC_PATHS = [
  "/api/auth",
  "/api/invite",
  "/invite-waiting",
  "/_next",
  "/favicon.ico",
  "/login",
];
const INVITE_PROTECTED = ["/chat", "/worlds", "/characters", "/api/chat"];
const NO_INVITE_PATHS = ["/membership", "/api/membership", "/profile", "/api/profile", "/api/wallet", "/marketplace", "/api/marketplace", "/api/characters/my", "/recharge", "/api/recharge", "/admin", "/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (pathname === "/") return NextResponse.next();

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;

  // Membership paths: require auth but no invite gate
  if (NO_INVITE_PATHS.some((p) => pathname.startsWith(p))) {
    if (!sessionToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Invite gate: default OFF, only active when explicitly enabled
  const requireInvite = process.env.REQUIRE_INVITE === "true";
  const needsInvite = requireInvite && INVITE_PROTECTED.some((p) =>
    pathname.startsWith(p)
  );
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