"use client";

import { useState, useCallback } from "react";
import type { RelationshipUIModel } from "./ui-model";
import { buildRelationshipUIModel } from "./ui-model";

/**
 * useRelationship — manages the living relationship state
 * in the Chat page. Tracks the three dimensions and provides
 * update functions that smooth transitions.
 */

interface RelationshipState {
  affection: number;
  trust: number;
  intimacy: number;
  previousTemp?: number;
  reason?: string;
}

export function useRelationship(initialAffection = 50, initialTrust = 50, initialIntimacy = 50) {
  const [state, setState] = useState<RelationshipState>({
    affection: initialAffection,
    trust: initialTrust,
    intimacy: initialIntimacy,
  });

  const model = buildRelationshipUIModel(
    state.affection, state.trust, state.intimacy, state.previousTemp,
  );

  /**
   * Apply a relationship delta from a chat response.
   * Stores previous temperature for trend detection.
   */
  const applyDelta = useCallback((delta: {
    affection: number;
    trust: number;
    intimacy: number;
    reason?: string;
  }) => {
    setState((prev) => {
      const prevTemp = Math.round((prev.affection + prev.trust + prev.intimacy) / 3);
      return {
        affection: Math.min(100, Math.max(0, prev.affection + delta.affection)),
        trust: Math.min(100, Math.max(0, prev.trust + delta.trust)),
        intimacy: Math.min(100, Math.max(0, prev.intimacy + delta.intimacy)),
        previousTemp: prevTemp,
        reason: delta.reason,
      };
    });
  }, []);

  return {
    affection: state.affection,
    trust: state.trust,
    intimacy: state.intimacy,
    model,
    reason: state.reason,
    applyDelta,
  } as const;
}