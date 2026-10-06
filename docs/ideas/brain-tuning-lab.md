# Idea: Brain Tuning Lab

Status: idea, logged 2026-10-06 by Rafael (rgs2007)

## The idea

Grow Brain Tuning Sounds from a single player into a platform where people can **experiment**
with brain-tuning sounds, **build workflows**, **test** them on themselves, **share** them, and
**report results**, so the community builds evidence about what actually works.

Later phases could add **VR**, **light frequencies** (audio-visual stimulation) and
**neurofeedback devices**.

## Core capabilities

1. **Experiment.** Full sound designer: multiple tone pairs, beat types (binaural, monaural,
   isochronic), noise beds, music or nature layers, ramps between frequencies.
2. **Workflows.** Chain steps into sessions (for example: 5 min alpha, then 20 min theta, then a
   5 min fade). Save, version and reuse them.
3. **Test.** Self-experiment mode: baseline and post-session questionnaires (mood, stress,
   focus, sleep quality), simple cognitive tasks (reaction time, vigilance), and optional
   sham or blind sessions so people can compare against a placebo.
4. **Share.** Publish workflows with a link; browse, fork and rate others' workflows; tag them
   by goal (sleep, focus, meditation).
5. **Report results.** Aggregate anonymized outcomes per workflow, show sample size and effect,
   and keep self-reported results separate from measured ones. Link each preset to its source
   study, as the current app already does.

## Later phases

- **VR:** immersive environments synced to the session.
- **Light frequencies:** audio-visual entrainment, such as flicker synced to the beat (40 Hz,
  for example). Needs photosensitive-epilepsy safeguards and screening.
- **Neurofeedback devices:** read EEG from consumer headsets (Muse, OpenBCI and similar) to check
  entrainment and adapt the session in real time (closed loop).

## Things to settle early

- **Research ethics and privacy:** consent, anonymization and data ownership; no health claims;
  check whether pooled results count as human-subjects research.
- **Data quality:** blinding and sham options, standard questionnaires, minimum sample sizes
  before showing results.
- **Safety:** volume limits, epilepsy and medical warnings (essential once light is added),
  no use while driving.
- **Regulation:** stay a wellness tool, not a medical device, unless a clinical path is chosen
  deliberately.
- **Backend:** accounts, storage, sharing and analytics. The current app is a static page and
  has none of this yet.

## Starting point

The current app already has the sound engine (two simultaneous tone pairs, steady real-time
noise, band-limited noise, timers) and study-exact presets with citations. A small first step
would be saving and sharing custom settings by link, then adding pre and post questionnaires.
