import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { createSession, setSessionCookie } from "@/lib/auth/session";

const GITHUB_CLIENT_ID = process.env["GITHUB_CLIENT_ID"] ?? "";
const GITHUB_CLIENT_SECRET = process.env["GITHUB_CLIENT_SECRET"] ?? "";

interface GitHubUser { id: number; login: string; avatar_url: string; email: string | null; name: string | null; }

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "缺少授权码" }, { status: 400 });

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
    const redirectRes = NextResponse.redirect(new URL("/chat", req.url));
    redirectRes.cookies.set("narraverse_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return redirectRes;
  } catch (err) {
    console.error("GitHub callback error:", err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200));
    return NextResponse.redirect(new URL("/?error=github_auth_failed", req.url));
  }
}