import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const targetUrl = process.env.VISUAL_URL ?? "http://127.0.0.1:8787/preview";
const outputDir = "output/playwright";

async function collectMetrics(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".card")];
    const overflowing = [...document.querySelectorAll("body *")]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => ({
        tag: el.tagName,
        className: String(el.className),
        text: el.textContent.trim().slice(0, 80),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));

    return {
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      cardCount: cards.length,
      countText: document.querySelector("#count")?.textContent ?? "",
      gridColumns: getComputedStyle(document.querySelector("#grid")).gridTemplateColumns,
      bodyScrollWidth: document.body.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      overflowingCount: overflowing.length,
      overflowing: overflowing.slice(0, 10),
    };
  });
}

async function checkViewport(browser, label, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.screenshot({
    path: `${outputDir}/townino-preview-${label}.png`,
    fullPage: true,
  });

  const metrics = await collectMetrics(page);
  await page.close();

  if (metrics.cardCount !== 5) {
    throw new Error(`${label}: expected 5 cards, got ${metrics.cardCount}`);
  }

  if (metrics.bodyScrollWidth > metrics.documentClientWidth + 1) {
    throw new Error(
      `${label}: horizontal overflow ${metrics.bodyScrollWidth} > ${metrics.documentClientWidth}`
    );
  }

  if (metrics.overflowingCount > 0) {
    throw new Error(`${label}: ${metrics.overflowingCount} elements overflow`);
  }

  return { label, screenshot: `${outputDir}/townino-preview-${label}.png`, metrics };
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const results = [];
  results.push(await checkViewport(browser, "desktop", { width: 1280, height: 900 }));
  results.push(await checkViewport(browser, "mobile", { width: 390, height: 844 }));
  console.log(JSON.stringify({ ok: true, targetUrl, results }, null, 2));
} finally {
  await browser.close();
}
