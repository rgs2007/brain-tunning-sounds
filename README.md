# Brain Tuning Sounds

A free, single-page binaural beats generator with optional white, pink or brown noise.
Everything runs in the browser with the Web Audio API. No build step, no tracking, no uploads.

Live app: https://rgs2007.github.io/brain-tunning-sounds/

## Features

- Five presets based on the frequencies used most in published studies:

  | Preset      | Band  | Beat  | Base tone | Noise | Timer |
  |-------------|-------|-------|-----------|-------|-------|
  | Deep sleep  | Delta | 2 Hz  | 200 Hz    | Brown | 45 min |
  | Meditation  | Theta | 6 Hz  | 200 Hz    | Pink  | 20 min |
  | Relax       | Alpha | 10 Hz | 250 Hz    | Pink  | 20 min |
  | Focus       | Beta  | 16 Hz | 250 Hz    | Pink  | 30 min |
  | 40 Hz gamma | Gamma | 40 Hz | 400 Hz    | White | 15 min |

- Optional adjustments: beat frequency (1–40 Hz), base tone (100–500 Hz), noise color,
  beat/noise balance, volume and a sleep timer with a 20 second fade-out.
- A guide to each frequency band, what it is linked to, and how strong the evidence is.
- Light and dark themes, keyboard support (Space toggles play), reduced-motion support.

## How it works

Two sine oscillators are routed to separate stereo channels: the left ear gets
`base − beat/2` and the right ear gets `base + beat/2`. The perceived beat is the difference.
Noise is generated once per color into a looping stereo buffer (independent noise per ear,
crossfaded loop point), using Paul Kellet's filter for pink noise and a leaky integrator for brown.

Headphones are required for the beat to form.

## Evidence

Binaural beat research is promising but inconsistent. A 2019 meta-analysis
(Garcia-Argibay et al., *Psychological Research*) found small-to-moderate effects on memory,
attention, anxiety and pain perception, while a 2023 systematic review
(Ingendoh et al., *PLOS ONE*) found that EEG evidence for brainwave entrainment is mixed.
The app presents this plainly and is not a medical device.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 4173
```

## Deploy

`.github/workflows/pages.yml` deploys the repository root to GitHub Pages on every push to `main`.

---

A product-lab experiment by [Flowing Soft](https://www.flowingsoft.com/).
