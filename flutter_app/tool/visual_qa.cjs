const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('node:path');
const assert = require('node:assert/strict');

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1 });
    const errors = [];
    let agentRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().endsWith('/api/agent')) {
        agentRequests++;
      }
    });
    await page.route('**/api/agent', async route => {
      const mode = JSON.parse(route.request().postData()).mode;
      if (mode !== 'demo') {
        await route.abort();
        throw new Error('Visual checks only permit explicitly selected Demo requests.');
      }
      await route.continue();
    });
    const url = process.env.DEMO_URL || 'http://127.0.0.1:8787/flutter/';
    async function waitForAria(pattern) {
      let snapshot = '';
      for (let index = 0; index < 100; index++) {
        snapshot = await page.locator('body').ariaSnapshot();
        if (pattern.test(snapshot)) return snapshot;
        await page.waitForTimeout(100);
      }
      assert.match(snapshot, pattern);
    }
    async function enableAccessibility() {
      await page.waitForSelector('flutter-view', { timeout: 60000 });
      const placeholder = page.locator('flt-semantics-placeholder');
      if (await placeholder.count()) await placeholder.dispatchEvent('click');
    }
    await page.goto(url, { waitUntil: 'networkidle' });
    await enableAccessibility();
    await waitForAria(/Gemini · live model/);
    await waitForAria(/Gemini setup needed|Gemini configured/);
    assert.equal(agentRequests, 0, 'Opening the app must not start a model run.');
    await page.screenshot({ path: path.resolve('../docs/flutter-initial.png'), fullPage: false });
    await page.getByRole('button', { name: 'Gemini · live model', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Demo · no model calls', exact: true }).click();
    await waitForAria(/Demo selected · no model calls/);
    const firstResponse = page.waitForResponse(response => response.url().endsWith('/api/agent'));
    await page.getByRole('button', { name: 'Get me Kite Hill yogurt under $6 in Mountain View', exact: true }).click();
    const ready = await (await firstResponse).json();
    assert.equal(ready.status, 'ready');
    assert.equal(ready.mode, 'demo');
    await page.getByRole('button', { name: 'Prepare demo cart', exact: true }).waitFor();
    await page.screenshot({ path: path.resolve('../docs/flutter-demo.png'), fullPage: false });
    console.log('READY', JSON.stringify({ status: ready.status, mode: ready.mode, storage: ready.storage, metrics: ready.metrics }));
    console.log(await page.locator('body').ariaSnapshot());

    const cartResponse = page.waitForResponse(response => response.url().endsWith('/api/cart'));
    await page.getByRole('button', { name: 'Prepare demo cart', exact: true }).click();
    const cartResult = await (await cartResponse).json();
    assert.equal(cartResult.cart.status, 'draft');
    await waitForAria(/Demo cart draft/);
    await page.screenshot({ path: path.resolve('../docs/flutter-cart.png'), fullPage: false });
    console.log('CART', JSON.stringify({ status: cartResult.cart.status, total: cartResult.cart.total }));

    await page.getByRole('checkbox', { name: 'Out of stock', exact: true }).click();
    await page.getByRole('textbox', { name: 'Ask for a product, budget, and location…', exact: true }).click();
    await page.waitForTimeout(300);
    await page.keyboard.type('Get me Kite Hill yogurt under $6 in Mountain View', { delay: 15 });
    const stockResponse = page.waitForResponse(response => response.url().endsWith('/api/agent'));
    await page.getByRole('button', { name: 'Send request', exact: true }).click();
    const stockHttp = await stockResponse;
    const stock = await stockHttp.json();
    console.log('STOCK REQUEST', stockHttp.request().postData());
    console.log('STOCK ANSWER', stock.answer);
    assert.equal(stock.status, 'abstained');
    assert.equal(stock.action, null);
    await page.waitForTimeout(300);
    assert.equal(await page.getByRole('button', { name: 'Prepare demo cart', exact: true }).count(), 0);
    await page.screenshot({ path: path.resolve('../docs/flutter-stock.png'), fullPage: false });
    console.log('STOCK', JSON.stringify({ status: stock.status, action: stock.action }));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await enableAccessibility();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve('../docs/flutter-mobile.png'), fullPage: false });
    console.log('MOBILE', await page.locator('body').ariaSnapshot());
    await page.getByRole('tab', { name: /API execution trace/ }).click();
    await page.waitForTimeout(300);
    assert.match(await page.locator('body').ariaSnapshot(), /Every action has evidence/);
    await page.screenshot({ path: path.resolve('../docs/flutter-mobile-trace.png'), fullPage: false });
    assert.deepEqual(errors, []);
    console.log('PASS: Gemini default without automatic run, explicit Demo query, cart, stock abstention, compact tabs; no browser errors or model calls.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
