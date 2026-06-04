import { describe, it, expect, beforeEach } from "vitest";
import { analytics, AnalyticsEvent } from "../../analytics/events.js";

describe("Analytics", () => {
  beforeEach(() => {
    analytics.reset();
  });

  it("tracks events correctly", () => {
    analytics.track(AnalyticsEvent.FIRST_SESSION_STARTED, "user-1");
    analytics.track(AnalyticsEvent.FIRST_MESSAGE_SENT, "user-1");

    const events = analytics.getUserEvents("user-1");
    expect(events).toHaveLength(2);
    expect(events[0].event).toBe("first_session_started");
    expect(events[1].event).toBe("first_message_sent");
  });

  it("filters events by user", () => {
    analytics.track(AnalyticsEvent.FIRST_SESSION_STARTED, "user-1");
    analytics.track(AnalyticsEvent.FIRST_SESSION_STARTED, "user-2");

    expect(analytics.getUserEvents("user-1")).toHaveLength(1);
    expect(analytics.getUserEvents("user-2")).toHaveLength(1);
  });

  it("exports all events", () => {
    analytics.track(AnalyticsEvent.ONBOARDING_COMPLETED, "user-1");
    expect(analytics.export()).toHaveLength(1);
  });

  it("resets correctly", () => {
    analytics.track(AnalyticsEvent.FIRST_SESSION_STARTED, "user-1");
    analytics.reset();
    expect(analytics.export()).toHaveLength(0);
  });
});
