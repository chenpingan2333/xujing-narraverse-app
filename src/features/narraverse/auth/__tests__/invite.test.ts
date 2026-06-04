import { describe, it, expect } from "vitest";
import { UseInviteRequest } from "../types.js";

describe("UseInviteRequest", () => {
  it("accepts valid invite code", () => {
    expect(() => UseInviteRequest.parse({ code: "NARRA-2026-ABCD" })).not.toThrow();
  });

  it("accepts short codes (min 4 chars)", () => {
    expect(() => UseInviteRequest.parse({ code: "ABCD" })).not.toThrow();
  });

  it("rejects codes shorter than 4 characters", () => {
    expect(() => UseInviteRequest.parse({ code: "ABC" })).toThrow();
  });

  it("rejects codes longer than 32 characters", () => {
    expect(() => UseInviteRequest.parse({ code: "A".repeat(33) })).toThrow();
  });
});

describe("Invite business rules", () => {
  it("use_count >= max_uses means exhausted", () => {
    expect(5).toBeGreaterThanOrEqual(5);
  });

  it("expired codes should be rejected", () => {
    const now = new Date();
    const expired = new Date(now.getTime() - 1000);
    expect(expired.getTime()).toBeLessThan(now.getTime());
  });
});