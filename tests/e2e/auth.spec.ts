import { test, expect } from '@playwright/test';

/**
 * E2E Authentication Tests
 *
 * NOTE: These tests require Firebase emulators or a test Firebase project
 * Configure Firebase test credentials in .env.test
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2').filter({ hasText: 'Ora Admin' })).toBeVisible();

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Sign in with Email/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Sign in with Google/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Browser validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should redirect to admin after successful login', async ({ page }) => {
    // This test requires valid test credentials
    // Skip if not in test environment
    const testEmail = process.env.TEST_ADMIN_EMAIL;
    const testPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!testEmail || !testPassword) {
      test.skip();
      return;
    }

    // Fill in valid credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test('should protect admin routes when not authenticated', async ({ page }) => {
    // Try to access admin route directly
    await page.goto('/admin');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should show role in header after login', async ({ page }) => {
    // This test requires valid test credentials
    const testEmail = process.env.TEST_ADMIN_EMAIL;
    const testPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!testEmail || !testPassword) {
      test.skip();
      return;
    }

    // Login
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/admin/);

    // Should show user role
    await expect(page.locator('text=/admin|teacher|viewer/i')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    const testEmail = process.env.TEST_ADMIN_EMAIL;
    const testPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!testEmail || !testPassword) {
      test.skip();
      return;
    }

    // Login first
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);

    // Click logout button (assuming it exists in header)
    await page.click('button:has-text("Sign Out"), button:has-text("Logout")');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe('Authorization (RBAC)', () => {
  test('viewer should not access admin-only routes', async ({ page }) => {
    const viewerEmail = process.env.TEST_VIEWER_EMAIL;
    const viewerPassword = process.env.TEST_VIEWER_PASSWORD;

    if (!viewerEmail || !viewerPassword) {
      test.skip();
      return;
    }

    // Login as viewer
    await page.goto('/login');
    await page.fill('input[type="email"]', viewerEmail);
    await page.fill('input[type="password"]', viewerPassword);
    await page.click('button[type="submit"]');

    // Try to access admin routes
    await page.goto('/admin/users');

    // Should show unauthorized page or redirect
    const url = page.url();
    expect(url).toMatch(/unauthorized|login|403/);
  });

  test('teacher should access content routes', async ({ page }) => {
    const teacherEmail = process.env.TEST_TEACHER_EMAIL;
    const teacherPassword = process.env.TEST_TEACHER_PASSWORD;

    if (!teacherEmail || !teacherPassword) {
      test.skip();
      return;
    }

    // Login as teacher
    await page.goto('/login');
    await page.fill('input[type="email"]', teacherEmail);
    await page.fill('input[type="password"]', teacherPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);

    // Should be able to access content
    await page.goto('/admin/content');
    await expect(page).toHaveURL(/\/admin\/content/);
  });
});
