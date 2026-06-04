/**
 * Mobile Navigation E2E Test — Narraverse
 *
 * Covers: BottomNav visibility → Character FAB → BackButton → Page scroll
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const MOCK_USER = {
  id: "test-user-001",
  email: "test@example.com",
  name: "叙境旅人",
  avatarUrl: null,
  isVip: false,
  isBanned: false,
  isAdmin: false,
  membershipTier: null,
  membershipExpireAt: null,
  uidDisplay: "NAR_000042",
};

const MOCK_CHARACTERS = [
  { id: "char-001", name: "艾琳", persona: "温柔体贴的邻家女孩", tier: "basic", avatar: "🌸" },
];

/** Set auth cookie to bypass middleware redirect */
async function setAuthCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "narra_session",
      value: "test-session-token-for-e2e",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function mockAuthApi(page: Page) {
  await page.route("**/api/auth/session/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: MOCK_USER }) });
  });
  await page.route("**/api/characters", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHARACTERS) });
  });
  await page.route("**/api/wallet", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ wallet: { starDiamonds: 100, totalEarned: 200, totalSpent: 100 } }) });
  });
  await page.route("**/api/profile/stats", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ conversationTurns: 42, characterCount: 3, memoryCount: 156 }) });
  });
}

test.describe("Mobile Navigation UX", () => {
  test("BottomNav is visible on home page", async ({ browser }) => {
    const context = await browser.newContext();
    await setAuthCookie(context);
    const page = await context.newPage();
    await mockAuthApi(page);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // BottomNav should be rendered
    const nav = page.locator("nav");
    await expect(nav.first()).toBeVisible({ timeout: 10000 });

    // All 5 nav items should be present
    await expect(page.getByLabel("首页")).toBeVisible();
    await expect(page.getByLabel("角色")).toBeVisible();
    await expect(page.getByLabel("聊天")).toBeVisible();
    await expect(page.getByLabel("商店")).toBeVisible();
    await expect(page.getByLabel("我的")).toBeVisible();

    await context.close();
  });

  test("BottomNav is visible on characters page with FAB", async ({ browser }) => {
    const context = await browser.newContext();
    await setAuthCookie(context);
    const page = await context.newPage();
    await mockAuthApi(page);

    await page.goto("/characters");
    await page.waitForLoadState("networkidle");

    // BottomNav visible
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10000 });

    // FAB (create character button) visible
    const fab = page.getByLabel("创建角色");
    await expect(fab).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test("BottomNav navigates between pages", async ({ browser }) => {
    const context = await browser.newContext();
    await setAuthCookie(context);
    const page = await context.newPage();
    await mockAuthApi(page);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click "角色" in BottomNav
    await page.getByLabel("角色").click();
    await page.waitForURL("**/characters");
    await expect(page.locator("body")).toContainText("你的角色");

    // Click "我的" in BottomNav
    await page.getByLabel("我的").click();
    await page.waitForURL("**/profile");
    await expect(page.locator("body")).toContainText("我的");

    await context.close();
  });

  test("BackButton is present on profile page", async ({ browser }) => {
    const context = await browser.newContext();
    await setAuthCookie(context);
    const page = await context.newPage();
    await mockAuthApi(page);

    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // Back button should be visible
    const backBtn = page.getByLabel("返回");
    await expect(backBtn).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test("Characters page shows empty state with FAB", async ({ browser }) => {
    const context = await browser.newContext();
    await setAuthCookie(context);
    const page = await context.newPage();

    await page.route("**/api/auth/session/me", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: MOCK_USER }) });
    });
    // Mock empty characters list
    await page.route("**/api/characters", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.goto("/characters");
    await page.waitForLoadState("networkidle");

    // Empty state message
    await expect(page.getByText("还没有角色")).toBeVisible({ timeout: 10000 });

    // Create FAB still visible
    await expect(page.getByLabel("创建角色")).toBeVisible({ timeout: 10000 });

    // "创建第一个角色" button in empty state
    await expect(page.getByText("创建第一个角色")).toBeVisible({ timeout: 10000 });

    await context.close();
  });
});
