import { NextRequest, NextResponse } from "next/server";

const GITHUB_CLIENT_ID = process.env["GITHUB_CLIENT_ID"] ?? "";

export async function GET(req: NextRequest) {
  if (!GITHUB_CLIENT_ID) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 500 });
  }

  const redirectUri = new URL("/api/auth/github/callback", req.url).toString();
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });
  const res = NextResponse.redirect("https://github.com/login/oauth/authorize?" + params.toString());
  // Store state in a short-lived cookie for CSRF verification in callback
  res.headers.set(
    "Set-Cookie",
    "oauth_state=" + state + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600"
  );
  return res;
}
