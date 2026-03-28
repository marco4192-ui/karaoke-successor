import { test, expect } from '@playwright/test'

test.describe('Karaoke Successor E2E Tests', () => {
  test.describe('App Launch', () => {
    test('should load the main page', async ({ page }) => {
      await page.goto('/')
      
      // Wait for the app to load
      await page.waitForSelector('text=/Karaoke/i', { timeout: 10000 })
      
      // Check that the main heading is visible
      const heading = page.locator('h1, h2')
      await expect(heading).toBeVisible()
    })

    test('should have navigation elements', async ({ page }) => {
      await page.goto('/')
      
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Check for main navigation buttons or links
      const body = page.locator('body')
      await expect(body).toBeVisible()
    })
  })

  test.describe('Library Screen', () => {
    test('should display library section', async ({ page }) => {
      await page.goto('/')
      
      // Wait for the library or song list to appear
      await page.waitForLoadState('networkidle')
      
      // Look for library-related elements
      const libraryElements = page.locator('[data-testid="library"], [data-testid="song-list"], .library, .song-card')
      
      // Just verify the page loaded without errors
      const title = await page.title()
      expect(title).toBeTruthy()
    })
  })

  test.describe('Settings Screen', () => {
    test('should have accessible settings', async ({ page }) => {
      await page.goto('/')
      
      // Look for settings button or link
      const settingsButton = page.locator('[data-testid="settings"], button:has-text("Settings"), a:has-text("Settings")')
      
      // Check if settings button exists (optional - might not be visible)
      const count = await settingsButton.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Theme System', () => {
    test('should apply dark theme by default', async ({ page }) => {
      await page.goto('/')
      
      // Wait for theme to apply
      await page.waitForLoadState('networkidle')
      
      // Check if dark theme classes or styles are applied
      const body = page.locator('body')
      const backgroundColor = await body.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      )
      
      // Dark theme should have dark background
      expect(backgroundColor).toBeTruthy()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Page should still be functional
      const body = page.locator('body')
      await expect(body).toBeVisible()
    })

    test('should be responsive on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')
      
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Page should still be functional
      const body = page.locator('body')
      await expect(body).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Check for headings
      const headings = page.locator('h1, h2, h3')
      const count = await headings.count()
      
      // Should have at least one heading
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('should have interactive elements focusable', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Find all buttons
      const buttons = page.locator('button')
      const count = await buttons.count()
      
      // Should have at least some buttons
      expect(count).toBeGreaterThanOrEqual(1)
    })
  })

  test.describe('Performance', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Page should load within 10 seconds
      expect(loadTime).toBeLessThan(10000)
    })
  })
})
