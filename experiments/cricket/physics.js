/* BOC - Cricket controls update - Animesh - 26.10.2026 */
/* Cricket, Unreasonably Serious — ball, fielding and running simulation (DOM-free).
   World metres: striker's stumps at (0,0,0), bowler's stumps at (0,-20.12,0), z up.
   Field angle θ (deg) is measured at the striker: 0 = straight back past the bowler,
   positive = towards the batter's OFF side, ±180 = directly behind the keeper.
   Outcomes are produced by the simulation: delivery → contact → flight/bounce →
   fielders → catch/pickup → throw → running. Nothing is pre-decided. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  var G = 9.81, PITCH = 20.12, CREASE = 1.22, STUMP_HALF = 0.1143 + 0.036, STUMP_H = 0.711;
  var CENTER_Y = -PITCH / 2;
  var P = CRK.Physics = { PITCH: PITCH, CREASE: CREASE, CENTER_Y: CENTER_Y, STUMP_H: STUMP_H, DT: 1 / 120 };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  P.clamp = clamp;

  /* ---------- ground geometry ---------- */
  P.ground = function (theme) { return { rx: 64, ry: 69 }; };
  P.outside = function (g, x, y) { var a = x / g.rx, b = (y - CENTER_Y) / g.ry; return a * a + b * b >= 1; };
  P.boundaryDistAt = function (g, thetaDeg, offSign) { // distance from striker to rope along θ
    var d = P.dirVec(thetaDeg, offSign), lo = 0, hi = 200;
    for (var i = 0; i < 30; i++) { var m = (lo + hi) / 2; if (P.outside(g, d.x * m, d.y * m)) hi = m; else lo = m; }
    return lo;
  };
  P.insideCircle = function (x, y) { // 30-yard (27.43 m) fielding circle: two semicircles + rectangle
    var R = 27.43;
    if (y <= 0 && y >= -PITCH) return Math.abs(x) <= R;
    var cy = y > 0 ? 0 : -PITCH; return hyp(x, y - cy) <= R;
  };
  P.dirVec = function (thetaDeg, offSign) {
    var t = thetaDeg * Math.PI / 180; return { x: offSign * Math.sin(t), y: -Math.cos(t) };
  };
  P.angleOf = function (x, y, offSign) { return Math.atan2(x * offSign, -y) * 180 / Math.PI; };
  P.offSign = function (batHand) { return batHand === 'L' ? 1 : -1; };

  /* ---------- fields ---------- */
  // [θ, distance from striker]; mirrored for left-handers automatically by offSign
  var PRESETS = {
    attacking:  { label: 'Attacking', pos: [[166, 17], [158, 18.5], [134, 19], [92, 22], [58, 24], [18, 25], [-20, 25], [-92, 21], [-158, 58]] },
    powerplay:  { label: 'Powerplay', pos: [[162, 17.5], [96, 22], [62, 24], [20, 25], [-20, 25], [-55, 24], [-100, 22], [150, 60], [-156, 60]] },
    balanced:   { label: 'Balanced', pos: [[22, 25], [-22, 25], [66, 24], [96, 22], [-96, 22], [150, 61], [-156, 60], [-55, 64], [16, 73]] },
    defensive:  { label: 'Death / defensive', pos: [[14, 72], [-14, 72], [-55, 65], [-96, 62], [62, 63], [84, 24], [-28, 24], [140, 25], [-150, 25]] },
    spin:       { label: 'Spin — ring', pos: [[150, 7], [96, 20], [60, 24], [18, 25], [-20, 25], [-55, 24], [-92, 20], [-150, 58], [24, 70]] }
  };
  P.PRESETS = PRESETS;

  // returns fielders array [{role, x, y, id}] ; index 0 keeper, 1 bowler
  P.buildField = function (presetKey, offSign, keeperUp, custom) {
    var list = (custom && custom.length === 9) ? custom : PRESETS[presetKey].pos;
    var out = [{ role: 'keeper', x: 0, y: keeperUp ? 1.0 : 13.5 }, { role: 'bowler', x: 0.6 * -offSign, y: -16.5 }];
    list.forEach(function (p) { var d = P.dirVec(p[0], offSign); out.push({ role: 'field', x: d.x * p[1], y: d.y * p[1], th: p[0], r: p[1] }); });
    return out;
  };
  P.countOutside = function (field) {
    return field.filter(function (f) { return f.role === 'field' && !P.insideCircle(f.x, f.y); }).length;
  };
  // pull the deepest fielders inside the ring until the restriction is met
  P.enforceRestriction = function (field, maxOut) {
    var outs = field.filter(function (f) { return f.role === 'field' && !P.insideCircle(f.x, f.y); });
    outs.sort(function (a, b) { return hyp(b.x, b.y) - hyp(a.x, a.y); });
    while (outs.length > maxOut) { var f = outs.shift(); var d = hyp(f.x, f.y); f.x *= 24 / d; f.y *= 24 / d; f.r = 24; }
    return field;
  };

  /* ---------- delivery types by verified bowling style ---------- */
  var STYLE = {
    RF: 'pace', LF: 'pace', RFM: 'pace', LFM: 'pace', RM: 'medium', LM: 'medium',
    OB: 'finger', SLA: 'finger', LB: 'wrist', LWS: 'wrist'
  };
  P.styleClass = function (bowl) { return STYLE[bowl] || 'medium'; };
  P.deliveryTypes = function (bowl) {
    var c = P.styleClass(bowl);
    if (c === 'pace') return ['stock', 'outswing', 'inswing', 'yorker', 'bouncer', 'slower'];
    if (c === 'medium') return ['stock', 'outswing', 'inswing', 'cutter', 'slower', 'yorker'];
    if (c === 'finger') return ['stock', 'flighted', 'arm', 'quicker'];
    return ['stock', 'googly', 'topspin', 'quicker'];
  };
  P.TYPE_LABEL = { stock: 'Stock', outswing: 'Away swing', inswing: 'Into batter', yorker: 'Yorker', bouncer: 'Bouncer',
    slower: 'Slower ball', cutter: 'Cutter', flighted: 'Flighted', arm: 'Arm ball', quicker: 'Quicker', googly: 'Googly', topspin: 'Top-spinner' };

  function baseSpeed(bowl) { // m/s
    return { RF: 39.5, LF: 39, RFM: 36.5, LFM: 36, RM: 33, LM: 32.5, OB: 23.5, SLA: 23.5, LB: 22.5, LWS: 22.5 }[bowl] || 32;
  }
  P.kmh = function (ms) { return Math.round(ms * 3.6); };

  /* spec: {bowl (style code), type, line (x at crease, world), length (m before striker's stumps),
            err (release error -1..1), batHand, rating 0..1} → full delivery plan */
  P.planDelivery = function (spec, rng) {
    var bowl = spec.bowl || 'RM', cls = P.styleClass(bowl), offSign = P.offSign(spec.batHand);
    var v = baseSpeed(bowl), swing = 0, dev = 0, line = spec.line, len = spec.length;
    var e = spec.err || 0, ae = Math.abs(e), sk = spec.rating == null ? 0.7 : spec.rating;
    var spinSign = (bowl === 'OB' || bowl === 'LWS') ? 1 : -1; // world x direction of stock turn
    switch (spec.type) {
      case 'outswing': swing = offSign * (2.6 + 1.6 * sk); v *= 0.98; break;
      case 'inswing': swing = -offSign * (2.4 + 1.5 * sk); v *= 0.98; break;
      case 'yorker': v *= 1.01; break;
      case 'bouncer': v *= 1.02; break;
      case 'slower': v *= 0.78; break;
      case 'cutter': v *= 0.86; dev = (rng.next() < 0.5 ? 1 : -1) * 0.9; break;
      case 'flighted': v *= 0.88; dev = spinSign * (2.3 + 1.0 * sk); break;
      case 'arm': v *= 1.04; dev = spinSign * -0.25; swing = spinSign * -0.8; break;
      case 'quicker': v *= 1.13; dev = spinSign * 0.9; break;
      case 'googly': dev = -spinSign * (1.7 + 0.8 * sk); break;
      case 'topspin': dev = spinSign * 0.3; break;
      default: if (cls === 'finger' || cls === 'wrist') dev = spinSign * (1.8 + 0.9 * sk);
               else dev = (rng.next() - 0.5) * 0.7 * (0.5 + sk);
    }
    // BOC - Delivery speed - Animesh - 26.10.2026
    v *= clamp(spec.speed == null ? 1 : spec.speed, 0.7, 1.15);
    // EOC - Delivery speed - Animesh - 26.10.2026
    // release error: fair, proportional scatter (skill reduces it)
    var spread = 1.25 - 0.55 * sk;
    line += e * 0.42 * spread + rng.normal() * 0.035 * spread;
    len += e * 2.1 * spread * (rng.next() < 0.5 ? 1 : -1) + rng.normal() * 0.25 * spread;
    len = clamp(len, -0.6, 14.5);
    v *= 1 - ae * 0.05;
    var noBallStep = ae > 0.92;
    var armX = (bowl.charAt(0) === 'L' || bowl === 'SLA' || bowl === 'LWS') ? -0.32 : 0.32;
    var p0 = { x: armX, y: -PITCH + 1.6, z: 2.15 + (cls === 'finger' || cls === 'wrist' ? -0.1 : 0) };
    var fullToss = len < 0.35;
    var plan = { bowl: bowl, type: spec.type, v: v, swing: swing, dev: dev, line: line, len: len, p0: p0,
      noBallStep: noBallStep, fullToss: fullToss, err: e, offSign: offSign };
    plan.samples = sampleDelivery(plan);
    return plan;
  };

  function sampleDelivery(pl) {
    var out = [], dt = 1 / 240, p0 = pl.p0, vy = pl.v, ax = pl.swing;
    var bounceY = -pl.len, t1, vz, vx, x, y, z;
    if (pl.fullToss) { // dips onto the batter without pitching
      var targetZ = 0.45 + (0.35 - pl.len) * 1.0; t1 = (0 - p0.y) / vy;
      vz = (targetZ - p0.z + 0.5 * G * t1 * t1) / t1;
      vx = (pl.line - p0.x - 0.5 * ax * t1 * t1) / t1;
    } else {
      t1 = (bounceY - p0.y) / vy;
      vz = (0 - p0.z + 0.5 * G * t1 * t1) / t1;
      var t2 = pl.len / (vy * 0.88);
      vx = (pl.line - p0.x - 0.5 * ax * t1 * t1 - (ax * t1 + pl.dev) * t2) / (t1 + t2);
    }
    x = p0.x; y = p0.y; z = p0.z;
    var bounced = false, t = 0;
    while (t < 2.5 && y < 18) {
      out.push({ t: t, x: x, y: y, z: z, b: bounced });
      if (!bounced) vx += ax * dt;
      vz -= G * dt; x += vx * dt; y += vy * dt; z += vz * dt;
      if (z <= 0 && !bounced) { z = 0; vz = -vz * 0.52; vy *= 0.88; vx += pl.dev; bounced = true; pl.bounce = { x: x, y: y }; }
      else if (z <= 0) { z = 0; vz = -vz * 0.4; vy *= 0.8; vx *= 0.8; }
      t += dt;
    }
    pl.vAfter = { x: vx, y: vy };
    return out;
  }
  P.sampleAtY = function (samples, y) {
    for (var i = 1; i < samples.length; i++) if (samples[i].y >= y) {
      var a = samples[i - 1], b = samples[i], k = (y - a.y) / (b.y - a.y || 1e-9);
      return { t: a.t + (b.t - a.t) * k, x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, b: b.b, i: i };
    }
    return null;
  };
  P.sampleAtT = function (samples, t) {
    var i = Math.min(samples.length - 1, Math.max(0, Math.floor(t * 240)));
    return samples[i];
  };

  /* ---------- the live play ---------- */
  var RUNUP = 0.85, SWING_LAG = 0.18;
  P.SWING_LAG = SWING_LAG; P.RUNUP = RUNUP;

  // ctx: {striker, non, bowler (player objects with bat, bt, fd, rs), field:[...], fmt:{limited, bouncersPerOver},
  //       overBouncers, freeHit, keeperUp, humanBat, humanBowl, assistedRun, assistedTiming, difficulty, ground}
  P.createPlay = function (ctx, plan, rng) {
    var offSign = P.offSign(ctx.striker.bat);
    var cy = plan.len >= 7 ? -0.25 : -0.85;
    var at = P.sampleAtY(plan.samples, cy) || P.sampleAtY(plan.samples, 0);
    var crease = P.sampleAtY(plan.samples, 0);
    var play = {
      t: 0, phase: 'runup', plan: plan, ctx: ctx, offSign: offSign, rng: rng,
      contactY: cy, ta: RUNUP + at.t, atContact: at, atCrease: crease,
      batX: -offSign * 0.32, shot: null, contact: null,
      ball: { x: plan.p0.x, y: plan.p0.y, z: plan.p0.z, vx: 0, vy: 0, vz: 0, bounced: false, live: false, held: -1 },
      fielders: ctx.field.map(function (f) { return { role: f.role, x: f.x, y: f.y, hx: f.x, hy: f.y, fd: f.fd || 0.7, id: f.id, act: 'idle', anim: 0 }; }),
      run: { done: 0, active: false, p: 0, dir: 1, T: 2.75 - 0.4 * (((ctx.striker.rs || 0.6) + (ctx.non.rs || 0.6)) / 2), returning: false, waited: 0 },
      events: [], trail: [], done: false, result: null, extra: null, wicket: null, boundary: 0,
      padHit: false, maxDist: 0, chaser: -1, traj: null, throwing: null, deadTimer: -1,
      callTimer: 0, catchTried: {}, swingT: -1, shotName: '', quality: 0, timingLabel: '', stumpOut: false
    };
    // umpire calls at the crease (deterministic from the delivery path)
    var bouncer = !plan.fullToss && crease && crease.z > 1.25;
    play.bouncer = bouncer;
    play.nb = plan.noBallStep || (plan.fullToss && crease && crease.z > 1.05) ||
      (ctx.fmt.limited && bouncer && (ctx.overBouncers || 0) >= ctx.fmt.bouncersPerOver);
    play.nbReason = plan.noBallStep ? 'overstep' : (plan.fullToss && crease && crease.z > 1.05) ? 'above waist' : play.nb ? 'bouncer limit' : '';
    return play;
  };

  /* Shot input. kind: 'ground'|'loft'|'defend'|'leave'; angle in field θ. */
  P.inputShot = function (play, kind, angle) {
    if (play.shot || play.phase === 'live' || play.done) return false;
    play.shot = { kind: kind, angle: angle, t: play.t };
    play.swingT = play.t;
    return true;
  };
  P.inputRun = function (play) {
    var r = play.run; if (!play.ball.live || play.done || play.wicket) return;
    if (!r.active) { r.active = true; r.p = 0; r.dir = 1; r.returning = false; play.events.push({ e: 'run' }); }
    else if (r.dir < 0) { r.dir = 1; r.returning = false; }
  };
  P.inputReturn = function (play) {
    var r = play.run; if (!r.active || r.dir < 0) return;
    if (r.p < 0.62) { r.dir = -1; r.returning = true; play.events.push({ e: 'return' }); }
  };

  function shotName(kind, theta, len, cls) {
    var a = Math.abs(theta), off = theta > 0;
    if (kind === 'defend') return len >= 7 ? 'back-foot defence' : 'forward defence';
    if (kind === 'leave') return 'leave';
    if ((cls === 'finger' || cls === 'wrist') && !off && a > 55 && len < 6.5) return kind === 'loft' ? 'slog sweep' : 'sweep';
    if (a < 30) return len >= 7 ? 'back-foot punch' : (kind === 'loft' ? 'lofted straight drive' : 'straight drive');
    if (off && a < 75) return len >= 7.5 ? 'cut' : (kind === 'loft' ? 'lofted cover drive' : 'cover drive');
    if (off && a <= 120) return len >= 6 ? 'square cut' : 'square drive';
    if (off) return 'late cut';
    if (a < 75) return len >= 7 ? 'pull' : 'on drive';
    if (a <= 120) return len >= 6.5 ? 'pull' : 'flick';
    return len >= 7 ? 'hook' : 'glance';
  }
  // how suitable a shot is for the delivery (0.35..1)
  function suitability(name, len, xOff, z) {
    var s = 1;
    if (/drive/.test(name) && len > 8) s *= 0.5;
    if (/cut/.test(name) && len < 5) s *= 0.5;
    if (/cut/.test(name) && xOff < 0.05) s *= 0.65;
    if (/(pull|hook)/.test(name) && len < 5) s *= 0.5;
    if (/sweep/.test(name) && len > 7) s *= 0.55;
    if (/(cover|cut|square)/.test(name) && xOff < -0.15) s *= 0.6;           // off-side shot to leg-line ball
    if (/(flick|on drive|pull|glance|sweep)/.test(name) && xOff > 0.45) s *= 0.55; // across the line to a wide ball
    if (z > 1.35 && !/(pull|hook|cut|defence)/.test(name)) s *= 0.55;
    return Math.max(0.3, s);
  }

  function resolveContact(play) {
    var ctx = play.ctx, plan = play.plan, rng = play.rng, at = play.atContact, sh = play.shot;
    var cls = P.styleClass(plan.bowl), offSign = play.offSign;
    var xOff = at.x * offSign; // + = off side of the batter
    var reach = Math.abs(at.x - play.batX);
    var canReach = (xOff > 0 ? xOff < 1.25 : reach < 0.95) && at.z < 2.05;
    if (!sh || sh.kind === 'leave' || !canReach) { play.contact = { type: 'none', offered: !!sh && sh.kind !== 'leave' }; return; }
    var dtMs = (sh.t + SWING_LAG - play.ta) * 1000;
    var wnd = (ctx.humanBat && ctx.assistedTiming ? 1.6 : 1) * (sh.kind === 'defend' ? 1.8 : 1);
    var adt = Math.abs(dtMs) / wnd;
    play.timingDt = dtMs;
    if (adt > 150) { play.timingLabel = dtMs < 0 ? 'Very early' : 'Very late'; play.contact = { type: 'miss', offered: true }; return; }
    var tq = adt <= 22 ? 1 : adt <= 55 ? 0.86 : adt <= 100 ? 0.6 : 0.32;
    play.timingLabel = adt <= 22 ? 'Perfect' : adt <= 55 ? 'Good' : dtMs < 0 ? 'Early' : 'Late';
    var name = shotName(sh.kind, sh.angle, plan.len, cls);
    var suit = suitability(name, plan.len, xOff, at.z);
    var bt = ctx.striker.bt == null ? 0.6 : ctx.striker.bt;
    // spin off the pitch and late swing make good contact harder
    var movement = Math.min(0.25, Math.abs(plan.dev) * 0.04 + Math.abs(plan.swing) * 0.012);
    var q = clamp(tq * suit * (0.72 + 0.32 * bt) - movement * (1 - bt), 0.05, 1);
    play.quality = q; play.shotName = name;
    // edges / misses grow with poor quality; perfect timing + suitable shot rarely edges
    var edgeP = sh.kind === 'defend' ? (1 - q) * 0.13 : (1 - q) * 0.19 * (xOff > 0.15 ? 1.3 : 0.75);
    var missP = ((1 - q) * 0.3 + (plan.len < 1.3 ? 0.1 : 0)) * (sh.kind === 'defend' ? 0.4 : 1);
    var roll = rng.next();
    if (roll < missP) { play.contact = { type: 'miss', offered: true }; return; }
    var b = play.ball, sp = 0, launch = 0, theta = sh.angle;
    // early → bat comes round sooner → ball goes squarer on the leg side; late → finer on the off
    theta = sh.angle + (dtMs * 0.32);
    var incoming = plan.v * 0.88;
    if (roll < missP + edgeP) {
      var inside = rng.next() < (xOff < 0.15 ? 0.55 : 0.25);
      if (inside) { theta = -(160 + rng.next() * 18); sp = incoming * (0.3 + rng.next() * 0.3); launch = rng.range(-10, 2); play.shotName = 'inside edge'; }
      else { theta = 150 + rng.next() * 26; sp = incoming * (0.45 + rng.next() * 0.35); launch = rng.range(-2, 14); play.shotName = rng.next() < 0.5 ? 'outside edge' : 'thick edge'; }
      play.contact = { type: 'edge', inside: inside };
      if (inside && Math.abs(at.x) < 0.3 && at.z < STUMP_H && rng.next() < 0.45) { play.contact.playedOn = true; }
    } else {
      var power = ctx.striker.pw == null ? 0.6 : ctx.striker.pw;
      if (sh.kind === 'defend') { sp = 3 + 5 * q; launch = rng.range(-6, 4); }
      else if (sh.kind === 'ground') { sp = 8 + 24 * q * (0.85 + 0.2 * power) + incoming * 0.04; launch = rng.range(-3, 5) + (1 - q) * 6; }
      else { sp = 8 + 27 * q * (0.85 + 0.2 * power) + incoming * 0.03; launch = 24 + rng.range(-5, 7) + (1 - q) * 14; }
      if (/(pull|hook)/.test(name) && q < 0.55) { launch += 18; play.shotName = 'top edge'; }
      play.contact = { type: 'bat' };
    }
    var dir = P.dirVec(theta, offSign), lr = launch * Math.PI / 180;
    b.x = at.x; b.y = play.contactY; b.z = Math.max(0.15, at.z);
    b.vx = dir.x * sp * Math.cos(lr); b.vy = dir.y * sp * Math.cos(lr); b.vz = sp * Math.sin(lr);
    b.bounced = false; b.live = true; play.hitTheta = theta;
    play.events.push({ e: 'contact', q: q, kind: play.contact.type, timing: play.timingLabel });
    if (play.contact.playedOn) { b.vx = -b.x * 4; b.vy = 4; b.vz = 0.2; play.events.push({ e: 'playedon' }); }
    planFielding(play);
  }

  /* ---------- ball flight after contact ---------- */
  function integrateBall(b, dt) {
    var v = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz), k = 0.0042;
    if (b.z > 0.01 || b.vz > 0) {
      b.vx -= k * v * b.vx * dt; b.vy -= k * v * b.vy * dt; b.vz -= (G + k * v * b.vz) * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.z <= 0) {
        b.z = 0;
        if (Math.abs(b.vz) > 1.6) { b.vz = -b.vz * 0.36; b.vx *= 0.7; b.vy *= 0.7; }
        else { b.vz = 0; }
        b.bounced = true;
      }
    } else { // rolling
      var h = hyp(b.vx, b.vy);
      if (h > 0) { var nh = Math.max(0, h - (2.0 + 0.2 * h) * dt); b.vx *= nh / h; b.vy *= nh / h; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.z = 0; b.bounced = true;
    }
  }
  P.integrateBall = integrateBall;

  function predict(b, g, maxT) {
    var c = { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, bounced: b.bounced };
    var out = [], dt = 1 / 60, t = 0;
    while (t <= maxT) {
      var out1 = P.outside(g, c.x, c.y);
      out.push({ t: t, x: c.x, y: c.y, z: c.z, b: c.bounced, o: out1 });
      if (out1) break;
      if (c.z === 0 && hyp(c.vx, c.vy) < 0.05) { break; }
      integrateBall(c, dt); t += dt;
    }
    return out;
  }
  P.predict = predict;

  function fielderSpeed(f) { return f.role === 'keeper' ? 5.6 : 6.1 + 1.3 * (f.fd || 0.6); }

  function planFielding(play) {
    var b = play.ball, g = play.ctx.ground;
    var traj = predict(b, g, 14); play.traj = traj; play.trajT0 = play.t;
    var best = -1, bestT = 1e9, bestI = 0;
    play.fielders.forEach(function (f, fi) {
      if (fi === 1 && play.t < play.ta + 0.2) return;
      var react = f.role === 'keeper' ? 0.12 : 0.26, vmax = fielderSpeed(f);
      for (var i = 0; i < traj.length; i++) {
        var p = traj[i]; if (p.o) break;
        var catchable = !p.b && p.z < 2.6, pick = p.z < (fi === 0 ? 1.9 : 1.3);
        if (!catchable && !pick) continue;
        var reachR = catchable ? 1.6 : 1.5;
        var d = hyp(p.x - f.x, p.y - f.y) - reachR;
        if (d <= Math.max(0, p.t - react) * vmax) { if (p.t < bestT) { bestT = p.t; best = fi; bestI = i; } break; }
      }
    });
    if (best < 0) { // nobody intercepts before the rope: nearest fielder chases the exit point
      var last = traj[traj.length - 1], md = 1e9;
      play.fielders.forEach(function (f, fi) { var d = hyp(last.x - f.x, last.y - f.y); if (d < md && fi > 0) { md = d; best = fi; } });
      bestI = traj.length - 1;
    }
    play.chaser = best; play.chaseI = bestI;
    play.fielders.forEach(function (f, fi) { f.act = fi === best ? 'chase' : 'idle'; });
    // a backup fielder drifts towards the line of the ball
    var tp = traj[Math.min(traj.length - 1, bestI + 40)], bk = -1, bd = 1e9;
    play.fielders.forEach(function (f, fi) { if (fi !== best && f.role === 'field') { var d = hyp(tp.x - f.x, tp.y - f.y); if (d < bd) { bd = d; bk = fi; } } });
    if (bk >= 0) { play.fielders[bk].act = 'backup'; play.backupT = { x: tp.x, y: tp.y }; }
  }

  function moveToward(f, tx, ty, v, dt) {
    var dx = tx - f.x, dy = ty - f.y, d = hyp(dx, dy);
    if (d < 0.02) return 0;
    var s = Math.min(d, v * dt); f.x += dx / d * s; f.y += dy / d * s; f.anim += s; f.face = Math.atan2(dy, dx); return d - s;
  }

  /* ---------- running ---------- */
  function runnerETA(play) { // seconds until the current run is complete (or back home)
    var r = play.run; if (!r.active) return 0;
    return (r.dir > 0 ? (1 - r.p) : r.p) * r.T;
  }
  function ballETAtoEnd(play, end) { // seconds for the ball to reach an end's stumps
    var ey = end === 'striker' ? 0 : -PITCH, b = play.ball, f;
    if (play.throwing) return play.throwing.end === end ? Math.max(0, play.throwing.t1 - play.t) : 99;
    if (play.ball.held >= 0) { f = play.fielders[play.ball.held]; return 0.35 + hyp(f.x, f.y - ey) / throwSpeed(f); }
    if (play.chaser >= 0 && play.traj) {
      f = play.fielders[play.chaser]; var p = play.traj[play.chaseI] || play.traj[play.traj.length - 1];
      var tReach = Math.max(p.t - (play.t - play.trajT0), hyp(p.x - f.x, p.y - f.y) / fielderSpeed(f));
      return tReach + 0.35 + hyp(p.x, p.y - ey) / throwSpeed(f);
    }
    return 6;
  }
  function throwSpeed(f) { return 24 + 8 * (f.fd || 0.6); }

  // AI/assisted running: compare honest time estimates (no peeking at random outcomes)
  function aiRunning(play, aggression) {
    var r = play.run, margin = 0.3 - 0.4 * aggression;
    if (!play.ball.live || play.wicket || play.boundary || play.deadTimer >= 0) return;
    if (!r.active) {
      if (play.ball.held >= 0 && !play.throwing && r.done > 0 && r.waited < 0.1) { /* fielder has it */ }
      var etaS = ballETAtoEnd(play, 'striker'), etaN = ballETAtoEnd(play, 'non');
      var need = r.T + margin;
      if (Math.min(etaS, etaN) > need) { P.inputRun(play); }
    } else if (r.dir > 0 && r.p < 0.45) {
      var dest = r.done % 2 === 0 ? 'both' : 'both';
      var eta = Math.min(ballETAtoEnd(play, 'striker'), ballETAtoEnd(play, 'non'));
      if (eta + 0.15 < runnerETA(play)) P.inputReturn(play);
    }
  }
  P.aiRunning = aiRunning;

  function chooseThrowEnd(play, f) {
    var r = play.run;
    if (!r.active) return hyp(f.x, f.y) < hyp(f.x, f.y + PITCH) ? 'striker' : 'non';
    var eta = runnerETA(play);
    var tS = 0.35 + hyp(f.x, f.y) / throwSpeed(f), tN = 0.35 + hyp(f.x, f.y + PITCH) / throwSpeed(f);
    var gS = eta - tS, gN = eta - tN; // positive = chance of a run-out at that end
    return gS >= gN ? 'striker' : 'non';
  }

  /* ---------- per-step update ---------- */
  P.step = function (play, dt) {
    if (play.done) return;
    play.t += dt;
    var b = play.ball, ctx = play.ctx, rng = play.rng;
    if (play.phase === 'runup') {
      if (play.t >= RUNUP) { play.phase = 'flight'; play.events.push({ e: 'release' }); }
      return;
    }
    if (play.phase === 'flight') {
      var s = P.sampleAtT(play.plan.samples, play.t - RUNUP);
      b.x = s.x; b.y = s.y; b.z = s.z; b.bounced = s.b;
      if (s.b && !play.bounceEv) { play.bounceEv = true; play.events.push({ e: 'bounce' }); }
      if (play.t >= play.ta && !play.contact) {
        resolveContact(play);
        if (play.contact.type === 'bat' || play.contact.type === 'edge') { play.phase = 'live'; return; }
        if (play.contact.type === 'miss' || play.contact.type === 'none') checkStumpsPads(play);
        if (play.done) return;
      }
      if (play.contact && (play.contact.type === 'miss' || play.contact.type === 'none') && b.y >= 0.2 && !play.passed) {
        play.passed = true; // ball goes through to the keeper: becomes a live ball
        var nx = P.sampleAtT(play.plan.samples, play.t - RUNUP + 1 / 240);
        b.vx = (nx.x - s.x) * 240; b.vy = (nx.y - s.y) * 240; b.vz = (nx.z - s.z) * 240;
        if (play.padHit) { var a = rng.range(-1, 1); b.vx = a * 4; b.vy = rng.range(-2, 3); b.vz = 0.5; }
        b.live = true; play.phase = 'live'; planFielding(play);
      }
      return;
    }
    // ---- live ball ----
    var r = play.run;
    if (ctx.ai || !ctx.humanBat || ctx.assistedRun) aiRunning(play, ctx.aggression || 0.5);
    if (r.active) {
      r.p += r.dir * dt / r.T;
      if (r.p >= 1) { r.done++; r.active = false; r.p = 0; play.events.push({ e: 'runDone', n: r.done }); }
      else if (r.p <= 0 && r.dir < 0) { r.active = false; r.p = 0; r.returning = false; }
    }
    // throws in flight
    if (play.throwing) {
      var th = play.throwing, k = clamp((play.t - th.t0) / (th.t1 - th.t0), 0, 1);
      b.x = th.fx + (th.tx - th.fx) * k; b.y = th.fy + (th.ty - th.fy) * k; b.z = 1.2 + Math.sin(k * Math.PI) * th.arc;
      if (k >= 1) {
        play.throwing = null; b.held = th.end === 'striker' ? 0 : 1;
        var recv = play.fielders[b.held]; recv.x = th.tx; recv.y = th.ty + (th.end === 'striker' ? 0.6 : -0.6);
        play.breakAt = play.t + 0.14; play.breakEnd = th.end;
      }
    } else if (b.held < 0) {
      integrateBall(b, dt);
      if (play.contact && play.contact.playedOn && b.y > -0.05 && Math.abs(b.x) < STUMP_HALF && !play.wicket) {
        play.wicket = { kind: 'bowled' }; play.events.push({ e: 'bowled', playedOn: true }); return finishPlay(play);
      }
    }
    var dist = hyp(b.x, b.y); if (dist > play.maxDist) play.maxDist = dist;
    play.trail.push({ x: b.x, y: b.y, z: b.z }); if (play.trail.length > 14) play.trail.shift();
    // boundary
    if (b.held < 0 && !play.throwing && P.outside(ctx.ground, b.x, b.y)) {
      play.boundary = b.bounced ? 4 : 6; play.events.push({ e: 'boundary', n: play.boundary }); return finishPlay(play);
    }
    // break the wicket after a throw arrives
    if (play.breakAt && play.t >= play.breakAt) {
      var end = play.breakEnd; play.breakAt = 0;
      if (r.active) {
        var receiver = play.fielders[end === 'striker' ? 0 : 1];
        var clean = rng.next() < 0.9 + 0.08 * (receiver.fd || 0.6);
        if (clean) {
          play.wicket = { kind: 'runout', end: end, returning: r.dir < 0, fielder: play.lastThrower != null ? play.fielders[play.lastThrower].id : receiver.id };
          play.events.push({ e: 'runout', end: end }); return finishPlay(play);
        }
        play.events.push({ e: 'fumble' });
      } else { play.deadTimer = 0.45; }
    }
    // fielders
    moveFielders(play, dt);
    if (play.deadTimer >= 0) {
      if (r.active) { play.deadTimer = 0.45; }
      else { play.deadTimer -= dt; if (play.deadTimer <= 0) return finishPlay(play); }
    }
    // held by a fielder with nobody running for a moment → dead ball (ball returned)
    if (b.held >= 0 && !play.throwing && !r.active && !play.breakAt) {
      r.waited += dt; if (r.waited > 1.1) return finishPlay(play);
    } else r.waited = 0;
    if (play.t > 40) finishPlay(play);
  };

  function moveFielders(play, dt) {
    var b = play.ball, rng = play.rng;
    play.fielders.forEach(function (f, fi) {
      var v = fielderSpeed(f);
      if (fi === b.held) {
        if (!play.throwing && (play.run.active || play.throwPending)) doThrow(play, fi);
        else if (!play.throwing && !play.thrownOnce && fi > 1) doThrow(play, fi); // return to keeper/bowler
        return;
      }
      if (f.act === 'chase' && b.held < 0 && !play.throwing) {
        var tElapsed = play.t - play.trajT0;
        var p = play.traj[play.chaseI] || play.traj[play.traj.length - 1];
        var tx = p.x, ty = p.y;
        if (tElapsed > p.t + 0.2) { tx = b.x; ty = b.y; } // ball already there: go to it
        moveToward(f, tx, ty, v, dt);
        var d = hyp(b.x - f.x, b.y - f.y);
        var airborne = !b.bounced && b.z > 0.05;
        var offBat = play.contact && (play.contact.type === 'bat' || play.contact.type === 'edge') && !play.dropped;
        if (airborne && offBat && b.z < 2.6 && d < 1.7 && !play.catchTried[fi]) {
          play.catchTried[fi] = true;
          var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
          var dive = d > 1.0 ? (d - 1.0) / 0.7 : 0;
          var base = f.role === 'keeper' ? 0.93 : 0.8 + 0.17 * (f.fd || 0.6);
          var p = base * (1 - 0.45 * dive) * (speed > 28 ? 0.8 : 1) * (b.z > 2.2 ? 0.8 : 1);
          if (rng.next() < p) {
            b.held = fi; b.live = false; f.act = 'catch';
            play.catchBy = fi; play.events.push({ e: 'catch', by: fi, dive: dive > 0 });
            play.wicket = { kind: 'caught', fielder: f.id };
            return finishPlay(play);
          }
          play.events.push({ e: 'drop', by: fi }); play.dropped = true;
          b.vx *= -0.2; b.vy *= -0.2; b.vz = Math.abs(b.vz) * 0.2; b.bounced = true;
          f.act = 'stun'; setTimeout0(play, 0.6, function () { planFielding(play); });
        } else if ((b.bounced || b.z < 0.05 || fi === 0) && b.z < (fi === 0 ? 1.9 : 1.3) && d < (fi === 0 ? 1.2 : 1.6)) {
          var fumble = rng.next() < 0.05 * (1.3 - (f.fd || 0.6)) * (hyp(b.vx, b.vy) > 18 ? 2 : 1);
          if (fumble) { b.vx *= 0.3; b.vy *= 0.3; play.events.push({ e: 'fumble' }); f.act = 'stun'; setTimeout0(play, 0.5, function () { planFielding(play); }); }
          else { b.held = fi; b.vx = b.vy = b.vz = 0; b.z = 0.9; play.events.push({ e: 'pickup', by: fi }); }
        }
      } else if (f.act === 'backup' && play.backupT) {
        moveToward(f, play.backupT.x, play.backupT.y, v * 0.7, dt);
      } else if (f.role === 'keeper' && b.live) {
        moveToward(f, 0, 0.9, v, dt);
      } else if (f.role === 'bowler' && b.live && play.t > play.ta + 0.6) {
        moveToward(f, 0.4, -PITCH - 0.9, v * 0.8, dt);
      }
    });
    // timers
    if (play.timers) play.timers = play.timers.filter(function (tm) { if (play.t >= tm.at) { tm.fn(); return false; } return true; });
  }
  function setTimeout0(play, delay, fn) { (play.timers = play.timers || []).push({ at: play.t + delay, fn: fn }); }

  function doThrow(play, fi) {
    var f = play.fielders[fi];
    if (play.holdUntil == null) { play.holdUntil = play.t + (fi <= 1 ? 0.05 : 0.35); return; }
    if (play.t < play.holdUntil) return;
    play.holdUntil = null;
    var end = chooseThrowEnd(play, f);
    if (fi === 0 && end === 'striker' || fi === 1 && end === 'non') { // already at that end: break it
      play.breakAt = play.t + 0.12; play.breakEnd = end; play.thrownOnce = true; play.ball.held = fi; play.lastThrower = fi; return;
    }
    var ty = end === 'striker' ? 0 : -PITCH;
    var d = hyp(f.x, f.y - ty), sp = throwSpeed(f);
    var err = (1 - (f.fd || 0.6)) * (play.rng.next() - 0.5) * 1.2;
    play.throwing = { fx: f.x, fy: f.y, tx: err, ty: ty + (end === 'striker' ? 0.7 : -0.7), t0: play.t, t1: play.t + d / sp, end: end, arc: Math.min(6, d * 0.06) };
    play.ball.held = -1; play.thrownOnce = true; play.lastThrower = fi; f.act = 'throw';
    play.events.push({ e: 'throw', end: end, by: fi });
  }

  function checkStumpsPads(play) {
    var pl = play.plan, at = play.atContact, cr = play.atCrease, ctx = play.ctx, offSign = play.offSign;
    var shotOffered = play.contact.offered;
    // pads: the batter's legs occupy a band around batX at the contact plane
    var padBand = Math.abs(at.x - play.batX) < 0.24 + 0.12 && at.z < 0.78;
    var hitStumps = cr && Math.abs(cr.x) < STUMP_HALF && cr.z < STUMP_H + 0.03;
    if (padBand) {
      play.padHit = true;
      var pitchedLegside = pl.bounce && pl.bounce.x * offSign < -STUMP_HALF;
      var inLine = Math.abs(at.x) <= STUMP_HALF + 0.02 || (!shotOffered && at.x * offSign > 0);
      if (hitStumps && !pitchedLegside && inLine && !pl.fullToss || (pl.fullToss && hitStumps && inLine)) {
        play.events.push({ e: 'lbw' }); play.wicket = { kind: 'lbw' }; return finishPlay(play);
      }
      play.events.push({ e: 'pad' });
      return;
    }
    if (hitStumps) { play.events.push({ e: 'bowled' }); play.wicket = { kind: 'bowled' }; return finishPlay(play); }
    // stumping: batter advanced for a lofted shot against spin and missed; keeper standing up
    var spin = P.styleClass(pl.bowl) === 'finger' || P.styleClass(pl.bowl) === 'wrist';
    if (spin && ctx.keeperUp && play.shot && play.shot.kind === 'loft' && play.contact.type === 'miss') {
      var k = play.fielders[0], kr = Math.abs((cr ? cr.x : 0) - k.x);
      if (kr < 0.9 && play.rng.next() < 0.75 + 0.2 * (k.fd || 0.7)) { play.stumpOut = true; play.events.push({ e: 'stumped' }); play.wicket = { kind: 'stumped', fielder: k.id }; return finishPlay(play); }
    }
    // wides (limited overs are stricter) — only when the ball passed untouched
    var xOffC = cr ? cr.x * offSign : 0;
    if (ctx.fmt.limited) {
      if (xOffC > 0.89 || xOffC < -0.22 || (cr && cr.z > 1.85)) play.extraCall = 'wd';
    } else if (Math.abs(cr.x - play.batX) > 1.55 || (cr && cr.z > 2.3)) play.extraCall = 'wd';
  }

  function finishPlay(play) {
    if (play.done) return;
    play.done = true;
    var r = play.run, d = { extra: null, bat: 0, ran: 0, boundary: 0, wicket: null, bouncer: !!play.bouncer };
    var contact = play.contact && (play.contact.type === 'bat' || play.contact.type === 'edge');
    var ran = r.done;
    if (play.nb) {
      d.extra = 'nb';
      if (contact) { d.bat = ran; d.boundary = play.boundary; } else { d.ran = ran; if (play.boundary) d.ran = play.boundary; }
    } else if (play.extraCall === 'wd' && !contact) {
      d.extra = 'wd'; d.ran = ran; d.boundary = play.boundary;
    } else if (contact) { d.bat = ran; d.boundary = play.boundary; }
    else if (ran || play.boundary) { d.extra = play.padHit ? 'lb' : 'b'; d.ran = ran; d.boundary = play.boundary; }
    if (play.wicket) d.wicket = { kind: play.wicket.kind, end: play.wicket.end, returning: play.wicket.returning, fielder: play.wicket.fielder };
    if (play.wicket && play.wicket.kind === 'caught') { d.bat = 0; d.boundary = 0; }
    if (contact) d.shot = { angle: Math.round(play.hitTheta), dist: Math.round(play.maxDist) };
    if (play.plan.bounce) d.pitch = { x: +(play.plan.bounce.x * play.offSign).toFixed(2), len: +play.plan.len.toFixed(2) };
    else d.pitch = { x: +(play.plan.line * play.offSign).toFixed(2), len: 0 };
    play.result = d;
    play.events.push({ e: 'dead' });
  }
  P.finishPlay = finishPlay;
  P._planFielding = planFielding;

  /* Headless: run a whole delivery with the same functions (used by simulation) */
  P.runHeadless = function (play, maxT) {
    var dt = P.DT, lim = maxT || 45;
    while (!play.done && play.t < lim) {
      if (play.ai && play.ai.shotAt != null && !play.shot && play.t >= play.ai.shotAt) P.inputShot(play, play.ai.kind, play.ai.angle);
      P.step(play, dt);
    }
    if (!play.done) finishPlay(play);
    return play.result;
  };

  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);

/* EOC - Cricket controls update - Animesh - 26.10.2026 */