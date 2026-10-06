# Brain Tuning Sounds

A free, single-page binaural beats generator with optional white, pink or brown noise.
Everything runs in the browser with the Web Audio API. No build step, no tracking, no uploads.

Live app: https://rgs2007.github.io/brain-tunning-sounds/

## Features

- Five presets, each replicating the protocol of the strongest controlled study found for its band:

  | Preset        | Band  | Study                         | Ear tones                         | Background                 | Tones vs noise | Length |
  |---------------|-------|-------------------------------|-----------------------------------|----------------------------|----------------|--------|
  | Deep sleep    | Delta | Jirakittayakorn 2018 (RCT)    | 250 / 253 Hz (3 Hz)               | none                       | tones only     | 3 h    |
  | Meditation    | Theta | Jirakittayakorn 2017          | 250 / 256 Hz (6 Hz)               | none                       | tones only     | 30 min |
  | Stress relief | Alpha | Chen 2025 (double-blind RCT)  | 335 / 345 Hz (10 Hz)              | pink noise                 | 3.5 dB under   | 15 min |
  | Vigilance     | Beta  | Lane 1998 (double-blind)      | 200/216 Hz (16) + 300/324 Hz (24) | pink noise, 40–320 Hz      | 15 dB over     | 30 min |
  | Attention     | Gamma | Melnichuk 2025                | 320 / 360 Hz (40 Hz)              | white noise                | 10 dB over     | 33 min |

  Tone-to-noise balance is computed from each noise color's loudness and bandwidth, so the
  ratio matches the study. The page lists each study's design, settings and result.

- Monroe Institute (Hemi-Sync) style layering available through the volume sliders: tones can
  sit under a noise bed (white, pink, brown or swelling surf), with a 10 second fade-in and slow
  glides between settings. White noise plays quieter
  and every bed has its top hiss rounded off with a gentle low-pass filter.
- Optional adjustments: beat frequency (1–40 Hz), base tone (100–450 Hz), noise bed,
  separate noise and beat volumes (with a live readout of how far the beat sits under the
  noise), overall volume and a sleep timer with a 20 second fade-out.
- A guide to each frequency band, what it is linked to, and how strong the evidence is.
- Light and dark themes, keyboard support (Space toggles play), reduced-motion support.

## How it works

The sound engine lives in `sound-engine.js`. Each tone pair is two sine oscillators routed to separate stereo channels: the left ear gets
`base − beat/2` and the right ear gets `base + beat/2`. The perceived beat is the difference.
Noise is generated continuously in an AudioWorklet (independent noise per ear), so there is
no loop point, repetition or level dip; a 30 Hz high-pass removes sub-audible rumble drift.
White, pink (Paul Kellet's filter) and brown (leaky integrator) are each scaled to the same RMS.
Browsers without AudioWorklet fall back to a 40 second looping buffer with an equal-power crossfade.

Headphones are required for the beat to form.

## Evidence

Binaural beat research is promising but inconsistent. A 2019 meta-analysis
(Garcia-Argibay et al., *Psychological Research*) found small-to-moderate effects on memory,
attention, anxiety and pain perception, while a 2023 systematic review
(Ingendoh et al., *PLOS ONE*) found that EEG evidence for brainwave entrainment is mixed.
The app presents this plainly and is not a medical device.

## Tests

Every change must pass the full test suite before it is committed (see `AGENTS.md`).

```sh
npm install
npx playwright install chromium
npm test
```

- `npm run test:unit`: preset study values, tone-to-noise balance, levels and headroom,
  noise generator RMS, worklet validity (Node's built-in test runner).
- `npm run test:browser`: renders the real audio graph offline and checks that each ear gets
  only its own tone, both ears match, noise is stereo and steady, and nothing clips.

GitHub Actions runs both on every push and pull request; Pages deploys only when they pass.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 4173
```

## Deploy

`.github/workflows/pages.yml` deploys the repository root to GitHub Pages on every push to `main`.

---

A product-lab experiment by [Flowing Soft](https://www.flowingsoft.com/).
