const { chromium } = require('playwright');

async function takeScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to a typical desktop size
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate to the dashboard
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait a bit for charts to render
  await page.waitForTimeout(2000);

  // Take full page screenshot
  await page.screenshot({
    path: '/Users/dan/vibe-viz/screenshot-dashboard-full.png',
    fullPage: true
  });

  // Take viewport screenshot
  await page.screenshot({
    path: '/Users/dan/vibe-viz/screenshot-dashboard-viewport.png'
  });

  // Scroll down to see more charts and take another screenshot
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({
    path: '/Users/dan/vibe-viz/screenshot-dashboard-scrolled.png'
  });

  console.log('Screenshots saved successfully');
  await browser.close();
}

takeScreenshots().catch(console.error);
