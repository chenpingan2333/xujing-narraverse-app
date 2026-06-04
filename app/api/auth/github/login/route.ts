import { NextResponse } from "next/server";

const GITHUB_CLIENT_ID = process.env["GITHUB_CLIENT_ID"] ?? "";
const GITHUB_REDIRECT_URI = process.env["GITHUB_REDIRECT_URI"] ?? "http://localhost:3000/api/auth/github/callback";

export async function GET() {
  if (!GITHUB_CLIENT_ID) {
    return NextResponse.json({ error: "GitHub OAuth 未配置" }, { status: 500 });
  }
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "read:user user:email",
    state: crypto.randomUUID(),
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}