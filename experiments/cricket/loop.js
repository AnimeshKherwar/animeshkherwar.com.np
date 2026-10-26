/* Fixed-timestep loop: simulation at a stable 120 Hz, rendering once per animation frame.
   When paused, no simulation steps run and elapsed time is discarded (no catch-up burst). */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  function Loop(update, render, hz) {
    this.update = update; this.render = render; this.dt = 1 / (hz || 120);
    this.acc = 0; this.last = null; this.paused = false; this.speed = 1; this.raf = 0; this.running = false;
  }
  Loop.prototype.tick = function (nowMs) {
    if (this.last == null) { this.last = nowMs; return 0; }
    var el = Math.min(0.1, (nowMs - this.last) / 1000); this.last = nowMs;
    var n = 0;
    if (!this.paused) {
      this.acc += el * this.speed;
      while (this.acc >= this.dt && n < 60) { this.update(this.dt); this.acc -= this.dt; n++; }
      if (n >= 60) this.acc = 0;
    }
    this.render(this.paused ? 0 : el);
    return n;
  };
  Loop.prototype.pause = function () { this.paused = true; this.acc = 0; };
  Loop.prototype.resume = function () { this.paused = false; this.acc = 0; };
  Loop.prototype.start = function () {
    if (this.running || typeof requestAnimationFrame === 'undefined') return;
    var self = this; this.running = true; this.last = null;
    var f = function (t) { if (!self.running) return; self.tick(t); self.raf = requestAnimationFrame(f); };
    this.raf = requestAnimationFrame(f);
  };
  Loop.prototype.stop = function () { this.running = false; if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.raf); };
  CRK.Loop = Loop;
  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);
