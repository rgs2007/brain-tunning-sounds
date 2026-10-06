// Browser tests: render the real Web Audio graph with OfflineAudioContext and inspect each channel.
// Results are written to window.__testResults for the headless runner (tests/run-browser-tests.mjs).
(function () {
  "use strict";
  var BT = window.BrainTuning;
  var RATE = 48000;
  var tests = [];
  function test(name, fn) { tests.push({ name: name, fn: fn }); }
  function assert(cond, msg) { if (!cond) throw new Error(msg); }

  // Renders `seconds` of audio for a settings state. Master gain is fixed at 1 so levels are raw.
  async function render(state, seconds) {
    var ctx = new OfflineAudioContext(2, Math.round(RATE * seconds), RATE);
    var engine = BT.createEngine(ctx);
    engine.master.gain.value = 1;
    BT.applySound(engine, state, false);
    var buf = await ctx.startRendering();
    return [buf.getChannelData(0), buf.getChannelData(1)];
  }
  // Magnitude of one frequency (Goertzel with a Hann window), skipping the first `skip` seconds.
  function magnitude(data, freq, skip) {
    var start = Math.round(RATE * skip), n = data.length - start;
    var k = 2 * Math.cos(2 * Math.PI * freq / RATE), s1 = 0, s2 = 0;
    for (var i = 0; i < n; i++) {
      var w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
      var s0 = data[start + i] * w + k * s1 - s2;
      s2 = s1; s1 = s0;
    }
    return Math.sqrt(s1 * s1 + s2 * s2 - k * s1 * s2) / n;
  }
  function rms(data, from, to) {
    var a = Math.round(RATE * from), b = to ? Math.round(RATE * to) : data.length, sum = 0;
    for (var i = a; i < b; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / (b - a));
  }
  function peak(data) { var p = 0; for (var i = 0; i < data.length; i++) p = Math.max(p, Math.abs(data[i])); return p; }
  function db(x) { return 20 * Math.log10(x); }
  function tonesOnly(id) { return Object.assign(BT.presetSettings(id), { noise: "none", noiseBand: null }); }

  // The bug this guards against: both tones ending up in one ear, which kills the binaural beat.
  BT.PRESETS.forEach(function (p) {
    test(p.name + ": each ear gets only its own tone", async function () {
      var state = tonesOnly(p.id);
      var ch = await render(state, 2);
      BT.earFreqs(state).forEach(function (pair, i) {
        var lInL = magnitude(ch[0], pair.left, 0.3), lInR = magnitude(ch[1], pair.left, 0.3);
        var rInR = magnitude(ch[1], pair.right, 0.3), rInL = magnitude(ch[0], pair.right, 0.3);
        assert(lInL > 0.005, "pair " + i + ": left tone " + pair.left + " Hz missing from the left ear");
        assert(rInR > 0.005, "pair " + i + ": right tone " + pair.right + " Hz missing from the right ear");
        assert(db(lInL / lInR) > 30, "pair " + i + ": left tone leaks into the right ear (" + db(lInL / lInR).toFixed(1) + " dB separation)");
        assert(db(rInR / rInL) > 30, "pair " + i + ": right tone leaks into the left ear (" + db(rInR / rInL).toFixed(1) + " dB separation)");
      });
    });
  });

  test("both ears play at the same level", async function () {
    var ch = await render(tonesOnly("relax"), 1.5);
    var l = rms(ch[0], 0.3), r = rms(ch[1], 0.3);
    assert(l > 0.01 && r > 0.01, "an ear is silent (L " + l.toFixed(4) + ", R " + r.toFixed(4) + ")");
    assert(Math.abs(db(l / r)) < 0.5, "ears differ by " + db(l / r).toFixed(2) + " dB");
  });

  test("noise reaches both ears, independent and steady", async function () {
    var state = Object.assign(BT.presetSettings("relax"), { beatVol: 0 });
    var ch = await render(state, 6);
    var l = rms(ch[0], 1), r = rms(ch[1], 1);
    assert(l > 0.01 && r > 0.01, "noise missing in an ear (L " + l.toFixed(4) + ", R " + r.toFixed(4) + ")");
    assert(Math.abs(db(l / r)) < 1, "noise level differs between ears by " + db(l / r).toFixed(2) + " dB");
    var start = RATE, sxy = 0, sxx = 0, syy = 0;
    for (var i = start; i < ch[0].length; i++) { sxy += ch[0][i] * ch[1][i]; sxx += ch[0][i] * ch[0][i]; syy += ch[1][i] * ch[1][i]; }
    var corr = sxy / Math.sqrt(sxx * syy);
    assert(Math.abs(corr) < 0.1, "left and right noise are correlated (r = " + corr.toFixed(3) + ")");
    var levels = [];
    for (var t = 1; t + 0.5 <= 6; t += 0.5) levels.push(db(rms(ch[0], t, t + 0.5)));
    var spread = Math.max.apply(null, levels) - Math.min.apply(null, levels);
    assert(spread < 2, "noise level varies by " + spread.toFixed(2) + " dB");
  });

  test("no preset clips at full volume", async function () {
    for (var i = 0; i < BT.PRESETS.length; i++) {
      var p = BT.PRESETS[i];
      var state = BT.presetSettings(p.id);
      var ch = await render(state, 3);
      var pk = Math.max(peak(ch[0]), peak(ch[1])) * BT.MAX_OUTPUT;
      assert(pk < 1, p.name + " peaks at " + pk.toFixed(3));
    }
  });

  test("silent tones when beat volume is zero", async function () {
    var state = Object.assign(tonesOnly("relax"), { beatVol: 0 });
    var ch = await render(state, 1);
    assert(peak(ch[0]) < 1e-4 && peak(ch[1]) < 1e-4, "tones still audible at 0%");
  });

  async function run() {
    var results = [];
    for (var i = 0; i < tests.length; i++) {
      try { await tests[i].fn(); results.push({ name: tests[i].name, ok: true }); }
      catch (e) { results.push({ name: tests[i].name, ok: false, error: e.message }); }
    }
    var out = document.getElementById("out");
    out.innerHTML = "";
    results.forEach(function (r) {
      var line = document.createElement("div");
      line.className = r.ok ? "pass" : "fail";
      line.textContent = (r.ok ? "PASS  " : "FAIL  ") + r.name + (r.error ? "  —  " + r.error : "");
      out.appendChild(line);
    });
    window.__testResults = results;
  }
  run();
})();
