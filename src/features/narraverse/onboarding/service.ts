import type { OnboardingState, OnboardingStep } from "./types.js";
import { createDefaultOnboardingState } from "./types.js";
import { canTransition } from "./flow.js";

/**
 * OnboardingService — manages onboarding state per user.
 *
 * Uses an in-memory Map for MVP. Replace with PostgreSQL-backed
 * implementation for production.
 */
const states = new Map<string, OnboardingState>();

export class OnboardingService {
  /** Get or create onboarding state for a user */
  getOrCreate(userId: string): OnboardingState {
    const existing = states.get(userId);
    if (existing) return existing;

    const state = createDefaultOnboardingState(userId);
    states.set(userId, state);
    return state;
  }

  /** Get current state (returns null if never started) */
  get(userId: string): OnboardingState | null {
    return states.get(userId) ?? null;
  }

  /** Transition to a new step (validates the transition) */
  advanceStep(userId: string, to: OnboardingStep): OnboardingState {
    const state = this.getOrCreate(userId);

    if (!canTransition(state.currentStep, to)) {
      throw new Error(
        `Invalid onboarding transition: ${state.currentStep} → ${to}. ` +
        `Allowed: ${state.currentStep === "complete" ? "none" : "next step only"}`
      );
    }

    const updated: OnboardingState = {
      ...state,
      currentStep: to,
      updatedAt: Date.now(),
      ...(to === "complete" ? { completedAt: Date.now() } : {}),
    };

    states.set(userId, updated);
    return updated;
  }

  /** Record character selection */
  selectCharacter(userId: string, characterId: string): OnboardingState {
    const state = this.getOrCreate(userId);
    const updated: OnboardingState = {
      ...state,
      selectedCharacterId: characterId,
      currentStep: "world_select",
      updatedAt: Date.now(),
    };
    states.set(userId, updated);
    return updated;
  }

  /** Record world selection (can be skipped) */
  selectWorld(userId: string, worldId: string, worldName: string, worldType: string): OnboardingState {
    const state = this.getOrCreate(userId);
    const updated: OnboardingState = {
      ...state,
      selectedWorldId: worldId,
      selectedWorldType: worldType,
      currentStep: "first_chat",
      updatedAt: Date.now(),
    };
    states.set(userId, updated);
    return updated;
  }

  /** Mark first message as sent */
  markFirstMessageSent(userId: string): OnboardingState {
    const state = this.getOrCreate(userId);
    if (state.firstMessageSent) return state; // idempotent

    const updated: OnboardingState = {
      ...state,
      firstMessageSent: true,
      currentStep: state.currentStep === "first_chat" ? "first_chat" : state.currentStep,
      updatedAt: Date.now(),
    };
    states.set(userId, updated);
    return updated;
  }

  /** Mark first relationship as created and claim reward */
  claimFirstReward(userId: string): OnboardingState {
    const state = this.getOrCreate(userId);
    if (state.rewardClaimed) return state; // idempotent — prevent double claim

    const updated: OnboardingState = {
      ...state,
      firstRelationshipCreated: true,
      rewardClaimed: true,
      currentStep: "complete",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    };
    states.set(userId, updated);
    return updated;
  }

  /** Check if user has completed onboarding */
  isOnboarded(userId: string): boolean {
    const state = states.get(userId);
    return state?.currentStep === "complete";
  }

  /** Check if user is eligible for first engagement reward */
  isEligibleForFirstReward(userId: string): boolean {
    const state = states.get(userId);
    if (!state) return true;
    return !state.rewardClaimed && state.firstMessageSent && !state.firstRelationshipCreated;
  }

  /** Reset onboarding (for testing) */
  reset(userId: string): void {
    states.delete(userId);
  }
}

/** Singleton instance */
export const onboardingService = new OnboardingService();