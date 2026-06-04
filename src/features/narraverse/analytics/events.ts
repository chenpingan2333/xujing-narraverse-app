/** Analytics event names for onboarding */
export const AnalyticsEvent = {
  FIRST_SESSION_STARTED: "first_session_started",
  FIRST_MESSAGE_SENT: "first_message_sent",
  FIRST_RELATIONSHIP_CREATED: "first_relationship_created",
  ONBOARDING_STEP_ADVANCED: "onboarding_step_advanced",
  ONBOARDING_COMPLETED: "onboarding_completed",
  FIRST_REWARD_CLAIMED: "first_reward_claimed",
} as const;

export type AnalyticsEventName = typeof AnalyticsEvent[keyof typeof AnalyticsEvent];

/** Structured analytics payload */
export interface AnalyticsPayload {
  event: AnalyticsEventName;
  userId: string;
  timestamp: number;
  properties?: Record<string, unknown>;
}

/** Analytics collector — in-memory for MVP */
class AnalyticsCollector {
  private events: AnalyticsPayload[] = [];

  /** Record an event */
  track(event: AnalyticsEventName, userId: string, properties?: Record<string, unknown>): void {
    const payload: AnalyticsPayload = {
      event,
      userId,
      timestamp: Date.now(),
      properties,
    };
    this.events.push(payload);

    // In production, send to analytics service (PostHog, Mixpanel, etc.)
    if (process.env["NODE_ENV"] === "production") {
      // TODO: flush to analytics provider
    }
  }

  /** Get all events for a user */
  getUserEvents(userId: string): AnalyticsPayload[] {
    return this.events.filter((e) => e.userId === userId);
  }

  /** Get event count by name */
  getCount(eventName: AnalyticsEventName): number {
    return this.events.filter((e) => e.event === eventName).length;
  }

  /** Clear all events (for testing) */
  reset(): void {
    this.events = [];
  }

  /** Export all events (for debugging) */
  export(): AnalyticsPayload[] {
    return [...this.events];
  }
}

/** Singleton analytics collector */
export const analytics = new AnalyticsCollector();
