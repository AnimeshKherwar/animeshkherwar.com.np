/* BOC - Cricket controls update - Animesh - 26.10.2026 */
/* Cricket, Unreasonably Serious — 2.5D Canvas renderer (presentation only; reads simulation state). */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  var PITCH = 20.12;

  var THEMES = {
    day:      { name: 'Day', sky: ['#7fb6e6', '#cfe6f5'], g1: '#2f8a3c', g2: '#36994a', out: '#1e5e2a', pitch: '#cbb27a', stand: '#30394a', crowd: ['#e8e1d0', '#d0473b', '#2f6fc2', '#f2c14e'], ball: '#f6f6f2', rope: '#f4f4f4' },
    twilight: { name: 'Twilight', sky: ['#24254d', '#e07a5f'], g1: '#2a7a3a', g2: '#318744', out: '#1b4f27', pitch: '#bfa36d', stand: '#1d2033', crowd: ['#f1dca7', '#e85d75', '#5aa9e6', '#ffd166'], ball: '#f6f6f2', rope: '#ffe08a' },
    night:    { name: 'Floodlights', sky: ['#070b18', '#1a2440'], g1: '#2b8f45', g2: '#33a050', out: '#164a26', pitch: '#d3bb85', stand: '#11141f', crowd: ['#ffffff', '#ff4d6d', '#4dabf7', '#ffd43b'], ball: '#ffffff', rope: '#ff4fa3' },
    monsoon:  { name: 'Monsoon Green', sky: ['#5c6f7c', '#a9b8bf'], g1: '#256f37', g2: '#2b7d3f', out: '#174a25', pitch: '#a99662', stand: '#26303a', crowd: ['#dfe7ea', '#4c9a8a', '#c9a227', '#7d5ba6'], ball: '#f6f6f2', rope: '#e6f2f2' },
    desert:   { name: 'Desert Dusk', sky: ['#3b2a4f', '#f0a35e'], g1: '#3c8a3b', g2: '#449646', out: '#285b26', pitch: '#d9bf86', stand: '#2b2131', crowd: ['#ffe8c2', '#ff7b54', '#6ec6ca', '#ffd56b'], ball: '#f6f6f2', rope: '#ffd56b' }
  };

  var BALL_OUTLINE = '#0b0b0b';
  function ballRadius(scale) { return Math.max(5, 0.036 * scale * 1.8); }

  function Render(canvas, opts) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.opts = opts || {}; this.theme = THEMES.day; this.w = 0; this.h = 0; this.dpr = 1;
    this.cam = this.camFor('delivery'); this.camTo = null; this.camT = 1; this.camFrom = null;
    this.particles = []; this.maxParticles = 60; this.crowd = null; this.shake = 0;
  }
  Render.THEMES = THEMES; Render.ballRadius = ballRadius; Render.BALL_OUTLINE = BALL_OUTLINE;

  Render.prototype.resize = function () {
    var r = this.c.getBoundingClientRect(), mobile = Math.min(r.width, r.height) < 560;
    this.dpr = Math.min(root.devicePixelRatio || 1, mobile ? 1.5 : 2);
    this.maxParticles = mobile ? 28 : 60;
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
    this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Render.prototype.camFor = function (mode, ball) {
    if (mode === 'delivery') return { p: [0, 15.5, 4.4], t: [0, -20.5, 0.6], fov: 31 };
    if (mode === 'bowl') return { p: [0, -33, 4.8], t: [0, 0, 0.6], fov: 32 };
    if (mode === 'top') return { p: [0, -10.5, 150], t: [0, -10, 0], fov: 55 };
    var bx = ball ? ball.x * 0.35 : 0, by = ball ? -10 + (ball.y + 10) * 0.35 : -18;
    return { p: [bx * 0.4, 40, 52], t: [bx, by, 0], fov: 60 };
  };
  Render.prototype.setCamera = function (mode, ball, instant) {
    var target = this.camFor(mode, ball);
    this.mode = mode;
    if (instant || this.opts.reducedMotion) { this.cam = target; this.camTo = null; return; }
    this.camFrom = JSON.parse(JSON.stringify(this.cam)); this.camTo = target; this.camT = 0;
  };
  Render.prototype.followBall = function (ball) {
    if (this.mode !== 'field' || this.camTo) return;
    var t = this.camFor('field', ball), k = 0.06;
    for (var i = 0; i < 3; i++) { this.cam.p[i] += (t.p[i] - this.cam.p[i]) * k; this.cam.t[i] += (t.t[i] - this.cam.t[i]) * k; }
  };

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  Render.prototype.basis = function () {
    var c = this.cam, f = norm(sub(c.t, c.p)), r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
    this.B = { p: c.p, f: f, r: r, u: u, focal: (this.h / 2) / Math.tan(c.fov * Math.PI / 360) };
  };
  Render.prototype.proj = function (x, y, z) {
    var B = this.B, d = [x - B.p[0], y - B.p[1], z - B.p[2]];
    var zc = dot(d, B.f); if (zc < 0.2) return null;
    var s = B.focal / zc;
    return { x: this.w / 2 + dot(d, B.r) * s, y: this.h / 2 - dot(d, B.u) * s, s: s, z: zc };
  };

  Render.prototype.update = function (dt) {
    if (this.camTo) {
      this.camT = Math.min(1, this.camT + dt / 0.65);
      var k = this.camT * this.camT * (3 - 2 * this.camT), a = this.camFrom, b = this.camTo;
      this.cam = { p: a.p.map(function (v, i) { return v + (b.p[i] - v) * k; }), t: a.t.map(function (v, i) { return v + (b.t[i] - v) * k; }), fov: a.fov + (b.fov - a.fov) * k };
      if (this.camT >= 1) this.camTo = null;
    }
    this.particles = this.particles.filter(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 9.8 * dt * p.g; return p.life > 0 && p.z > -0.5; });
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
  };
  Render.prototype.burst = function (x, y, z, n, colors, g) {
    if (this.opts.reducedMotion) n = Math.ceil(n / 4);
    for (var i = 0; i < n && this.particles.length < this.maxParticles; i++) {
      this.particles.push({ x: x, y: y, z: z, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vz: Math.random() * 5 + 1,
        life: 0.7 + Math.random() * 0.6, c: colors[i % colors.length], g: g == null ? 1 : g });
    }
  };

  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.closePath(); }

  Render.prototype.draw = function (S) {
    var ctx = this.ctx, th = this.theme = THEMES[S.theme] || THEMES.day, self = this;
    this.basis();
    var w = this.w, h = this.h;
    ctx.save();
    if (this.shake && !this.opts.reducedMotion) ctx.translate((Math.random() - 0.5) * this.shake * 6, (Math.random() - 0.5) * this.shake * 6);
    var sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(-10, -10, w + 20, h + 20);
    var g = S.ground || { rx: 64, ry: 69 };
    // stands (ring of quads)
    var N = 48, ringIn = [], ringOut = [];
    for (var i = 0; i <= N; i++) {
      var a = i / N * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
      ringIn.push([cx * (g.rx + 6), -10.06 + cy * (g.ry + 6), 0]); ringOut.push([cx * (g.rx + 34), -10.06 + cy * (g.ry + 34), 22]);
    }
    if (!this.crowd) { this.crowd = []; for (var k = 0; k < 420; k++) this.crowd.push({ a: Math.random() * Math.PI * 2, r: 8 + Math.random() * 25, c: Math.floor(Math.random() * 4), ph: Math.random() * 6 }); }
    for (i = 0; i < N; i++) {
      var q = [this.proj.apply(this, ringIn[i]), this.proj.apply(this, ringIn[i + 1]), this.proj.apply(this, ringOut[i + 1]), this.proj.apply(this, ringOut[i])];
      if (q.some(function (p) { return !p; })) continue;
      ctx.fillStyle = i % 2 ? th.stand : shade(th.stand, 10); poly(ctx, q); ctx.fill();
    }
    var tnow = S.time || 0;
    this.crowd.forEach(function (m) {
      var cx = Math.cos(m.a), cy = Math.sin(m.a), rr = m.r, zz = rr / 28 * 22 * 0.95;
      var p = self.proj(cx * (g.rx + 6 + rr), -10.06 + cy * (g.ry + 6 + rr), zz + Math.max(0, Math.sin(tnow * 6 + m.ph)) * (S.cheer || 0) * 0.8);
      if (!p || p.s < 0.6) return;
      ctx.fillStyle = th.crowd[m.c]; ctx.fillRect(p.x - 1, p.y - 1, Math.max(1.5, p.s * 0.45), Math.max(1.5, p.s * 0.45));
    });
    // ground: outfield + stripes clipped to the boundary
    var bnd = [];
    for (i = 0; i < 72; i++) { a = i / 72 * Math.PI * 2; var pp = this.proj(Math.cos(a) * (g.rx + 5), -10.06 + Math.sin(a) * (g.ry + 5), 0); if (pp) bnd.push(pp); }
    ctx.fillStyle = th.out; if (bnd.length > 3) { poly(ctx, bnd); ctx.fill(); }
    var rope = [];
    for (i = 0; i < 96; i++) { a = i / 96 * Math.PI * 2; pp = this.proj(Math.cos(a) * g.rx, -10.06 + Math.sin(a) * g.ry, 0); if (pp) rope.push(pp); }
    ctx.save(); if (rope.length > 3) { poly(ctx, rope); ctx.clip(); }
    ctx.fillStyle = th.g1; ctx.fillRect(0, 0, w, h);
    for (var sI = -8; sI < 8; sI += 2) {
      var y0 = -10.06 + sI * 9, y1 = y0 + 9;
      var qq = [this.proj(-90, y0, 0), this.proj(90, y0, 0), this.proj(90, y1, 0), this.proj(-90, y1, 0)];
      if (qq.every(Boolean)) { ctx.fillStyle = th.g2; poly(ctx, qq); ctx.fill(); }
    }
    // 30-yard circle (dashed)
    ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
    var first = true;
    for (i = 0; i <= 80; i++) {
      var ang = i / 80 * Math.PI * 2, px = Math.cos(ang) * 27.43, py = Math.sin(ang) * 27.43;
      py += py > 0 ? 0 : -PITCH; var pr = this.proj(px, py, 0);
      if (!pr) { first = true; continue; } if (first) { ctx.moveTo(pr.x, pr.y); first = false; } else ctx.lineTo(pr.x, pr.y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.strokeStyle = th.rope; ctx.lineWidth = 3; if (rope.length > 3) { poly(ctx, rope); ctx.stroke(); }
    // pitch
    var pq = [this.proj(-1.52, 1.4, 0), this.proj(1.52, 1.4, 0), this.proj(1.52, -21.5, 0), this.proj(-1.52, -21.5, 0)];
    if (pq.every(Boolean)) { ctx.fillStyle = th.pitch; poly(ctx, pq); ctx.fill(); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    [[0, -1.22], [-PITCH, -PITCH + 1.22]].forEach(function (e) {
      self.line(-1.32, e[0], 0, 1.32, e[0], 0); self.line(-1.83, e[1], 0, 1.83, e[1], 0);
      self.line(-1.32, e[0], 0, -1.32, e[1], 0); self.line(1.32, e[0], 0, 1.32, e[1], 0);
    });
    // bowl target / aim guides / bounce cue
    if (S.bowlTarget) this.target(S.bowlTarget.x, -S.bowlTarget.len, S.bowlTarget.c || '#ffd84d');
    if (S.bounceCue) this.ring(S.bounceCue.x, S.bounceCue.y, 0.22, 'rgba(255,255,255,0.55)');
    if (S.aim != null && S.offSign) {
      var d = { x: S.offSign * Math.sin(S.aim * Math.PI / 180), y: -Math.cos(S.aim * Math.PI / 180) };
      ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,230,90,0.85)'; ctx.lineWidth = 3;
      this.line(d.x * 2, d.y * 2 - 0.8, 0.02, d.x * 26, d.y * 26 - 0.8, 0.02); ctx.setLineDash([]);
      var tip = this.proj(d.x * 26, d.y * 26 - 0.8, 0.02); if (tip) { ctx.fillStyle = 'rgba(255,230,90,0.95)'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 6, 0, 7); ctx.fill(); }
    }
    // entities sorted far → near
    var ents = [];
    (S.stumps || [[0, 0], [0, -PITCH]]).forEach(function (st, idx) { ents.push({ k: 'stumps', x: st[0], y: st[1], broken: S.broken && S.broken[idx] }); });
    (S.people || []).forEach(function (p) { ents.push(Object.assign({ k: 'person' }, p)); });
    if (S.ball && S.ball.visible !== false) ents.push({ k: 'ball', x: S.ball.x, y: S.ball.y, z: S.ball.z });
    ents.forEach(function (e) { var p = self.proj(e.x, e.y, e.z || 0); e.depth = p ? p.z : -1; });
    ents.sort(function (a, b) { return b.depth - a.depth; });
    // ball shadow and trail first (on ground)
    if (S.ball && S.ball.visible !== false) {
      var sh = this.proj(S.ball.x, S.ball.y, 0);
      if (sh) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, Math.max(4, sh.s * 0.07), Math.max(2, sh.s * 0.035), 0, 0, 7); ctx.fill(); }
      if (S.trail && S.trail.length > 1 && !this.opts.reducedMotion) {
        for (i = 1; i < S.trail.length; i++) {
          var p1 = this.proj(S.trail[i - 1].x, S.trail[i - 1].y, S.trail[i - 1].z), p2 = this.proj(S.trail[i].x, S.trail[i].y, S.trail[i].z);
          if (!p1 || !p2) continue; ctx.strokeStyle = 'rgba(255,255,255,' + (i / S.trail.length * 0.5).toFixed(2) + ')'; ctx.lineWidth = Math.max(2, ballRadius(p2.s) * 0.9);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
    }
    ents.forEach(function (e) {
      if (e.depth < 0) return;
      if (e.k === 'stumps') self.stumps(e.x, e.y, e.broken);
      else if (e.k === 'person') self.person(e);
      else self.ball(e.x, e.y, e.z, S.ballColor || th.ball);
    });
    // particles
    this.particles.forEach(function (p) { var pr = self.proj(p.x, p.y, p.z); if (!pr) return; ctx.fillStyle = p.c; ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillRect(pr.x - 2, pr.y - 2, Math.max(2, pr.s * 0.1), Math.max(2, pr.s * 0.1)); });
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  Render.prototype.line = function (x1, y1, z1, x2, y2, z2) {
    var a = this.proj(x1, y1, z1), b = this.proj(x2, y2, z2); if (!a || !b) return;
    this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
  };
  Render.prototype.ring = function (x, y, r, col) {
    var ctx = this.ctx; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i <= 24; i++) { var a = i / 24 * Math.PI * 2, p = this.proj(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.01); if (!p) return; if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
    ctx.stroke();
  };
  Render.prototype.target = function (x, y, col) {
    this.ring(x, y, 0.3, col); this.ring(x, y, 0.12, col);
    var ctx = this.ctx; ctx.strokeStyle = col; ctx.lineWidth = 1.5; this.line(x - 0.45, y, 0.01, x + 0.45, y, 0.01); this.line(x, y - 0.45, 0.01, x, y + 0.45, 0.01);
  };
  Render.prototype.stumps = function (x, y, broken) {
    var ctx = this.ctx; ctx.lineCap = 'round';
    [-0.114, 0, 0.114].forEach(function (dx, i) {
      var lean = broken ? (i - 1) * 0.18 + 0.05 : 0;
      var a = this.proj(x + dx, y, 0), b = this.proj(x + dx + lean, y + (broken ? 0.12 : 0), 0.711 - (broken ? 0.06 : 0));
      if (!a || !b) return; ctx.strokeStyle = '#f3ead6'; ctx.lineWidth = Math.max(2, a.s * 0.04);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#7a1d1d'; ctx.lineWidth = Math.max(1, a.s * 0.012); ctx.stroke();
    }, this);
    if (!broken) { ctx.strokeStyle = '#f3ead6'; ctx.lineWidth = 2; this.line(x - 0.12, y, 0.72, x + 0.12, y, 0.72); }
  };
  Render.prototype.ball = function (x, y, z, col) {
    var p = this.proj(x, y, z); if (!p) return;
    var r = (this.mode === 'field' || this.mode === 'top') ? Math.max(2.4, Math.min(3.5, p.s * 0.06)) : ballRadius(p.s), ctx = this.ctx;
    ctx.fillStyle = col; ctx.strokeStyle = BALL_OUTLINE; ctx.lineWidth = Math.max(1.5, r * 0.28);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = col === '#f6f6f2' || col === '#ffffff' ? 'rgba(180,30,30,0.8)' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.55, -0.6, 0.9); ctx.stroke();
  };
  /* stylised player: legs, torso, head, arms; batter carries a bat with swing pose */
  Render.prototype.person = function (e) {
    var ctx = this.ctx, feet = this.proj(e.x, e.y, 0), hip = this.proj(e.x, e.y, 0.95), sh = this.proj(e.x, e.y, 1.48), hd = this.proj(e.x, e.y, 1.68);
    if (!feet || !hip || !sh || !hd) return;
    var s = feet.s, lw = Math.max(2, s * 0.13), ph = (e.anim || 0) * 2.2;
    var stride = e.moving ? Math.sin(ph) * s * 0.22 : s * 0.08;
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(feet.x, feet.y, s * 0.35, s * 0.12, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = e.pads ? '#f2f2ee' : (e.c2 || '#20242c'); ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(feet.x - stride, feet.y); ctx.moveTo(hip.x, hip.y); ctx.lineTo(feet.x + stride, feet.y); ctx.stroke();
    ctx.strokeStyle = e.c1 || '#2266cc'; ctx.lineWidth = Math.max(3, s * 0.36);
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(sh.x, sh.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(hip.x - s * 0.1, hip.y - s * 0.12); ctx.lineTo(sh.x - s * 0.1, sh.y); ctx.stroke();
    // arms
    ctx.strokeStyle = e.c1 || '#2266cc'; ctx.lineWidth = Math.max(2, s * 0.1);
    var armA = e.armAngle == null ? 0.4 : e.armAngle;
    var hx = sh.x + Math.sin(armA) * s * 0.55, hy = sh.y + Math.cos(armA) * s * 0.55;
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(hx, hy); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - Math.sin(armA) * s * 0.4, sh.y + s * 0.45); ctx.stroke();
    // head + cap/helmet
    ctx.fillStyle = '#c99a72'; ctx.beginPath(); ctx.arc(hd.x, hd.y, Math.max(2.5, s * 0.12), 0, 7); ctx.fill();
    ctx.fillStyle = e.helmet ? '#15171c' : (e.c1 || '#2266cc');
    ctx.beginPath(); ctx.arc(hd.x, hd.y - s * 0.03, Math.max(2.5, s * 0.125), Math.PI, 0); ctx.fill();
    if (e.bat) { // bat from hands, angle by swing phase
      var ba = e.batAngle == null ? 2.6 : e.batAngle, L = s * 0.86;
      ctx.strokeStyle = '#e4cf9a'; ctx.lineWidth = Math.max(3, s * 0.1);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.sin(ba) * L, hy + Math.cos(ba) * L); ctx.stroke();
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    }
    if (e.gloves) { ctx.fillStyle = '#f2f2ee'; ctx.beginPath(); ctx.arc(hx, hy, Math.max(2, s * 0.07), 0, 7); ctx.fill(); }
    if (e.label) {
      ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; var tw = ctx.measureText(e.label).width + 8; ctx.fillRect(hd.x - tw / 2, hd.y - s * 0.3 - 16, tw, 15);
      ctx.fillStyle = '#fff'; ctx.fillText(e.label, hd.x, hd.y - s * 0.3 - 5);
    }
    if (e.ring) { ctx.strokeStyle = e.ring; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(feet.x, feet.y, s * 0.6, s * 0.22, 0, 0, 7); ctx.stroke(); }
  };
  // screen → ground (z=0) for touch placement
  Render.prototype.unproject = function (sx, sy) {
    this.basis(); var B = this.B;
    var dx = (sx - this.w / 2) / B.focal, dy = -(sy - this.h / 2) / B.focal;
    var dir = [B.f[0] + B.r[0] * dx + B.u[0] * dy, B.f[1] + B.r[1] * dx + B.u[1] * dy, B.f[2] + B.r[2] * dx + B.u[2] * dy];
    if (dir[2] >= -1e-6) return null; var t = -B.p[2] / dir[2];
    return { x: B.p[0] + dir[0] * t, y: B.p[1] + dir[1] * t };
  };

  CRK.Render = Render;
  if (typeof module !== 'undefined') module.exports = { Render: Render };
})(typeof window !== 'undefined' ? window : globalThis);

/* EOC - Cricket controls update - Animesh - 26.10.2026 */