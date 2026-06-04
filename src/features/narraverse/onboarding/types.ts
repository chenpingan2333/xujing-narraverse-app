import { z } from "zod";

/** Onboarding flow steps */
export type OnboardingStep =
  | "welcome"
  | "character_select"
  | "world_select"
  | "first_chat"
  | "complete";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "character_select",
  "world_select",
  "first_chat",
  "complete",
];

/** Persisted onboarding state per user */
export interface OnboardingState {
  userId: string;
  currentStep: OnboardingStep;
  selectedCharacterId: string | null;
  selectedWorldId: string | null;
  selectedWorldType: string | null;
  isFirstTime: boolean;
  firstMessageSent: boolean;
  firstRelationshipCreated: boolean;
  rewardClaimed: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/** Default values for a new user */
export function createDefaultOnboardingState(userId: string): OnboardingState {
  const now = Date.now();
  return {
    userId,
    currentStep: "welcome",
    selectedCharacterId: null,
    selectedWorldId: null,
    selectedWorldType: null,
    isFirstTime: true,
    firstMessageSent: false,
    firstRelationshipCreated: false,
    rewardClaimed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** First engagement reward constants */
export const FIRST_MESSAGE_REWARD = {
  affection: 8,
  trust: 6,
  intimacy: 6,
  reason: "初次相遇，她记住了你的名字。你们的故事，从这一句话开始。",
} as const;

/** Onboarding API request schemas */
export const UpdateOnboardingStepRequest = z.object({
  step: z.enum(["welcome", "character_select", "world_select", "first_chat", "complete"]),
});

export const SelectCharacterRequest = z.object({
  characterId: z.string().min(1),
});

export const SelectWorldRequest = z.object({
  worldId: z.string().min(1).optional(),
  worldName: z.string().optional(),
  worldType: z.string().optional(),
});

export type UpdateOnboardingStepInput = z.infer<typeof UpdateOnboardingStepRequest>;
export type SelectCharacterInput = z.infer<typeof SelectCharacterRequest>;
export type SelectWorldInput = z.infer<typeof SelectWorldRequest>;