// Runs tests/browser/audio-tests.html in headless Chromium and exits non-zero on any failure.
// Requires the `playwright` package and its Chromium (npx playwright install chromium).
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const page_url = pathToFileURL(path.join(here, "browser", "audio-tests.html")).href;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
let failed = 0;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(page_url);
  await page.waitForFunction(() => Array.isArray(window.__testResults), null, { timeout: 120000 });
  const results = await page.evaluate(() => window.__testResults);
  for (const r of results) {
    console.log(`${r.ok ? "ok    " : "FAIL  "}${r.name}${r.error ? `\n      ${r.error}` : ""}`);
    if (!r.ok) failed++;
  }
  for (const e of errors) { console.log(`FAIL  page error: ${e}`); failed++; }
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
