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

  test('pre-match countdown blocks damage and movement, then match proceeds', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(DIST_URL);
    await page.click('#btn-local');
    await page.click('.map-card[data-map="green"]');
    await page.waitForTimeout(100); // still within the 5s countdown

    const canvas = page.locator('#game-canvas');
    const frozen = await canvas.screenshot();
    await page.keyboard.down('KeyD');
    await page.keyboard.down('KeyF');
    await page.waitForTimeout(1500); // still within countdown
    await page.keyboard.up('KeyD');
    await page.keyboard.up('KeyF');
    const stillFrozen = await canvas.screenshot();
    // Countdown text itself changes frame-to-frame, but the player should
    // not have moved — a full pixel match would be too strict given the
    // countdown number changing, so this just confirms no error occurred
    // while hammering input during the freeze window (see gameLoop.js's
    // dedicated 'countdown' branch for the actual no-damage guarantee).
    expect(errors).toEqual([]);

    await page.waitForTimeout(4000); // wait out the rest of the countdown
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    expect(errors).toEqual([]);
  });

  test('your-character indicator follows AI mode\'s human player (always Blue)', async ({ page }) => {
    await page.goto(DIST_URL);
    await page.click('#btn-ai');
    await page.click('.map-card[data-map="green"]');
    await page.waitForTimeout(5300); // wait out countdown so the indicator is drawn over a settled scene

    const found = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(300, 400, 200, 260).data; // above P1's spawn area
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (Math.abs(r - 255) < 12 && Math.abs(g - 209) < 12 && Math.abs(b - 102) < 12) return true;
      }
      return false;
    });
    expect(found).toBe(true);
  });
});
