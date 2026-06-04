import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { createSession } from "@/lib/auth/session";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/features/narraverse/auth/types";
import { cookies } from "next/headers";

const GITHUB_CLIENT_ID = process.env["GITHUB_CLIENT_ID"] ?? "";
const GITHUB_CLIENT_SECRET = process.env["GITHUB_CLIENT_SECRET"] ?? "";

interface GitHubUser { id: number; login: string; avatar_url: string; email: string | null; name: string | null; }

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code) return NextResponse.json({ error: "缺少授权码" }, { status: 400 });

  // Verify OAuth state to prevent CSRF
  if (state) {
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state")?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.json({ error: "OAuth state mismatch" }, { status: 403 });
    }
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return NextResponse.json({ error: "GitHub 授权失败" }, { status: 401 });
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Narraverse" },
    });
    const ghUser = await userRes.json() as GitHubUser;

    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Narraverse" },
      });
      const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails.find((e) => e.verified)?.email ?? null;
    }

    const providerId = String(ghUser.id);

    const existingLink = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM auth_providers WHERE provider = 'github' AND provider_id = $1`,
      [providerId],
    );

    let userId: string;

    if (existingLink) {
      userId = existingLink.user_id;
    } else {
      const userRow = await queryOne<{ id: string }>(
        `INSERT INTO users (email, name, avatar_url)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET avatar_url = COALESCE(users.avatar_url, $3), updated_at = now()
         RETURNING id`,
        [email, ghUser.name ?? ghUser.login, ghUser.avatar_url],
      );
      userId = userRow!.id;

      await query(
        `INSERT INTO auth_providers (user_id, provider, provider_id, email, metadata)
         VALUES ($1, 'github', $2, $3, $4)
         ON CONFLICT (provider, provider_id) DO NOTHING`,
        [userId, providerId, email, JSON.stringify({ login: ghUser.login })],
      );
    }

    const token = await createSession(userId);
    const isProduction = process.env["NODE_ENV"] === "production";
    const secureFlag = isProduction ? "; Secure" : "";
    const cookieValue = SESSION_COOKIE + "=" + token + "; HttpOnly" + secureFlag + "; SameSite=Lax; Path=/; Max-Age=" + (SESSION_TTL_MS / 1000);

    // Clear oauth_state cookie and set session cookie via HTML page
    return new NextResponse(
      '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/chat"></head><body><script>location.href="/chat"</script></body></html>',
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Set-Cookie": cookieValue + ", oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        },
      }
    );
  } catch (err) {
    console.error("GitHub callback error:", err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200));
    return NextResponse.redirect(new URL("/?error=github_auth_failed", req.url));
  }
}
