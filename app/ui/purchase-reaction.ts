"use client";

import { useState, useCallback } from "react";
import { getEmotionFeedback, formatDiamondMessage, type ConsumptionType } from "./emotion-feedback";

/**
 * PurchaseReaction — hooks into the Chat page to provide
 * emotional feedback when star diamonds are consumed.
 *
 * Rather than showing a cold "you spent X diamonds",
 * it triggers a warm message + character reaction + animation.
 */

interface PurchaseReactionState {
  /** Whether feedback is currently visible */
  visible: boolean;
  /** The warm feedback message */
  message: string;
  /** Optional character quote */
  characterReaction?: string;
  /** Type of animation */
  animationType: "warm-pulse" | "gentle-float" | "soft-glow" | "heart-burst";
  /** Accent color for the feedback */
  accentColor: string;
}

export function usePurchaseReaction() {
  const [reaction, setReaction] = useState<PurchaseReactionState>({
    visible: false,
    message: "",
    animationType: "warm-pulse",
    accentColor: "#f0a860",
  });

  /**
   * Trigger a purchase reaction for a diamond consumption event.
   * Automatically hides after 3 seconds.
   */
  const triggerReaction = useCallback(
    (type: ConsumptionType, cost: number, characterName?: string) => {
      const feedback = getEmotionFeedback(type, characterName);
      const diamondMsg = formatDiamondMessage(cost, type);

      setReaction({
        visible: true,
        message: `${feedback.message}\n${diamondMsg}`,
        characterReaction: feedback.characterReaction,
        animationType: feedback.animation,
        accentColor: feedback.accentColor,
      });

      setTimeout(() => {
        setReaction((prev) => ({ ...prev, visible: false }));
      }, 3500);
    },
    [],
  );

  const dismissReaction = useCallback(() => {
    setReaction((prev) => ({ ...prev, visible: false }));
  }, []);

  return { reaction, triggerReaction, dismissReaction };
}