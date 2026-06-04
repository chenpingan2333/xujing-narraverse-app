import type { OnboardingStep } from "./types.js";

/** Valid transitions for each step */
const TRANSITIONS: Record<OnboardingStep, OnboardingStep[]> = {
  welcome: ["character_select"],
  character_select: ["world_select", "first_chat"], // world is skippable
  world_select: ["first_chat"],
  first_chat: ["complete"],
  complete: [], // terminal state
};

/** Check if a transition from currentStep to nextStep is valid */
export function canTransition(from: OnboardingStep, to: OnboardingStep): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Get the recommended next step (first in the allowed list) */
export function getNextStep(from: OnboardingStep): OnboardingStep | null {
  const allowed = TRANSITIONS[from];
  return allowed?.[0] ?? null;
}

/** Check if the step is before first_chat (pre-chat onboarding) */
export function isPreChatStep(step: OnboardingStep): boolean {
  return step === "welcome" || step === "character_select" || step === "world_select";
}

/** Check if onboarding is complete */
export function isComplete(step: OnboardingStep): boolean {
  return step === "complete";
}

/** All allowed transitions as a readable map */
export function getTransitionMap(): Record<string, string[]> {
  return TRANSITIONS;
}