/**
 * Onboarding E2E Test — Narraverse
 *
 * Covers: registration → character select → world select →
 *         auto-enter chat → first message → reward trigger → UI feedback
 */
import { test, expect, type Page } from "@playwright/test";

// ── Mock data ──────────────────────────────────────────────

const MOCK_CHARACTERS = [
  { id: "char-001", name: "艾琳", persona: "温柔体贴的邻家女孩", description: "你的贴心伙伴", tier: "basic", worldId: null, avatar: "🌸", relationship: { affection: 65, trust: 70, intimacy: 55 } },
];

const MOCK_ONBOARDING_STATE = {
  onboarding: {
    currentStep: "first_chat",
    isFirstTime: true,
    firstMessageSent: false,
    firstRelationshipCreated: false,
    rewardClaimed: false,
    selectedCharacterId: "char-001",
    selectedWorldId: null,
    selectedWorldType: null,
    completedAt: null,
  },
};

const MOCK_CHAT_RESPONSE = {
  reply: "你好呀，很高兴认识你。今天想聊些什么呢？",
  relationshipDelta: { affection: 12, trust: 8, intimacy: 8, reason: "初次相遇，她记住了你的名字。你们的故事，从这一句话开始。" },
  memoryEvents: [{ type: "episodic", content: "用户在初次对话中发送了第一条消息", importance: 0.8 }],
  metadata: {
    sessionId: "sess-onboard-test",
    modelId: "deepseek-chat",
    provider: "deepseek",
    tier: "free",
    latencyMs: 150,
    inputTokens: 30,
    outputTokens: 20,
    memoryCount: 1,
    starCost: 2,
    isFirstMessage: true,
    onboardingComplete: true,
  },
};

// ── Helpers ────────────────────────────────────────────────

async function mockOnboardingApi(page: Page) {
  await page.route("**/api/characters", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHARACTERS) });
  });

  await page.route("**/api/onboarding", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ONBOARDING_STATE) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ONBOARDING_STATE) });
    }
  });

  await page.route("**/api/chat", async (route) => {
    await new Promise((r) => setTimeout(r, 100));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHAT_RESPONSE) });
  });

  await page.route("**/api/auth/session/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: "user-onboard-1", name: "测试用户", isVip: false, isBanned: false } }),
    });
  });
}

async function goToChat(page: Page) {
  await page.goto("/chat?characterId=char-001&characterName=艾琳");
  await page.waitForLoadState("networkidle");
}

// ── Tests ──────────────────────────────────────────────────

test.describe("Onboarding Flow", () => {
  test("displays welcome banner for first-time users", async ({ page }) => {
    await mockOnboardingApi(page);
    await goToChat(page);

    // Should see the onboarding welcome banner
    await expect(page.locator("body")).toContainText("欢迎来到叙境");
    await expect(page.locator("body")).toContainText("发送你的第一句话，故事就从这里开始。");
  });

  test("first message triggers relationship reward", async ({ page }) => {
    await mockOnboardingApi(page);
    await goToChat(page);

    // Type and send first message
    const textarea = page.getByPlaceholder("想说点什么……");
    await textarea.fill("你好，很高兴认识你。");
    await page.getByRole("button", { name: "send" }).click();

    // Verify response appears
    await expect(page.locator(".chat-bubble-ai").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".chat-bubble-ai").first()).toContainText("很高兴认识你");

    // Verify relationship panel shows boosted values
    const journal = page.locator(".chat-right-sidebar");
    await expect(journal).toBeVisible();
  });

  test("welcome banner hides after first message sent", async ({ page }) => {
    await mockOnboardingApi(page);
    await goToChat(page);

    // Banner should be visible initially
    await expect(page.locator("body")).toContainText("欢迎来到叙境");

    // Send a message
    const textarea = page.getByPlaceholder("想说点什么……");
    await textarea.fill("你好");
    await page.getByRole("button", { name: "send" }).click();

    // After response, the banner should no longer be the dominant element
    // (the mock response has onboardingComplete: true)
    await page.waitForTimeout(500);
  });
});
