/* Brain Tuning Sounds sound engine.
 * Pure sound logic and the Web Audio graph, kept apart from the page UI so it can be tested.
 * Works as a browser global (window.BrainTuning) and as a CommonJS module for Node tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BrainTuning = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- Data ----------
  var BANDS = [
    { id: "delta", name: "Delta", min: 0.5, max: 4,
      assoc: "Deep, dreamless sleep and the body's recovery phase.",
      research: "A 3 Hz beat played during sleep lengthened deep sleep in a controlled sleep-lab trial, and 0.25 Hz beats shortened the time to deep sleep during naps. Both studies were small.",
      evidence: "Limited", ev: "mixed" },
    { id: "theta", name: "Theta", min: 4, max: 8,
      assoc: "Drowsiness, deep relaxation, meditation and the edge of sleep.",
      research: "A 6 Hz beat raised theta activity, including the frontal theta linked to meditation, within 10 minutes. Other studies find smaller or inconsistent changes, and one 2025 trial saw a trend toward more stress.",
      evidence: "Mixed", ev: "mixed" },
    { id: "alpha", name: "Alpha", min: 8, max: 13,
      assoc: "Relaxed but awake, eyes closed, calm attention.",
      research: "In a 2025 double-blind trial comparing theta, alpha and beta, only 10 Hz alpha over pink noise lowered stress. Brain recordings rarely show alpha entrainment.",
      evidence: "Mixed", ev: "mixed" },
    { id: "beta", name: "Beta", min: 13, max: 30,
      assoc: "Active thinking, alertness and sustained attention.",
      research: "A classic study found beta beats (16 and 24 Hz) in pink noise improved vigilance and mood compared with theta/delta beats. Later work is mixed.",
      evidence: "Some support", ev: "some" },
    { id: "gamma", name: "Gamma", min: 30, max: 45,
      assoc: "Information processing, memory and focused attention.",
      research: "40 Hz is widely researched, mostly as flickering light and clicking sound in Alzheimer's studies rather than binaural beats. In a 2025 study, 40 Hz beats on a 340 Hz tone helped sustained attention while a 400 Hz tone did not. Gamma studies are early and small.",
      evidence: "Preliminary", ev: "mixed" }
  ];

  // Each preset copies the protocol of the strongest controlled study we found for its band.
  // carrier = midpoint of the two ear tones (left = carrier - beat/2, right = carrier + beat/2).
  // toneDb = beat tones relative to the noise, as the study set them; beatVol is derived from it.
  // extra = a second simultaneous tone pair; noiseBand = noise limited to this frequency range (Hz).
  var PRESETS = [
    { id: "sleep", band: "delta", name: "Deep sleep", beat: 3, carrier: 251.5, noise: "none", noiseVol: 70, beatVol: 70, minutes: 180,
      spec: "3 Hz · tones only · 3 h",
      study: { short: "Jirakittayakorn 2018", cite: "Jirakittayakorn & Wongsawat (2018), Frontiers in Human Neuroscience", url: "https://doi.org/10.3389/fnhum.2018.00387",
        design: "Randomized controlled trial, 23 adults, overnight sleep lab",
        protocol: "250 Hz left, 253 Hz right, no background sound, 60 dB SPL. Started at light sleep (N2) and played about 3 hours.",
        result: "More time in deep sleep (N3), reached deep sleep sooner, higher delta power; no extra awakenings." } },
    { id: "meditate", band: "theta", name: "Meditation", beat: 6, carrier: 253, noise: "none", noiseVol: 70, beatVol: 75, minutes: 30,
      spec: "6 Hz · tones only · 30 min",
      study: { short: "Jirakittayakorn 2017", cite: "Jirakittayakorn & Wongsawat (2017), Frontiers in Neuroscience", url: "https://doi.org/10.3389/fnins.2017.00365",
        design: "Controlled trial, 28 adults, beat vs. silence",
        protocol: "250 Hz left, 256 Hz right, no background sound, 65 dB SPL, 30 minutes sitting quietly.",
        result: "Theta activity rose within 10 minutes, including frontal midline theta linked to meditation; emotional tension fell." } },
    { id: "relax", band: "alpha", name: "Stress relief", beat: 10, carrier: 340, noise: "pink", noiseVol: 75, toneDb: -3.5, minutes: 15,
      spec: "10 Hz · pink · 15 min",
      study: { short: "Chen 2025", cite: "Chen, Wong, Dzebley & Stone (2025), Cureus", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12597119/",
        design: "Double-blind randomized controlled trial, 63 adults, theta/alpha/beta vs. plain tone",
        protocol: "335 Hz and 345 Hz tones at 40% volume over pink noise at 60% volume, 15 minutes.",
        result: "Only the alpha group reported significantly lower stress, with a trend toward lower depression scores." } },
    { id: "focus", band: "beta", name: "Vigilance", beat: 16, carrier: 208, extra: { beat: 24, carrier: 312 }, noise: "pink", noiseBand: [40, 320], noiseVol: 40, toneDb: 15, minutes: 30,
      spec: "16 + 24 Hz · pink · 30 min",
      study: { short: "Lane 1998", cite: "Lane, Kasian, Owens & Marsh (1998), Physiology & Behavior", url: "https://doi.org/10.1016/S0031-9384(97)00436-8",
        design: "Double-blind crossover, 29 adults, beta vs. theta/delta beats",
        protocol: "Two beats at once: 16 Hz on a 200 Hz tone and 24 Hz on a 300 Hz tone, over pink noise limited to 40–320 Hz, tones 15 dB above the noise, during a 30-minute task.",
        result: "More correct detections, fewer false alarms, and less confusion and fatigue than with theta/delta beats." } },
    { id: "gamma", band: "gamma", name: "Attention", beat: 40, carrier: 340, noise: "white", noiseVol: 50, toneDb: 10, minutes: 33,
      spec: "40 Hz · white · 33 min",
      study: { short: "Melnichuk 2025", cite: "Melnichuk, Cooper & Hawk (2025), Scientific Reports", url: "https://doi.org/10.1038/s41598-025-88517-z",
        design: "Randomized factorial study with crossover, 64 adults, beats vs. plain tone",
        protocol: "40 Hz beat on a 340 Hz tone at 70 dB(A) over white noise at 60 dB(A), about 33 minutes during a sustained-attention task.",
        result: "More correct hits with 40 Hz on a 340 Hz tone; the same beat on a 400 Hz tone did not help." } }
  ];

  var NOISE_NAMES = { none: "no noise", white: "white noise", pink: "pink noise", brown: "brown noise", surf: "surf" };
  // Loudness trim per color at equal RMS: white sounds harshest, so it plays quieter.
  var NOISE_TRIM = { none: 0, white: 0.45, pink: 0.8, brown: 1, surf: 0.85 };
  var NOISE_RMS = 0.18;      // noise RMS; brown and pink peaks stay under 1.0
  var SURF_PERIOD_S = 11;    // one wave swell
  var NOISE_LOWPASS_HZ = 9000;
  var NOISE_HIGHPASS_HZ = 30;
  var NOISE_SECONDS = 40; // fallback loop length only
  // Master ceiling: tones at 100% plus brown-noise peaks at 100% stay under full scale.
  var MAX_OUTPUT = 0.8;

  // Fill in beatVol for presets defined by a study's tone-to-noise level.
  PRESETS.forEach(function (p) {
    if (typeof p.toneDb === "number") {
      var offset = noiseOffsetDb(p.noise, p.noiseBand || null);
      p.beatVol = Math.min(100, Math.round(p.noiseVol * Math.pow(10, (p.toneDb + offset) / 40)));
    }
  });

  function findPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
    return PRESETS[2];
  }
  function presetSettings(id) {
    var p = findPreset(id);
    return { beat: p.beat, carrier: p.carrier, extra: p.extra || null, noise: p.noise, noiseBand: p.noiseBand || null, noiseVol: p.noiseVol, beatVol: p.beatVol, minutes: p.minutes };
  }
  function bandFor(hz) {
    for (var i = 0; i < BANDS.length; i++) if (hz < BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }
  function isValidState(s) {
    return !!s && typeof s.beat === "number" && typeof s.carrier === "number" &&
      typeof s.noiseVol === "number" && typeof s.beatVol === "number" && (s.noise in NOISE_TRIM);
  }
  function isCustom(state) {
    var p = findPreset(state.preset);
    return p.beat !== state.beat || p.carrier !== state.carrier || p.noise !== state.noise ||
      p.noiseVol !== state.noiseVol || p.beatVol !== state.beatVol ||
      !!p.extra !== !!state.extra || !!p.noiseBand !== !!state.noiseBand;
  }

  // ---------- Levels ----------
  // Noise loudness relative to full-band pink at the same slider value, in dB: the color's trim,
  // plus the power lost when the noise is limited to a band (pink has equal power per octave).
  function noiseOffsetDb(color, band) {
    if (color === "none") return 0;
    var db = 20 * Math.log10(NOISE_TRIM[color] / NOISE_TRIM.pink);
    if (band) {
      var full = Math.log(NOISE_LOWPASS_HZ / NOISE_HIGHPASS_HZ);
      db += 10 * Math.log10(Math.log(band[1] / band[0]) / full);
    }
    return db;
  }
  // Left ear gets carrier - beat/2, right ear carrier + beat/2. Returns one entry per tone pair.
  function earFreqs(state) {
    var pairs = [{ left: state.carrier - state.beat / 2, right: state.carrier + state.beat / 2 }];
    if (state.extra) pairs.push({ left: state.extra.carrier - state.extra.beat / 2, right: state.extra.carrier + state.extra.beat / 2 });
    return pairs;
  }
  // Both layers share one scale: at 100% each plays at the pink-noise reference RMS.
  // Sliders use a squared curve so equal steps sound like equal changes.
  // A sine of amplitude A has RMS A / sqrt(2).
  function sliderGain(pct) { var v = pct / 100; return v * v; }
  function levelGains(state) {
    var refRms = NOISE_RMS * NOISE_TRIM.pink;
    var noise = NOISE_TRIM[state.noise] * sliderGain(state.noiseVol);
    var toneRms = refRms * sliderGain(state.beatVol);
    return { beat: toneRms * Math.SQRT2, noise: noise };
  }
  // How far the beat tones sit under (or over) the noise, in dB; null when there is no comparison.
  function beatVsNoiseDb(state) {
    if (state.noise === "none" || state.noiseVol === 0 || state.beatVol === 0) return null;
    return 40 * Math.log10(state.beatVol / state.noiseVol) - noiseOffsetDb(state.noise, state.noiseBand);
  }

  // ---------- Noise generation ----------
  // Noise is generated continuously, sample by sample, in an AudioWorklet: there is no loop,
  // so there are no seams, repeats or level dips. Each ear gets independent noise.
  // Scale factors bring each color to NOISE_RMS (measured over 60 s of output).
  var NOISE_SCALE = { white: 0.433 / 0.25, pink: 0.142 / 0.25, brown: 4.364 / 0.25 };
  var NOISE_WORKLET = [
    "var SCALE = " + JSON.stringify(NOISE_SCALE) + ";",
    "function Gen() { this.b = [0,0,0,0,0,0,0]; this.last = 0; }",
    "Gen.prototype.next = function (type) {",
    "  var w = Math.random() * 2 - 1, b = this.b;",
    "  if (type === 'white') return w * SCALE.white;",
    "  if (type === 'pink') {",
    "    b[0] = 0.99886 * b[0] + w * 0.0555179; b[1] = 0.99332 * b[1] + w * 0.0750759;",
    "    b[2] = 0.96900 * b[2] + w * 0.1538520; b[3] = 0.86650 * b[3] + w * 0.3104856;",
    "    b[4] = 0.55000 * b[4] + w * 0.5329522; b[5] = -0.7616 * b[5] - w * 0.0168980;",
    "    var v = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362; b[6] = w * 0.115926;",
    "    return v * SCALE.pink;",
    "  }",
    "  this.last = (this.last + 0.02 * w) / 1.02;",
    "  return this.last * SCALE.brown;",
    "};",
    "class NoiseProcessor extends AudioWorkletProcessor {",
    "  constructor(options) { super(); var o = (options && options.processorOptions) || {};",
    "    this.type = o.type || 'none'; this.gens = [new Gen(), new Gen()];",
    "    this.port.onmessage = (e) => { this.type = e.data; }; }",
    "  process(inputs, outputs) {",
    "    var out = outputs[0];",
    "    for (var ch = 0; ch < out.length; ch++) {",
    "      var data = out[ch], g = this.gens[ch % 2];",
    "      if (this.type === 'none') { data.fill(0); continue; }",
    "      for (var i = 0; i < data.length; i++) data[i] = g.next(this.type) * " + NOISE_RMS + ";",
    "    }",
    "    return true;",
    "  }",
    "}",
    "registerProcessor('bts-noise', NoiseProcessor);"
  ].join("\n");

  // Fallback for browsers without AudioWorklet: a long looping buffer with an equal-power
  // crossfade at the loop point (a linear fade would dip the level by 3 dB every loop).
  function makeNoiseBuffer(ctx, type, seconds) {
    var rate = ctx.sampleRate;
    var fade = Math.floor(rate * 2);
    var len = Math.floor(rate * (seconds || NOISE_SECONDS));
    var buffer = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var gen = makeGenerator();
      var raw = new Float32Array(len + fade);
      for (var k = 0; k < raw.length; k++) raw[k] = gen(type) * NOISE_RMS;
      var out = buffer.getChannelData(ch);
      for (var i = 0; i < len; i++) out[i] = raw[i];
      for (var j = 0; j < fade; j++) {
        var t = j / fade;
        out[j] = raw[len + j] * Math.cos(t * Math.PI / 2) + raw[j] * Math.sin(t * Math.PI / 2);
      }
    }
    return buffer;
  }
  function makeGenerator() {
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    return function (type) {
      var w = Math.random() * 2 - 1;
      if (type === "white") return w * NOISE_SCALE.white;
      if (type === "pink") {
        // Paul Kellet's refined pink filter
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        var v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
        return v * NOISE_SCALE.pink;
      }
      // Leaky integrator: brown (red) noise without drifting off to DC
      last = (last + 0.02 * w) / 1.02;
      return last * NOISE_SCALE.brown;
    };
  }

  function workletSource() { return NOISE_WORKLET; }

  // ---------- Audio graph ----------
  // Builds everything except the session envelope: the caller owns engine.master's gain.
  //   tone pair (left osc -> ch 0, right osc -> ch 1) -> pair gain -> beatGain -> master
  //   noise source -> swell -> highpass -> lowpass -> noiseGain -> master
  // Each pair is merged into its own stereo signal and fed straight to beatGain. Feeding a stereo
  // signal into another ChannelMerger input would fold both ears into one channel.
  function createEngine(ctx, destination) {
    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(destination || ctx.destination);

    var beatGain = ctx.createGain();
    beatGain.gain.value = 0;
    beatGain.connect(master);

    function tonePair() {
      var l = ctx.createOscillator(), r = ctx.createOscillator();
      l.type = "sine"; r.type = "sine";
      var stereo = ctx.createChannelMerger(2);
      l.connect(stereo, 0, 0);
      r.connect(stereo, 0, 1);
      var g = ctx.createGain();
      g.gain.value = 0;
      stereo.connect(g);
      g.connect(beatGain);
      l.start(); r.start();
      return { left: l, right: r, gain: g };
    }
    var pair1 = tonePair(), pair2 = tonePair();

    var noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noiseGain.connect(master);
    var lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = NOISE_LOWPASS_HZ;
    lowpass.Q.value = 0.5;
    lowpass.connect(noiseGain);
    // Removes sub-audible rumble wander (mostly in brown noise) that reads as uneven surging.
    var highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = NOISE_HIGHPASS_HZ;
    highpass.Q.value = 0.5;
    highpass.connect(lowpass);
    var swell = ctx.createGain();
    swell.gain.value = 1;
    swell.connect(highpass);
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / SURF_PERIOD_S;
    var lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0;
    lfo.connect(lfoDepth);
    lfoDepth.connect(swell.gain);
    lfo.start();

    return { ctx: ctx, master: master, beatGain: beatGain, noiseGain: noiseGain, swell: swell, lfoDepth: lfoDepth,
      lowpass: lowpass, highpass: highpass, pair1: pair1, pair2: pair2, worklet: null, noiseSrc: null, noiseType: null, noiseCache: {} };
  }

  // Connects a noise AudioWorkletNode created from workletSource(); otherwise buffers are used.
  function attachWorklet(engine, node) {
    node.connect(engine.swell);
    engine.worklet = node;
    engine.noiseType = null;
  }

  // Applies a settings state to the engine (frequencies, levels, filters, noise source).
  // smooth = glide over a quarter second instead of jumping.
  function applySound(engine, state, smooth) {
    var t = engine.ctx.currentTime;
    var tc = smooth ? 0.25 : 0.01;
    var pairs = earFreqs(state);
    // With two pairs, each plays at -3 dB so their combined level matches one pair.
    var w = pairs.length > 1 ? Math.SQRT1_2 : 1;
    setPair(engine.pair1, pairs[0], w, t, tc);
    if (pairs[1]) setPair(engine.pair2, pairs[1], w, t, tc);
    else engine.pair2.gain.gain.setTargetAtTime(0, t, tc);
    var g = levelGains(state);
    engine.beatGain.gain.setTargetAtTime(g.beat, t, tc);
    engine.noiseGain.gain.setTargetAtTime(g.noise, t, tc);
    var surf = state.noise === "surf";
    engine.swell.gain.setTargetAtTime(surf ? 0.6 : 1, t, 0.5);
    engine.lfoDepth.gain.setTargetAtTime(surf ? 0.4 : 0, t, 0.5);
    var lp = state.noiseBand ? state.noiseBand[1] : (surf ? 2500 : NOISE_LOWPASS_HZ);
    var hp = state.noiseBand ? state.noiseBand[0] : NOISE_HIGHPASS_HZ;
    engine.lowpass.frequency.setTargetAtTime(lp, t, 0.5);
    engine.highpass.frequency.setTargetAtTime(hp, t, 0.5);
    setNoiseSource(engine, state.noise);
  }
  function setPair(pair, f, w, t, tc) {
    pair.left.frequency.setTargetAtTime(f.left, t, tc);
    pair.right.frequency.setTargetAtTime(f.right, t, tc);
    pair.gain.gain.setTargetAtTime(w, t, tc);
  }
  function setNoiseSource(engine, type) {
    if (engine.noiseType === type) return;
    var color = type === "surf" ? "pink" : type;
    engine.noiseType = type;
    if (engine.worklet) { engine.worklet.port.postMessage(color); return; }
    if (engine.noiseSrc) {
      try { engine.noiseSrc.stop(); } catch (e) { /* already stopped */ }
      engine.noiseSrc.disconnect();
      engine.noiseSrc = null;
    }
    if (type === "none") return;
    if (!engine.noiseCache[color]) engine.noiseCache[color] = makeNoiseBuffer(engine.ctx, color);
    var src = engine.ctx.createBufferSource();
    src.buffer = engine.noiseCache[color];
    src.loop = true;
    src.connect(engine.swell);
    src.start();
    engine.noiseSrc = src;
  }

  return {
    BANDS: BANDS, PRESETS: PRESETS, NOISE_NAMES: NOISE_NAMES, NOISE_TRIM: NOISE_TRIM, NOISE_RMS: NOISE_RMS,
    NOISE_SCALE: NOISE_SCALE, MAX_OUTPUT: MAX_OUTPUT, NOISE_LOWPASS_HZ: NOISE_LOWPASS_HZ, NOISE_HIGHPASS_HZ: NOISE_HIGHPASS_HZ,
    findPreset: findPreset, presetSettings: presetSettings, bandFor: bandFor, isValidState: isValidState, isCustom: isCustom,
    noiseOffsetDb: noiseOffsetDb, earFreqs: earFreqs, sliderGain: sliderGain, levelGains: levelGains, beatVsNoiseDb: beatVsNoiseDb,
    makeGenerator: makeGenerator, makeNoiseBuffer: makeNoiseBuffer, workletSource: workletSource,
    createEngine: createEngine, attachWorklet: attachWorklet, applySound: applySound
  };
});
