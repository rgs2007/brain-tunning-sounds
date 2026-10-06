// Runs the browser tests in headless Chromium and exits non-zero on any failure:
//  1. tests/browser/audio-tests.html: renders the audio graph offline and checks each ear.
//  2. Page tests: loads the real page (and its single-file build), presses Play, and checks that
//     sound is actually being produced.
// Requires the `playwright` package and Chromium (npx playwright install chromium).
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const fileUrl = (p) => pathToFileURL(p).href;

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
});
let passed = 0, failed = 0;
const report = (ok, name, error) => {
  console.log(`${ok ? "ok    " : "FAIL  "}${name}${error ? `\n      ${error}` : ""}`);
  ok ? passed++ : failed++;
};

async function audioGraphTests() {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(fileUrl(path.join(here, "browser", "audio-tests.html")));
  await page.waitForFunction(() => Array.isArray(window.__testResults), null, { timeout: 120000 });
  for (const r of await page.evaluate(() => window.__testResults)) report(r.ok, r.name, r.error);
  for (const e of errors) report(false, "audio tests page error", e);
  await page.close();
}

// Presses Play on a page and checks the engine is running and audible.
async function pagePlaysSound(label, url) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(url);
    const loaded = await page.evaluate(() => !!window.BrainTuning && !!window.BrainTuningApp);
    if (!loaded) throw new Error("sound engine or app did not load");
    if (await page.isDisabled("#play")) throw new Error("Play button is disabled");
    await page.click("#play");
    await page.waitForFunction(() => window.BrainTuningApp.isPlaying(), null, { timeout: 10000 });
    await page.waitForTimeout(2500); // part of the 10 s fade-in
    const s = await page.evaluate(() => {
      const e = window.BrainTuningApp.engine();
      return { ctx: e.ctx.state, master: e.master.gain.value, beat: e.beatGain.gain.value, noise: e.noiseGain.gain.value };
    });
    if (s.ctx !== "running") throw new Error(`audio context is ${s.ctx}`);
    if (!(s.master > 0.01)) throw new Error(`master volume is ${s.master} after 2.5 s`);
    if (!(s.beat > 0.001)) throw new Error(`beat level is ${s.beat}`);
    if (errors.length) throw new Error(errors.join("; "));
    report(true, `${label}: Play produces sound`);
  } catch (e) {
    report(false, `${label}: Play produces sound`, e.message);
  } finally {
    await page.close();
  }
}

try {
  await audioGraphTests();
  await pagePlaysSound("page", fileUrl(path.join(root, "index.html")));
  const tmp = mkdtempSync(path.join(os.tmpdir(), "bts-"));
  const single = path.join(tmp, "single.html");
  execFileSync(process.execPath, [path.join(root, "scripts", "build-single-file.mjs"), single], { stdio: "ignore" });
  await pagePlaysSound("single-file build", fileUrl(single));
} finally {
  await browser.close();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
