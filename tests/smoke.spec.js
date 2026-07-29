/* ============================================================
   tests/smoke.spec.js
   Formalized regression smoke tests, run against the built
   dist/index.html (run `npm run build` first). These are the same
   checks used ad hoc throughout development — kept here so future
   changes can be verified the same way.

   Usage:
     npm run build
     npx playwright test tests/
   ============================================================ */

const { test, expect } = require('@playwright/test');
const path = require('path');

const DIST_URL = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');

test.describe('Stickman Duel smoke tests', () => {
  test('main menu loads with no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(DIST_URL);
    await page.waitForTimeout(300);
    await expect(page.locator('#main-menu')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('local multiplayer starts and both players can move/shoot', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(DIST_URL);
    await page.click('#btn-local');
    await page.click('.map-card[data-map="green"]');
    await page.waitForTimeout(300);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(150);
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyF');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyF');
    expect(errors).toEqual([]);
  });

  test.describe('each map loads and accepts input without error', () => {
    for (const mapId of ['green', 'city', 'moon', 'wind', 'space']) {
      test(mapId, async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(DIST_URL);
        await page.click('#btn-local');
        await page.click(`.map-card[data-map="${mapId}"]`);
        await page.waitForTimeout(300);
        await page.keyboard.press('KeyW');
        await page.keyboard.press('KeyC'); // dash or fly, depending on map
        await page.waitForTimeout(200);
        expect(errors).toEqual([]);
      });
    }
  });

  test('pause menu opens and closes', async ({ page }) => {
    await page.goto(DIST_URL);
    await page.click('#btn-local');
    await page.click('.map-card[data-map="green"]');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-menu')).toBeVisible();
    await page.click('#btn-resume');
    await expect(page.locator('#pause-menu')).toBeHidden();
  });

  test('space map: player can descend after ascending (regression for the zero-G stuck bug)', async ({ page }) => {
    await page.goto(DIST_URL);
    await page.click('#btn-local');
    await page.click('.map-card[data-map="space"]');
    await page.waitForTimeout(300);

    const canvas = page.locator('#game-canvas');
    const sample = () => canvas.screenshot();

    await page.keyboard.down('KeyW');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');
    const afterUp = await sample();

    await page.keyboard.down('KeyS');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyS');
    const afterDown = await sample();

    // A pixel-different screenshot is a weak but dependency-free proxy for
    // "the player visibly moved" without reaching into bundled JS state.
    expect(Buffer.compare(afterUp, afterDown)).not.toBe(0);
  });

  test('AI bot mode starts without error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(DIST_URL);
    await page.click('#btn-ai');
    await page.click('.map-card[data-map="city"]');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
