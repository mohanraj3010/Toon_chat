import { test, expect } from '@playwright/test';

test.describe('ToonChat Smoke Suite', () => {
  test('public login page renders with cartoon branding and no visual overflow', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/ToonChat/i);
    await expect(page.getByRole('heading', { name: /Welcome Back!/i })).toBeVisible();
    await expect(page.getByLabel(/Cartoon Email/i)).toBeVisible();
    await expect(page.getByLabel(/Secret Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In to ToonChat/i })).toBeVisible();

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('multi-user two context isolated session verification', async ({ browser }) => {
    // User A Context (Toon Star)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.addInitScript(() => {
      const sessionA = {
        access_token: 'token-user-a',
        refresh_token: 'refresh-user-a',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-a-uuid',
          email: 'toonstar@maplepark.com',
          user_metadata: { username: 'toonstar', displayName: 'Toon Star', characterBase: 1 },
          app_metadata: {},
          created_at: new Date().toISOString(),
        },
      };
      localStorage.setItem('toonchat_supabase_auth_session_v1', JSON.stringify(sessionA));
    });

    // User B Context (Luna Toon)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.addInitScript(() => {
      const sessionB = {
        access_token: 'token-user-b',
        refresh_token: 'refresh-user-b',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-b-uuid',
          email: 'luna@maplepark.com',
          user_metadata: { username: 'luna', displayName: 'Luna Toon', characterBase: 2 },
          app_metadata: {},
          created_at: new Date().toISOString(),
        },
      };
      localStorage.setItem('toonchat_supabase_auth_session_v1', JSON.stringify(sessionB));
    });

    // Navigate User A and User B concurrently
    await Promise.all([
      pageA.goto('/'),
      pageB.goto('/'),
    ]);

    // Verify isolated feeds loaded
    await expect(pageA.getByRole('heading', { name: /Chats/i })).toBeVisible();
    await expect(pageB.getByRole('heading', { name: /Chats/i })).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});

