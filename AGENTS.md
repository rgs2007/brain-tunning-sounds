# Agent Instructions: Brain Tuning Sounds

## Project

A free, browser-only binaural beats generator. Live at
https://rgs2007.github.io/brain-tunning-sounds/ and listed in the Flowing Soft Product Lab
(https://www.flowingsoft.com/products/brain-tuning-sounds/).

The app has no build step. npm is used only to run tests.

## Files

- `index.html` is the page: layout, styles, UI rendering, transport (play/stop, fades, timer).
- `sound-engine.js` is the sound logic and the Web Audio graph (`window.BrainTuning` in the
  browser, a CommonJS module in Node). Presets, levels, noise generation and routing live here so
  they can be tested. Keep sound logic out of `index.html`.
- `tests/engine.test.js` holds unit tests for the pure logic (Node's built-in test runner).
- `tests/browser/audio-tests.html` + `audio-tests.js` render the real audio graph with
  `OfflineAudioContext` and check what each ear receives. `tests/run-browser-tests.mjs` runs them
  headless.
- `tests/run-browser-tests.mjs` also opens the real page and its single-file build, presses Play,
  and checks the audio engine is running and audible.
- `scripts/build-single-file.mjs` inlines `sound-engine.js` into one HTML file for hosts that block
  separate script files (the published Claude artifact).
- `.github/workflows/pages.yml` runs all tests, then deploys to GitHub Pages only if they pass.
- `docs/ideas/` holds product ideas that are not built yet.

## Testing is required on every change

**Run the full test suite after every change, before committing, and do not commit or push while
any test fails.** This applies to every change, including small copy, style or preset edits.

```sh
npm install                      # first time only
npx playwright install chromium  # first time only
npm test                         # unit tests + browser audio tests
```

- `npm run test:unit` runs the logic tests. `npm run test:browser` runs the audio tests.
- If Chromium is installed somewhere else, set `CHROMIUM_PATH` to its executable.
- **Add or update tests in the same change** whenever you add a feature, change a preset, change
  levels or routing, or fix a bug. A bug fix should come with a test that fails without the fix.
- Visible page changes also need a quick check in a browser (desktop and phone width, light and
  dark) with no console errors.
- Never weaken or delete a test to make it pass. If a test is wrong, explain why in the commit.

What the tests protect:

- Each ear receives only its own tone (a broken channel merge once sent both tones to one ear).
- Presets reproduce their study's ear tones and tone-to-noise balance.
- Noise is stereo, independent per ear, steady in level, and nothing clips at full volume.
- Pressing Play on the real page (and the single-file build) actually produces sound.

## Presets and research

- Each preset replicates one published controlled study. The study's tones, background,
  tone-to-noise balance and length are recorded in `PRESETS` with a citation, and the page lists
  them. When changing a preset, cite the study and update `STUDY_TONES` in the unit tests.
- Keep claims honest: binaural beat evidence is mixed. Do not promise health, sleep or cognitive
  outcomes. This is not a medical device.

## Audio rules

- Each tone pair is merged into its own stereo signal and connected straight to `beatGain`.
  Never feed a stereo signal into another `ChannelMerger` input: it folds both ears into one.
- Noise is generated live in an AudioWorklet (no loop seams), with a buffer fallback.
- Avoid flashing visuals at beat rates (photosensitivity). The beat trace scrolls; it never flashes.

## Deploy

Pushing to `main` runs tests and then deploys. The published Claude artifact cannot load
`sound-engine.js` as a separate file, so publish the inlined build instead:
`node scripts/build-single-file.mjs <out.html> --fragment`.
