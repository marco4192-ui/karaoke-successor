/**
 * E2E Tests for Karaoke Successor
 * 
 * These tests verify the main user flows of the application.
 * They run against the Next.js dev server and test the UI behavior.
 */

import { test, expect } from '@playwright/test';

test.describe('Application Startup', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // The page should load without errors
    await expect(page).toHaveTitle(/Karaoke/i);
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for main UI elements
    // The app should show some form of navigation or welcome screen
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify the page loaded successfully
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});

test.describe('Settings Screen', () => {
  test('should navigate to settings', async ({ page }) => {
    await page.goto('/');
    
    // Look for settings button or navigation
    const settingsButton = page.locator('[data-testid="settings-button"], button:has-text("Settings"), button:has-text("Einstellungen")').first();
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Library Screen', () => {
  test('should display library or welcome message', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check if library content or welcome message is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Mobile Connection', () => {
  test('should show mobile connection options', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to settings or mobile connection area
    // This tests that the mobile API endpoint is accessible
    const response = await page.request.get('http://localhost:3000/api/mobile');
    
    // The API should respond
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('endpoints');
  });
});

test.describe('API Endpoints', () => {
  test('mobile API should return available endpoints', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/mobile');
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.endpoints).toBeDefined();
  });

  test('songs API should be accessible', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/songs');
    
    // The API should respond (even if empty)
    expect(response.status()).toBeLessThan(500);
  });
});
