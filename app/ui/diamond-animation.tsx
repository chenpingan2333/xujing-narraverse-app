"use client";

import { useEffect, useState } from "react";

/**
 * Diamond animation triggers a warm visual pulse when
 * star diamonds are consumed or earned. Designed to feel
 * like a "heartbeat" rather than a transaction notification.
 */

type AnimationType = "warm-pulse" | "gentle-float" | "soft-glow" | "heart-burst";

interface DiamondAnimationProps {
  /** The animation type to trigger */
  type: AnimationType;
  /** Whether to show the animation */
  active: boolean;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Children to wrap */
  children: React.ReactNode;
}

const ANIMATION_STYLES: Record<AnimationType, React.CSSProperties> = {
  "warm-pulse": {
    animation: "warmGlowPulse 0.8s ease-in-out",
    transform: "scale(1.05)",
  },
  "gentle-float": {
    animation: "gentleFloat 1.5s ease-in-out",
  },
  "soft-glow": {
    animation: "warmGlowPulse 1.2s ease-in-out",
    filter: "brightness(1.1)",
  },
  "heart-burst": {
    animation: "gentleFloat 0.6s ease-out, warmGlowPulse 1s ease-in-out",
    transform: "scale(1.08)",
  },
};

export default function DiamondAnimation({ type, active, onComplete, children }: DiamondAnimationProps) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (active) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  return (
    <span
      style={{
        display: "inline-flex",
        transition: "all 0.3s ease",
        ...(animating ? ANIMATION_STYLES[type] : {}),
      }}
    >
      {children}
    </span>
  );
}