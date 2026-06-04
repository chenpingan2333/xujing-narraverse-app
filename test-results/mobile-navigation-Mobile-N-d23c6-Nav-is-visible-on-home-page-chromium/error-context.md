# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-navigation.spec.ts >> Mobile Navigation UX >> BottomNav is visible on home page
- Location: e2e\mobile-navigation.spec.ts:56:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('nav').first()

```

```yaml
- text: Internal Server Error
```

# Test source

```ts
  1   | ﻿/**
  2   |  * Mobile Navigation E2E Test — Narraverse
  3   |  *
  4   |  * Covers: BottomNav visibility → Character FAB → BackButton → Page scroll
  5   |  */
  6   | import { test, expect, type Page, type BrowserContext } from "@playwright/test";
  7   | 
  8   | const MOCK_USER = {
  9   |   id: "test-user-001",
  10  |   email: "test@example.com",
  11  |   name: "叙境旅人",
  12  |   avatarUrl: null,
  13  |   isVip: false,
  14  |   isBanned: false,
  15  |   isAdmin: false,
  16  |   membershipTier: null,
  17  |   membershipExpireAt: null,
  18  |   uidDisplay: "NAR_000042",
  19  | };
  20  | 
  21  | const MOCK_CHARACTERS = [
  22  |   { id: "char-001", name: "艾琳", persona: "温柔体贴的邻家女孩", tier: "basic", avatar: "🌸" },
  23  | ];
  24  | 
  25  | /** Set auth cookie to bypass middleware redirect */
  26  | async function setAuthCookie(context: BrowserContext) {
  27  |   await context.addCookies([
  28  |     {
  29  |       name: "narra_session",
  30  |       value: "test-session-token-for-e2e",
  31  |       domain: "localhost",
  32  |       path: "/",
  33  |       httpOnly: true,
  34  |       secure: false,
  35  |       sameSite: "Lax",
  36  |     },
  37  |   ]);
  38  | }
  39  | 
  40  | async function mockAuthApi(page: Page) {
  41  |   await page.route("**/api/auth/session/me", async (route) => {
  42  |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: MOCK_USER }) });
  43  |   });
  44  |   await page.route("**/api/characters", async (route) => {
  45  |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHARACTERS) });
  46  |   });
  47  |   await page.route("**/api/wallet", async (route) => {
  48  |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ wallet: { starDiamonds: 100, totalEarned: 200, totalSpent: 100 } }) });
  49  |   });
  50  |   await page.route("**/api/profile/stats", async (route) => {
  51  |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ conversationTurns: 42, characterCount: 3, memoryCount: 156 }) });
  52  |   });
  53  | }
  54  | 
  55  | test.describe("Mobile Navigation UX", () => {
  56  |   test("BottomNav is visible on home page", async ({ browser }) => {
  57  |     const context = await browser.newContext();
  58  |     await setAuthCookie(context);
  59  |     const page = await context.newPage();
  60  |     await mockAuthApi(page);
  61  | 
  62  |     await page.goto("/");
  63  |     await page.waitForLoadState("networkidle");
  64  | 
  65  |     // BottomNav should be rendered
  66  |     const nav = page.locator("nav");
> 67  |     await expect(nav.first()).toBeVisible({ timeout: 10000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  68  | 
  69  |     // All 5 nav items should be present
  70  |     await expect(page.getByLabel("首页")).toBeVisible();
  71  |     await expect(page.getByLabel("角色")).toBeVisible();
  72  |     await expect(page.getByLabel("聊天")).toBeVisible();
  73  |     await expect(page.getByLabel("商店")).toBeVisible();
  74  |     await expect(page.getByLabel("我的")).toBeVisible();
  75  | 
  76  |     await context.close();
  77  |   });
  78  | 
  79  |   test("BottomNav is visible on characters page with FAB", async ({ browser }) => {
  80  |     const context = await browser.newContext();
  81  |     await setAuthCookie(context);
  82  |     const page = await context.newPage();
  83  |     await mockAuthApi(page);
  84  | 
  85  |     await page.goto("/characters");
  86  |     await page.waitForLoadState("networkidle");
  87  | 
  88  |     // BottomNav visible
  89  |     await expect(page.locator("nav").first()).toBeVisible({ timeout: 10000 });
  90  | 
  91  |     // FAB (create character button) visible
  92  |     const fab = page.getByLabel("创建角色");
  93  |     await expect(fab).toBeVisible({ timeout: 10000 });
  94  | 
  95  |     await context.close();
  96  |   });
  97  | 
  98  |   test("BottomNav navigates between pages", async ({ browser }) => {
  99  |     const context = await browser.newContext();
  100 |     await setAuthCookie(context);
  101 |     const page = await context.newPage();
  102 |     await mockAuthApi(page);
  103 | 
  104 |     await page.goto("/");
  105 |     await page.waitForLoadState("networkidle");
  106 | 
  107 |     // Click "角色" in BottomNav
  108 |     await page.getByLabel("角色").click();
  109 |     await page.waitForURL("**/characters");
  110 |     await expect(page.locator("body")).toContainText("你的角色");
  111 | 
  112 |     // Click "我的" in BottomNav
  113 |     await page.getByLabel("我的").click();
  114 |     await page.waitForURL("**/profile");
  115 |     await expect(page.locator("body")).toContainText("我的");
  116 | 
  117 |     await context.close();
  118 |   });
  119 | 
  120 |   test("BackButton is present on profile page", async ({ browser }) => {
  121 |     const context = await browser.newContext();
  122 |     await setAuthCookie(context);
  123 |     const page = await context.newPage();
  124 |     await mockAuthApi(page);
  125 | 
  126 |     await page.goto("/profile");
  127 |     await page.waitForLoadState("networkidle");
  128 | 
  129 |     // Back button should be visible
  130 |     const backBtn = page.getByLabel("返回");
  131 |     await expect(backBtn).toBeVisible({ timeout: 10000 });
  132 | 
  133 |     await context.close();
  134 |   });
  135 | 
  136 |   test("Characters page shows empty state with FAB", async ({ browser }) => {
  137 |     const context = await browser.newContext();
  138 |     await setAuthCookie(context);
  139 |     const page = await context.newPage();
  140 | 
  141 |     await page.route("**/api/auth/session/me", async (route) => {
  142 |       await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: MOCK_USER }) });
  143 |     });
  144 |     // Mock empty characters list
  145 |     await page.route("**/api/characters", async (route) => {
  146 |       await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  147 |     });
  148 | 
  149 |     await page.goto("/characters");
  150 |     await page.waitForLoadState("networkidle");
  151 | 
  152 |     // Empty state message
  153 |     await expect(page.getByText("还没有角色")).toBeVisible({ timeout: 10000 });
  154 | 
  155 |     // Create FAB still visible
  156 |     await expect(page.getByLabel("创建角色")).toBeVisible({ timeout: 10000 });
  157 | 
  158 |     // "创建第一个角色" button in empty state
  159 |     await expect(page.getByText("创建第一个角色")).toBeVisible({ timeout: 10000 });
  160 | 
  161 |     await context.close();
  162 |   });
  163 | });
  164 | 
```