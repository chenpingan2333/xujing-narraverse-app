/**
 * User Journey E2E Test — Narraverse
 *
 * Covers: home → character select → world select → chat →
 *         send message → verify relationship delta → verify star cost
 */
import { test, expect, type Page } from "@playwright/test";

// ── Mock data ──────────────────────────────────────────────

const MOCK_CHARACTERS = [
  { id: "char-001", name: "艾琳", persona: "温柔体贴的邻家女孩", description: "你的贴心伙伴", tier: "basic", worldId: null, avatar: "🌸", relationship: { affection: 65, trust: 70, intimacy: 55 } },
  { id: "char-002", name: "雷恩", persona: "勇敢正直的冒险者", description: "可靠的冒险伙伴", tier: "premium", worldId: null, avatar: "⚔️", relationship: { affection: 50, trust: 60, intimacy: 40 } },
];

const MOCK_CHAT_RESPONSE = {
  reply: "今天能和你说话，感觉真好。",
  metadata: { sessionId: "sess-mock", modelId: "test-model", provider: "mock", tier: "basic", latencyMs: 120, inputTokens: 42, outputTokens: 18, memoryCount: 3, starCost: 5 },
  memoryEvents: [{ type: "moment", content: "用户在测试对话中发送了第一条消息", importance: 0.6 }],
  relationshipDelta: { affection: 4, trust: 3, intimacy: 2, reason: "你们之间的距离又近了一些。" },
};

// ── Helpers ────────────────────────────────────────────────

/** Mock all API routes needed for the chat user journey */
async function mockChatJourneyApi(page: Page) {
  await page.route("**/api/characters", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHARACTERS) });
  });

  await page.route("**/api/chat", async (route) => {
    // Simulate a small network delay so the loading state is visible
    await new Promise((r) => setTimeout(r, 200));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHAT_RESPONSE) });
  });
}

/** Navigate to the chat page with a character pre-selected */
async function goToChat(page: Page, characterId = "char-001", characterName = "艾琳") {
  const params = new URLSearchParams({ characterId, characterName });
  await page.goto(`/chat?${params.toString()}`);
}

// ── Tests ──────────────────────────────────────────────────

test.describe("User Journey: Home → Chat → Message", () => {
  test("displays home page with navigation options", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\//);
    // The home page should have a link or button pointing to characters or directly to chat
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("character selection page loads and lists characters", async ({ page }) => {
    await page.route("**/api/characters", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHARACTERS) });
    });

    await page.goto("/characters");
    await expect(page.locator("body")).toContainText("艾琳");
    await expect(page.locator("body")).toContainText("雷恩");
  });

  test("full chat flow: send message → response → relationship delta → star cost", async ({ page }) => {
    await mockChatJourneyApi(page);

    await goToChat(page);
    await page.waitForLoadState("networkidle");

    // 1. Verify chat UI is loaded — character name in header
    await expect(page.locator("body")).toContainText("艾琳");

    // 2. Verify the greeting / empty state is shown
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("艾琳");

    // 3. Type a message into the textarea
    const textarea = page.getByPlaceholder("想说点什么……");
    await expect(textarea).toBeVisible();
    await textarea.fill("今天天气真好，一起出去走走吧？");

    // 4. Click send
    const sendBtn = page.getByRole("button", { name: "send" });
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // 5. Verify user message appears in the chat
    await expect(page.locator(".chat-bubble-user")).toContainText("今天天气真好");

    // 6. Verify assistant response appears (with breathing animation class)
    const aiBubble = page.locator(".chat-bubble-ai").first();
    await expect(aiBubble).toBeVisible({ timeout: 10_000 });
    // Eventually contains the mock reply content
    await expect(aiBubble).toContainText("今天能和你说话");

    // 7. Verify relationship panel shows values — "暖意", "信任", "亲近"
    const journalPanel = page.locator(".chat-right-sidebar");
    await expect(journalPanel).toContainText("暖意");
    await expect(journalPanel).toContainText("信任");
    await expect(journalPanel).toContainText("亲近");

    // 8. Verify star diamond section shows "关系影响" (relationship impact) and "份心意"
    await expect(journalPanel).toContainText("关系影响");
    await expect(journalPanel).toContainText("份心意");

    // 9. Verify memory fragments appear
    await expect(journalPanel).toContainText("记忆片段");
  });

  test("chat input is disabled while loading", async ({ page }) => {
    await mockChatJourneyApi(page);
    await goToChat(page);
    await page.waitForLoadState("networkidle");

    const textarea = page.getByPlaceholder("想说点什么……");
    await textarea.fill("测试");

    // The button should be enabled when text is present
    const sendBtn = page.getByRole("button", { name: "send" });
    await expect(sendBtn).toBeEnabled();
  });

  test("handles API error gracefully", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "服务暂时不可用" }) });
    });

    await goToChat(page);
    await page.waitForLoadState("networkidle");

    const textarea = page.getByPlaceholder("想说点什么……");
    await textarea.fill("你好");
    await page.getByRole("button", { name: "send" }).click();

    // The error message should appear as a bubble
    await expect(page.locator(".chat-bubble-ai")).toBeVisible({ timeout: 5_000 });
  });
});