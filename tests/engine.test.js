// Unit tests for the pure sound logic in sound-engine.js. Run with: node --test tests/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const BT = require("../sound-engine.js");

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: expected ${expected} ±${tol}, got ${actual}`);

// Ear tones each study used (left, right), per tone pair.
const STUDY_TONES = {
  sleep: [[250, 253]],
  meditate: [[250, 256]],
  relax: [[335, 345]],
  focus: [[200, 216], [300, 324]],
  gamma: [[320, 360]]
};

test("every preset reproduces its study's ear tones", () => {
  for (const p of BT.PRESETS) {
    const pairs = BT.earFreqs(BT.presetSettings(p.id));
    const expected = STUDY_TONES[p.id];
    assert.equal(pairs.length, expected.length, `${p.id}: number of tone pairs`);
    pairs.forEach((pair, i) => {
      near(pair.left, expected[i][0], 1e-9, `${p.id} pair ${i} left ear`);
      near(pair.right, expected[i][1], 1e-9, `${p.id} pair ${i} right ear`);
    });
  }
});

test("ear tones differ by exactly the beat and are centered on the base tone", () => {
  const state = { beat: 7.5, carrier: 222.5 };
  const [pair] = BT.earFreqs(state);
  near(pair.right - pair.left, 7.5, 1e-9, "beat");
  near((pair.right + pair.left) / 2, 222.5, 1e-9, "center");
});

test("presets keep the study's tone-to-noise balance", () => {
  for (const p of BT.PRESETS.filter((x) => typeof x.toneDb === "number")) {
    const db = BT.beatVsNoiseDb(BT.presetSettings(p.id));
    near(db, p.toneDb, 0.5, `${p.id} tones vs noise (dB)`);
  }
});

test("presets are complete and within control ranges", () => {
  for (const p of BT.PRESETS) {
    const s = BT.presetSettings(p.id);
    assert.ok(BT.isValidState(s), `${p.id} produces a valid state`);
    assert.ok(s.beatVol >= 0 && s.beatVol <= 100, `${p.id} beatVol in range`);
    assert.ok(s.noiseVol >= 0 && s.noiseVol <= 100, `${p.id} noiseVol in range`);
    assert.ok(s.carrier >= 100 && s.carrier <= 450, `${p.id} carrier within slider range`);
    assert.ok(s.beat >= 1 && s.beat <= 40, `${p.id} beat within slider range`);
    assert.ok(p.study && p.study.url && p.study.cite && p.study.result, `${p.id} cites its study`);
    assert.equal(BT.bandFor(p.beat).id, p.band, `${p.id} beat falls in its band`);
  }
});

test("isCustom is false for an untouched preset and true after any change", () => {
  for (const p of BT.PRESETS) {
    const s = Object.assign({ preset: p.id }, BT.presetSettings(p.id));
    assert.equal(BT.isCustom(s), false, `${p.id} untouched`);
    assert.equal(BT.isCustom(Object.assign({}, s, { beat: s.beat + 0.5 })), true, `${p.id} beat changed`);
    assert.equal(BT.isCustom(Object.assign({}, s, { noiseVol: s.noiseVol - 1 })), true, `${p.id} noise volume changed`);
  }
});

test("bandFor maps beat frequencies to the right band", () => {
  assert.equal(BT.bandFor(2).id, "delta");
  assert.equal(BT.bandFor(4).id, "theta");
  assert.equal(BT.bandFor(10).id, "alpha");
  assert.equal(BT.bandFor(16).id, "beta");
  assert.equal(BT.bandFor(40).id, "gamma");
});

test("noise loudness offsets account for color and band limits", () => {
  near(BT.noiseOffsetDb("pink", null), 0, 1e-9, "pink is the reference");
  near(BT.noiseOffsetDb("white", null), 20 * Math.log10(0.45 / 0.8), 1e-9, "white trim");
  assert.ok(BT.noiseOffsetDb("pink", [40, 320]) < -3, "band-limited pink is quieter");
  assert.equal(BT.noiseOffsetDb("none", null), 0);
});

test("levels never exceed full scale and noise is silent when off", () => {
  const loud = { noise: "brown", noiseVol: 100, beatVol: 100 };
  const g = BT.levelGains(loud);
  // Tone peak plus brown noise peak (about 5.3x RMS), at full master volume, must stay below 1.0.
  assert.ok((g.beat + g.noise * BT.NOISE_RMS * 5.3) * BT.MAX_OUTPUT < 1, "no clipping at maximum");
  assert.equal(BT.levelGains({ noise: "none", noiseVol: 80, beatVol: 50 }).noise, 0);
  assert.equal(BT.beatVsNoiseDb({ noise: "none", noiseVol: 80, beatVol: 50 }), null);
});

test("noise generators produce the intended RMS for every color", () => {
  for (const color of ["white", "pink", "brown"]) {
    const gen = BT.makeGenerator();
    const n = 48000 * 20;
    let sum = 0, sumSq = 0;
    for (let i = 0; i < n; i++) {
      const v = gen(color) * BT.NOISE_RMS;
      sum += v; sumSq += v * v;
    }
    const mean = sum / n;
    const rms = Math.sqrt(sumSq / n - mean * mean);
    near(rms, BT.NOISE_RMS, BT.NOISE_RMS * 0.12, `${color} RMS`);
  }
});

test("noise worklet source is valid and registers its processor", () => {
  const src = BT.workletSource();
  let registered = null;
  const stubs = {
    AudioWorkletProcessor: class { constructor() { this.port = {}; } },
    registerProcessor: (name, cls) => { registered = { name, cls }; }
  };
  new Function("AudioWorkletProcessor", "registerProcessor", src)(stubs.AudioWorkletProcessor, stubs.registerProcessor);
  assert.equal(registered && registered.name, "bts-noise");
  // Two independent channels of non-silent noise.
  const proc = new registered.cls({ processorOptions: { type: "pink" } });
  const out = [new Float32Array(128), new Float32Array(128)];
  proc.process([], [out]);
  assert.ok(out[0].some((v) => v !== 0) && out[1].some((v) => v !== 0), "both channels have noise");
  assert.notDeepEqual(Array.from(out[0]), Array.from(out[1]), "channels are independent");
});
