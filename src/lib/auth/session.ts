import { cookies } from "next/headers";
import { queryOne, query } from "@/lib/db/pool";
import { sha256, generateSessionToken } from "@/lib/auth/crypto";
import {
  SESSION_COOKIE, SESSION_TTL_MS,
  type AuthContext,
} from "@/features/narraverse/auth/types";

/** Create a new session for a user, return the session token (to set as cookie) */
export async function createSession(userId: string, ip?: string, ua?: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt.toISOString(), ip ?? null, ua ?? null],
  );

  return token;
}

/** Validate a session token and return AuthContext, or null */
export async function validateSession(token: string): Promise<AuthContext | null> {
  const tokenHash = sha256(token);

  const row = await queryOne<{
    session_id: string; user_id: string; expires_at: string;
    email: string | null; name: string; avatar_url: string | null;
    is_vip: boolean; is_banned: boolean; is_admin: boolean;
  }>(
    `SELECT s.id AS session_id, s.user_id, s.expires_at,
            u.email, u.name, u.avatar_url, u.is_vip, u.is_banned, u.is_admin
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_banned = false`,
    [tokenHash],
  );

  if (!row) return null;

  // Update last_seen_at
  await query(
    `UPDATE sessions SET last_seen_at = now() WHERE id = $1`,
    [row.session_id],
  );

  return {
    userId: row.user_id,
    sessionId: row.session_id,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      createdAt: new Date(),
      updatedAt: new Date(),
      isVip: row.is_vip,
      isBanned: row.is_banned,
      isAdmin: row.is_admin,
    },
  };
}

/** Destroy a session by token */
export async function destroySession(token: string): Promise<void> {
  const tokenHash = sha256(token);
  await query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}

/** Get session cookie value from incoming request */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Set session cookie on response */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** Clear session cookie */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Auth middleware — returns AuthContext or throws */
export async function requireAuth(): Promise<AuthContext> {
  const token = await getSessionToken();
  if (!token) throw new AuthError("UNAUTHORIZED", "请先登录");

  const ctx = await validateSession(token);
  if (!ctx) throw new AuthError("SESSION_EXPIRED", "登录已过期，请重新登录");

  return ctx;
}

/** Optional auth — returns AuthContext or null */
export async function optionalAuth(): Promise<AuthContext | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return validateSession(token);
}

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "SESSION_EXPIRED" | "INVITE_REQUIRED" | "BANNED",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
