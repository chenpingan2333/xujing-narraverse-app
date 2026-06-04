// ═══════════════════════════════════════════
//  Auth session helpers
//  - Calls /api/auth/session/me via fetch
//  - userId is never stored client-side
//  - Session is httpOnly cookie, never read by JS
// ═══════════════════════════════════════════

import { apiGet } from "./api";

// ─── User type (client-safe, mirrors backend User) ───────────────

export interface SessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  isVip: boolean;
  isBanned: boolean;
  isAdmin: boolean;
}

export interface SessionInfo {
  user: SessionUser;
}

// ─── Fetch current session from server ──────────────────────────

export async function getSession(): Promise<SessionInfo | null> {
  try {
    return await apiGet<SessionInfo>("/api/auth/session/me");
  } catch {
    return null;
  }
}

// ─── Logout ──────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  try {
    await apiGet("/api/auth/session/logout");
  } catch {
    // Swallow — best effort
  }
}

// ─── Check if user is invited ────────────────────────────────────

export interface InviteStatus {
  invited: boolean;
  type?: string;
  usedAt?: string;
  message?: string;
}

export async function getInviteStatus(): Promise<InviteStatus> {
  try {
    return await apiGet<InviteStatus>("/api/invite/status");
  } catch {
    return { invited: false };
  }
}
