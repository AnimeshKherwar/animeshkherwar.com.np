/* Cricket, Unreasonably Serious — original synthesized audio (Web Audio; no audio files, no licensed audio).
   Mute policy: inside the Lab, every sound obeys the shared Lab mute.
   - Short cues go through LAB.sound(), which the Lab documents as respecting mute.
   - Crowd bed and bat crack are synthesized here ONLY if the Lab's mute state can be read
     (feature-detected; see INTEGRATION.md). If it cannot be read, they stay off and
     LAB.sound() cues are used instead — so the shared mute is never bypassed.
   Standalone (no Lab engine): the game's own Sound setting controls everything. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  var A = CRK.Audio = { ctx: null, crowd: null, enabledSetting: true };

  function lab() { return root.LAB || null; }
  // returns true/false when the Lab's mute state is readable, null when it is not
  A.labMuted = function () {
    var L = lab(); if (!L) return null;
    try {
      if (typeof L.isMuted === 'function') return !!L.isMuted();
      if (typeof L.muted === 'boolean') return L.muted;
    } catch (e) { /* ignore */ }
    return null;
  };
  A.customAllowed = function () {
    if (!A.enabledSetting) return false;
    var L = lab(); if (!L) return true;          // standalone: own setting
    var m = A.labMuted(); return m === false;   // in Lab: only when mute state is known and off
  };
  A.cue = function (name) { // short cues through the shared engine when present
    var L = lab();
    if (L && typeof L.sound === 'function') { if (A.enabledSetting) try { L.sound(name); } catch (e) { } return; }
    if (A.customAllowed()) A.beep(name);
  };
  function ac() {
    if (!A.ctx) { var C = root.AudioContext || root.webkitAudioContext; if (!C) return null; A.ctx = new C(); }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  }
  function noiseBuffer(c, secs) {
    var b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
  }
  A.beep = function (name) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    var f = { click: 660, pop: 880, thud: 140, error: 220, win: 523 }[name] || 440;
    o.frequency.setValueAtTime(f, t); if (name === 'win') o.frequency.linearRampToValueAtTime(f * 1.5, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.32);
  };
  A.bat = function (quality) {
    if (!A.customAllowed()) return A.cue('thud');
    var c = ac(); if (!c) return; var t = c.currentTime;
    var src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.12);
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 + 1600 * quality; bp.Q.value = 3;
    var g = c.createGain(); g.gain.setValueAtTime(0.6 * (0.4 + quality), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(bp).connect(g).connect(c.destination); src.start(t);
    var o = c.createOscillator(), og = c.createGain(); o.frequency.value = 900 + 500 * quality;
    og.gain.setValueAtTime(0.18, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.05); o.connect(og).connect(c.destination); o.start(t); o.stop(t + 0.06);
  };
  A.stumps = function () {
    if (!A.customAllowed()) return A.cue('error');
    var c = ac(); if (!c) return; var t = c.currentTime;
    [0, 0.04, 0.09].forEach(function (d, i) {
      var o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 520 - i * 90;
      g.gain.setValueAtTime(0.16, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.12); o.connect(g).connect(c.destination); o.start(t + d); o.stop(t + d + 0.13);
    });
  };
  A.crowdStart = function () {
    if (A.crowd || !A.customAllowed()) return;
    var c = ac(); if (!c) return;
    var src = c.createBufferSource(); src.buffer = noiseBuffer(c, 3); src.loop = true;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    var g = c.createGain(); g.gain.value = 0.035;
    src.connect(lp).connect(g).connect(c.destination); src.start();
    A.crowd = { src: src, g: g, lp: lp };
  };
  A.cheer = function (amount) {
    if (!A.crowd) { if (amount > 0.7) A.cue('win'); return; }
    var c = A.ctx, t = c.currentTime, g = A.crowd.g.gain, f = A.crowd.lp.frequency;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.035 + 0.16 * amount, t + 0.25); g.linearRampToValueAtTime(0.035, t + 2.4);
    f.cancelScheduledValues(t); f.setValueAtTime(900, t); f.linearRampToValueAtTime(900 + 1800 * amount, t + 0.3); f.linearRampToValueAtTime(900, t + 2.4);
  };
  A.stopAll = function () {
    if (A.crowd) { try { A.crowd.src.stop(); } catch (e) { } A.crowd = null; }
    if (A.ctx && A.ctx.state === 'running') A.ctx.suspend();
  };
  A.sync = function () { if (!A.customAllowed()) { if (A.crowd) { try { A.crowd.src.stop(); } catch (e) { } A.crowd = null; } } };
  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);
