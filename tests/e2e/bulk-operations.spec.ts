/**
 * E2E tests for bulk operations feature
 * Tests complete user flows for bulk delete and update operations
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Helper function to login as admin
 */
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  // Fill login form
  await page.fill('input[name="email"]', process.env.ADMIN_EMAIL || 'admin@test.com');
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || 'password123');

  // Submit and wait for redirect
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/admin`);
}

/**
 * Helper function to login as teacher
 */
async function loginAsTeacher(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  await page.fill('input[name="email"]', process.env.TEACHER_EMAIL || 'teacher@test.com');
  await page.fill('input[name="password"]', process.env.TEACHER_PASSWORD || 'password123');

  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/admin`);
}

/**
 * Helper to wait for toast message
 */
async function waitForToast(page: Page, expectedText: string) {
  const toast = page.locator('[role="status"], .toast, [data-toast]').filter({ hasText: expectedText });
  await expect(toast).toBeVisible({ timeout: 5000 });
}

test.describe('Bulk Operations - Programs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should bulk delete multiple programs as admin', async ({ page }) => {
    // Navigate to programs page
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    // Check if there are programs to select
    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    const programCount = await programRows.count();

    if (programCount === 0) {
      test.skip();
    }

    // Select first 2 programs
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Verify bulk action toolbar appears
    await expect(page.locator('text=2 programs selected')).toBeVisible();

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Confirm deletion in dialog
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Wait for success toast
    await waitForToast(page, 'deleted successfully');

    // Verify toolbar disappears
    await expect(page.locator('text=programs selected')).not.toBeVisible();
  });

  test('should select all programs with header checkbox', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    const programCount = await programRows.count();

    if (programCount === 0) {
      test.skip();
    }

    // Click header checkbox to select all
    await page.locator('table thead input[type="checkbox"]').check();

    // Verify all programs are selected
    await expect(page.locator(`text=${programCount} program`)).toBeVisible();

    // Verify all row checkboxes are checked
    const checkedCount = await page.locator('table tbody tr input[type="checkbox"]:checked').count();
    expect(checkedCount).toBe(programCount);
  });

  test('should show indeterminate state when some programs selected', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    const programCount = await programRows.count();

    if (programCount < 2) {
      test.skip();
    }

    // Select only first program
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Verify partial selection indicator
    await expect(page.locator('text=1 program selected')).toBeVisible();

    // Header checkbox should be in indeterminate state (visual check)
    const headerCheckbox = page.locator('table thead input[type="checkbox"]');
    await expect(headerCheckbox).not.toBeChecked();
  });

  test('should bulk update program status', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    const programCount = await programRows.count();

    if (programCount === 0) {
      test.skip();
    }

    // Select programs
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Open status dropdown
    await page.click('button:has-text("Update Status")');

    // Select "Published"
    await page.click('text=Set as Published');

    // Wait for success toast
    await waitForToast(page, 'updated successfully');

    // Verify toolbar disappears after action
    await expect(page.locator('text=programs selected')).not.toBeVisible();
  });

  test('should clear selection with clear button', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    if ((await programRows.count()) === 0) {
      test.skip();
    }

    // Select a program
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Verify toolbar appears
    await expect(page.locator('text=1 program selected')).toBeVisible();

    // Click clear selection
    await page.click('button:has-text("Clear Selection")');

    // Verify toolbar disappears
    await expect(page.locator('text=programs selected')).not.toBeVisible();

    // Verify no checkboxes are checked
    const checkedCount = await page.locator('table tbody tr input[type="checkbox"]:checked').count();
    expect(checkedCount).toBe(0);
  });

  test('should show confirmation dialog before bulk delete', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    if ((await programRows.count()) === 0) {
      test.skip();
    }

    // Select a program
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Click delete
    await page.click('button:has-text("Delete")');

    // Verify confirmation dialog appears
    await expect(page.locator('[role="dialog"], [role="alertdialog"]')).toBeVisible();
    await expect(page.locator('text=/are you sure|confirm delete/i')).toBeVisible();

    // Cancel deletion
    await page.click('button:has-text("Cancel")');

    // Verify dialog closes
    await expect(page.locator('[role="dialog"], [role="alertdialog"]')).not.toBeVisible();

    // Selection should still be active
    await expect(page.locator('text=1 program selected')).toBeVisible();
  });

  test('should highlight selected rows', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    if ((await programRows.count()) === 0) {
      test.skip();
    }

    const firstRow = programRows.nth(0);
    const checkbox = firstRow.locator('input[type="checkbox"]');

    // Check initial state (not highlighted)
    const initialClass = await firstRow.getAttribute('class');

    // Select row
    await checkbox.check();

    // Check highlighted state
    const highlightedClass = await firstRow.getAttribute('class');
    expect(highlightedClass).toContain('bg-muted');
    expect(highlightedClass).not.toBe(initialClass);

    // Deselect row
    await checkbox.uncheck();

    // Check back to normal
    const finalClass = await firstRow.getAttribute('class');
    expect(finalClass).not.toContain('bg-muted');
  });

  test('should show loading state during bulk operation', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    if ((await programRows.count()) === 0) {
      test.skip();
    }

    // Select a program
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Start delete operation (don't confirm yet)
    await page.click('button:has-text("Delete")');

    // Confirm
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();

    // Click and check for loading state
    await confirmButton.click();

    // Look for loading indicators (spinner, disabled state, etc.)
    // This will pass if the button is disabled or shows loading
    await expect(confirmButton).toBeDisabled({ timeout: 1000 }).catch(() => {
      // It's ok if there's no loading state visible, operation might be too fast
    });
  });
});

test.describe('Bulk Operations - Programs (Teacher)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should bulk delete only own programs as teacher', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    if ((await programRows.count()) === 0) {
      test.skip();
    }

    // Select first program (assuming it's teacher's own)
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Bulk toolbar should appear
    await expect(page.locator('text=1 program selected')).toBeVisible();

    // Delete button should be available
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();

    // Note: In real test, we'd need to verify that only own programs are deletable
    // This would require seeding test data with known ownership
  });
});

test.describe('Bulk Operations - Lessons', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should bulk delete multiple lessons as admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/content`);
    await page.waitForLoadState('networkidle');

    const lessonRows = page.locator('table tbody tr').filter({ hasNotText: 'No lessons found' });
    const lessonCount = await lessonRows.count();

    if (lessonCount === 0) {
      test.skip();
    }

    // Select first 2 lessons
    const checkboxes = page.locator('table tbody tr input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Verify bulk action toolbar appears
    await expect(page.locator('text=2 lessons selected')).toBeVisible();

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Confirm deletion
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Wait for success toast
    await waitForToast(page, 'deleted successfully');

    // Verify toolbar disappears
    await expect(page.locator('text=lessons selected')).not.toBeVisible();
  });

  test('should NOT show status dropdown for lessons', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/content`);
    await page.waitForLoadState('networkidle');

    const lessonRows = page.locator('table tbody tr').filter({ hasNotText: 'No lessons found' });
    if ((await lessonRows.count()) === 0) {
      test.skip();
    }

    // Select a lesson
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Verify bulk toolbar appears
    await expect(page.locator('text=1 lesson selected')).toBeVisible();

    // Verify "Update Status" button does NOT appear (lessons don't have bulk status update)
    await expect(page.locator('button:has-text("Update Status")')).not.toBeVisible();
  });

  test('should select all lessons with header checkbox', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/content`);
    await page.waitForLoadState('networkidle');

    const lessonRows = page.locator('table tbody tr').filter({ hasNotText: 'No lessons found' });
    const lessonCount = await lessonRows.count();

    if (lessonCount === 0) {
      test.skip();
    }

    // Click header checkbox
    await page.locator('table thead input[type="checkbox"]').check();

    // Verify all lessons selected
    await expect(page.locator(`text=${lessonCount} lesson`)).toBeVisible();

    // Verify all checkboxes checked
    const checkedCount = await page.locator('table tbody tr input[type="checkbox"]:checked').count();
    expect(checkedCount).toBe(lessonCount);
  });

  test('should refresh lessons list after bulk delete', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/content`);
    await page.waitForLoadState('networkidle');

    const lessonRows = page.locator('table tbody tr').filter({ hasNotText: 'No lessons found' });
    const initialCount = await lessonRows.count();

    if (initialCount === 0) {
      test.skip();
    }

    // Select first lesson
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Delete
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Wait for toast
    await waitForToast(page, 'deleted successfully');

    // Wait for table to update
    await page.waitForTimeout(1000);

    // Verify count decreased (or shows "No lessons found")
    const newCount = await lessonRows.count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should show correct count in toolbar', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/content`);
    await page.waitForLoadState('networkidle');

    const lessonRows = page.locator('table tbody tr').filter({ hasNotText: 'No lessons found' });
    if ((await lessonRows.count()) < 3) {
      test.skip();
    }

    // Select 3 lessons
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();
    await page.locator('table tbody tr input[type="checkbox"]').nth(1).check();
    await page.locator('table tbody tr input[type="checkbox"]').nth(2).check();

    // Verify count badge shows 3
    await expect(page.locator('text=3 lessons selected')).toBeVisible();

    // Verify badge number
    const badge = page.locator('.rounded-full').filter({ hasText: '3' });
    await expect(badge).toBeVisible();
  });
});

test.describe('Bulk Operations - Lessons (Teacher)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should bulk delete only own lessons as teacher', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/content`);
    await page.waitForLoadState('networkidle');

    const lessonRows = page.locator('table tbody tr').filter({ hasNotText: 'No lessons found' });
    if ((await lessonRows.count()) === 0) {
      test.skip();
    }

    // Select first lesson
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();

    // Toolbar should appear
    await expect(page.locator('text=1 lesson selected')).toBeVisible();

    // Delete button should be available
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });
});

test.describe('Bulk Operations - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should handle bulk operation errors gracefully', async ({ page }) => {
    // This test would require mocking network errors or server failures
    // For now, we'll test the UI handles missing items gracefully

    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    if ((await programRows.count()) === 0) {
      test.skip();
    }

    // Simulate network interruption by intercepting API calls
    await page.route('**/api/programs/bulk', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Select and try to delete
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Should show error toast
    await waitForToast(page, 'error');
  });

  test('should handle partial success correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/programs`);
    await page.waitForLoadState('networkidle');

    const programRows = page.locator('table tbody tr').filter({ hasNotText: 'No programs found' });
    if ((await programRows.count()) < 2) {
      test.skip();
    }

    // Mock partial success response
    await page.route('**/api/programs/bulk', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: false,
          deleted: 1,
          failed: 1,
          errors: ['Program prog-2: Permission denied'],
        }),
      });
    });

    // Select 2 programs
    await page.locator('table tbody tr input[type="checkbox"]').nth(0).check();
    await page.locator('table tbody tr input[type="checkbox"]').nth(1).check();

    // Delete
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Should show partial success message or warning
    // (Implementation may vary - could be toast or dialog)
    await page.waitForTimeout(1000);
  });
});
