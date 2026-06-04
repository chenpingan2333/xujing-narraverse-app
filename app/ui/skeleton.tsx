"use client";

import React from "react";
import { Skeleton, Card } from "antd";

/**
 * ChatSkeleton — placeholder shown during chat loading.
 * Provides a warm, subtle loading indicator that matches the design system.
 */

export function ChatSkeleton() {
  return (
    <div style={{ padding: "20px 24px", maxWidth: 680, margin: "0 auto" }}>
      {/* Character greeting skeleton */}
      <div style={{ textAlign: "center", marginTop: 72 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
          background: "#fdf0e0", animation: "softFadeIn 0.8s ease-in-out infinite alternate",
        }} />
        <div style={{ width: 160, height: 24, margin: "0 auto 12px", background: "#fdf0e0", borderRadius: 6, animation: "softFadeIn 1s ease-in-out infinite alternate" }} />
        <div style={{ width: 240, height: 16, margin: "0 auto", background: "#fdf0e0", borderRadius: 4, animation: "softFadeIn 1.2s ease-in-out infinite alternate" }} />
      </div>

      {/* Message bubbles skeleton */}
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fdf0e0", flexShrink: 0 }} />
          <div style={{ width: "60%", height: 40, background: "#fef5e7", borderRadius: 18, border: "1px solid #f0dcc0" }} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <div style={{ width: "45%", height: 32, background: "#fef0e5", borderRadius: 18, border: "1px solid #f0dcc0" }} />
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fef0e5", flexShrink: 0 }} />
        </div>
      </div>

      {/* Right panel skeleton */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 40, background: "#fdf0e0", borderRadius: 12 }} />
        <div style={{ height: 120, background: "#fdf0e0", borderRadius: 12 }} />
      </div>
    </div>
  );
}

/**
 * CharacterCardSkeleton — skeleton for the character grid.
 */
export function CharacterCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ flex: "1 1 280px", maxWidth: 440 }}>
          <Card style={{ borderRadius: 18, background: "#fdf8f0", border: "1px solid #ead9c0" }}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </Card>
        </div>
      ))}
    </div>
  );
}

/**
 * PageSkeleton — generic page loading placeholder.
 */
export function PageSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 28 }} />
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
}