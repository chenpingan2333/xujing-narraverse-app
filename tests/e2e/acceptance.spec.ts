import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3003';

async function login(page: any) {
  await page.goto(BASE + '/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[placeholder*="邮箱"]').or(page.locator('input[placeholder*="email"]')).fill('zzx2975366562@gmail.com');
  await page.locator('input[placeholder*="密码"]').first().fill('zzx20141220');
  await page.locator('button:has-text("登录")').first().click();
  await page.waitForURL('**/chat', { timeout: 15000 });
}

test.describe('叙境 Narraverse — Mobile Acceptance Tests', () => {

  // ── 1. Root redirects to /login ──
  test('[P0] / redirects to /login', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  // ── 2. Login page renders ──
  test('[P0] Login page loads with email form', async ({ page }) => {
    await page.goto(BASE + '/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=叙境').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder*="邮箱"]').or(page.locator('input[placeholder*="email"]'))).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=GitHub').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=注册').first()).toBeVisible({ timeout: 5000 });
  });

  // ── 3. Login succeeds ──
  test('[P0] Email login succeeds and redirects to /chat', async ({ page }) => {
    await login(page);
    expect(page.url()).toContain('/chat');
  });

  // ── 4. BottomNav shows 4 tabs ──
  test('[P0] BottomNav has 4 tabs: 角色/聊天/商店/我的', async ({ page }) => {
    await login(page);
    // Login already redirects to /chat which has AuthenticatedLayout + BottomNav
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/bottomnav-debug.png', fullPage: true });

    const btnCount = await allButtons.count();

    // Try finding BottomNav by looking for fixed nav
    const nav = page.locator('nav');
    console.log('Nav elements:', navCount);

    // Check 4 nav labels exist anywhere
    await expect(page.locator('button:has-text("角色")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("聊天")').first()).toBeVisible();
    await expect(page.locator('button:has-text("商店")').first()).toBeVisible();
    await expect(page.locator('button:has-text("我的")').first()).toBeVisible();

    // 首页 should NOT exist
    await expect(page.locator('button:has-text("首页")')).toHaveCount(0);
  });

  // ── 5. Marketplace has paid characters ──
  test('[P1] Marketplace shows characters with prices', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/marketplace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator('text=角色商店')).toBeVisible({ timeout: 10000 });
    const priceTexts = page.locator('text=/490|990/');
    const count = await priceTexts.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // ── 6. Settings page renders ──
  test('[P1] Settings page renders with API key section', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/settings', { waitUntil: 'networkidle' });

    // Use heading instead of generic text to avoid strict mode
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=API').first()).toBeVisible({ timeout: 5000 });
  });

  // ── 7. Unauthenticated → redirect ──
  test('[P1] Unauthenticated /characters redirects to /login', async ({ page }) => {
    await page.goto(BASE + '/characters');
    // Wait a moment for redirect, then check URL
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/login');
    expect(url).toContain('redirect=');
  });

  // ── 8. Wallet page loads ──
  test('[P1] Wallet page accessible after login', async ({ page }) => {
    await login(page);
    await page.goto(BASE + '/wallet', { waitUntil: 'networkidle' });
    await expect(page.locator('text=/钱包|余额|星钻/').first()).toBeVisible({ timeout: 10000 });
  });
});
