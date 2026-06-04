import { z } from "zod";

// ─── Speech Style ──────────────────────────────────────────────────────────
export const SpeechStyle = z.object({
  formality: z.number().min(0).max(1).describe("0=casual, 1=formal"),
  sentenceLength: z.enum(["short", "medium", "long"]).describe("typical utterance length"),
  expressiveness: z.number().min(0).max(1).describe("0=reserved, 1=expressive"),
  vocabulary: z.enum(["simple", "moderate", "rich"]).describe("lexical complexity"),
  pace: z.enum(["slow", "measured", "brisk"]).describe("conversation tempo"),
});
export type SpeechStyle = z.infer<typeof SpeechStyle>;

// ─── Emotional Baseline ────────────────────────────────────────────────────
export const EmotionalBaseline = z.object({
  primaryMood: z.enum(["warm", "cool", "neutral", "melancholic", "cheerful", "mysterious"]),
  moodStability: z.number().min(0).max(1).describe("0=volatile, 1=very stable"),
  empathyLevel: z.number().min(0).max(1).describe("0=detached, 1=highly empathic"),
  optimism: z.number().min(0).max(1).describe("0=pessimistic, 1=optimistic"),
});
export type EmotionalBaseline = z.infer<typeof EmotionalBaseline>;

// ─── Behavioral Tendencies ─────────────────────────────────────────────────
export const BehavioralTendencies = z.object({
  curiosity: z.number().min(0).max(1),
  cautiousness: z.number().min(0).max(1),
  playfulness: z.number().min(0).max(1),
  assertiveness: z.number().min(0).max(1),
  nurturing: z.number().min(0).max(1),
});
export type BehavioralTendencies = z.infer<typeof BehavioralTendencies>;

// ─── Relationship Attitude Curve ───────────────────────────────────────────
export const RelationshipAttitude = z.object({
  atLowIntimacy: z.string().describe("how character behaves with strangers"),
  atMediumIntimacy: z.string().describe("how character behaves with acquaintances"),
  atHighIntimacy: z.string().describe("how character behaves with close companions"),
  openingSpeed: z.number().min(0).max(1).describe("0=very slow to open up, 1=opens up quickly"),
  trustThreshold: z.number().min(0).max(100).describe("trust level where behavior shifts"),
});
export type RelationshipAttitude = z.infer<typeof RelationshipAttitude>;

// ─── Persona Fingerprint ───────────────────────────────────────────────────
export const PersonaFingerprint = z.object({
  characterId: z.string(),
  characterName: z.string(),
  speechStyle: SpeechStyle,
  emotionalBaseline: EmotionalBaseline,
  behavioralTendencies: BehavioralTendencies,
  relationshipAttitude: RelationshipAttitude,
  corePersona: z.string().describe("one-paragraph immutable identity description"),
  createdAt: z.number(),
  version: z.number().default(1),
});
export type PersonaFingerprint = z.infer<typeof PersonaFingerprint>;

// ─── Persona Builder Input ─────────────────────────────────────────────────
export const PersonaBuilderInput = z.object({
  name: z.string(),
  persona: z.string().describe("raw persona description from character config"),
  tier: z.enum(["basic", "premium", "story"]).default("basic"),
  relationshipAffection: z.number().default(50),
  relationshipTrust: z.number().default(50),
  relationshipIntimacy: z.number().default(50),
});
export type PersonaBuilderInput = z.infer<typeof PersonaBuilderInput>;