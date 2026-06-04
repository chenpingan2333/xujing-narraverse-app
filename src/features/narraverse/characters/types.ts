import { z } from "zod";

// ─── Custom Character ──────────────────────────────────────────────────────
export type CharacterTier = "basic" | "premium" | "story";

export interface CustomCharacter {
  id: string;
  userId: string;
  name: string;
  persona: string;
  description: string;
  tier: CharacterTier;
  avatar: string;
  worldId: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// ─── Relationship snapshot (server-side only) ──────────────────────────────
export interface CharacterRelationship {
  userId: string;
  characterId: string;
  affection: number;
  trust: number;
  intimacy: number;
  status: "active" | "archived";
}

// ─── Zod schemas for API validation ────────────────────────────────────────
export const CreateCharacterRequest = z.object({
  name: z.string().min(1, "角色名不能为空").max(40, "角色名过长"),
  persona: z.string().min(1, "角色描述不能为空").max(1000, "描述过长"),
  description: z.string().max(300).optional().default(""),
  tier: z.enum(["basic", "premium", "story"]).default("basic"),
  avatar: z.string().max(8).optional().default("✨"),
  worldId: z.string().nullable().optional().default(null),
});
export type CreateCharacterInput = z.infer<typeof CreateCharacterRequest>;

export const UpdateCharacterRequest = z.object({
  name: z.string().min(1).max(40).optional(),
  persona: z.string().min(1).max(1000).optional(),
  description: z.string().max(300).optional(),
  tier: z.enum(["basic", "premium", "story"]).optional(),
  avatar: z.string().max(8).optional(),
  worldId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterRequest>;

// ─── API response (no userId exposed) ──────────────────────────────────────
export interface CustomCharacterResponse {
  id: string;
  name: string;
  persona: string;
  description: string;
  tier: CharacterTier;
  avatar: string;
  worldId: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Strip userId from character for client-safe response */
export function toCharacterResponse(c: CustomCharacter): CustomCharacterResponse {
  return {
    id: c.id,
    name: c.name,
    persona: c.persona,
    description: c.description,
    tier: c.tier,
    avatar: c.avatar,
    worldId: c.worldId,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
