/* Cricket, Unreasonably Serious — AI decisions (DOM-free).
   AI reads the actual delivery and the actual field. Difficulty changes decision quality
   and timing consistency only; it never alters physics or outcomes. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  var P = CRK.Physics;
  var AI = CRK.AI = {};
  var DIFF = { easy: 1.35, normal: 1.0, hard: 0.82, legend: 0.7 };
  AI.DIFF = DIFF;

  /* match situation → aggression 0..1 */
  AI.aggression = function (s) {
    var inn = CRK.cur(s), f = CRK.FORMATS[s.format], lim = CRK.oversLimit(s);
    var wl = CRK.maxWkts(s) - inn.wkts;
    if (!lim) { // Test
      var a = 0.18 + (inn.bs[inn.striker] && inn.bs[inn.striker].b > 40 ? 0.1 : 0);
      if (inn.target) { var need = inn.target - inn.runs, ci = CRK.clockInfo(s); var ballsLeft = ci ? ci.oversLeftMatch * 6 : 999;
        if (need * 6 / Math.max(1, ballsLeft) > 4.5) a += 0.25; if (need * 6 / Math.max(1, ballsLeft) > 7) a = 0.05; }
      return Math.min(0.7, a);
    }
    var left = lim * 6 - inn.balls, phase = inn.balls / (lim * 6);
    var agg = 0.38 + 0.38 * Math.max(0, phase - 0.6) / 0.4 + (CRK.inPowerplay(s) ? 0.1 : 0);
    if (inn.target) {
      var rrr = (inn.target - inn.runs) * 6 / Math.max(1, left);
      var crr = CRK.runRate(inn) || 6;
      agg += (rrr - Math.max(6, crr)) * 0.06;
      if (rrr > 13) agg += 0.15;
    }
    if (wl <= 2) agg -= 0.15; if (wl <= 4 && phase < 0.6) agg -= 0.1;
    if (lim <= 5) agg += 0.25;
    return Math.max(0.05, Math.min(0.95, agg));
  };

  /* pick the bowler: rating, quota, phase suitability */
  AI.chooseBowler = function (s) {
    var inn = CRK.cur(s), team = s.teams[inn.bowl], el = CRK.eligibleBowlers(s);
    var lim = CRK.oversLimit(s), ov = Math.floor(inn.balls / 6);
    var death = lim && ov >= lim - 4, pp = lim && ov < Math.max(1, Math.round(lim * 0.3));
    var best = null, bv = -1e9;
    el.forEach(function (id) {
      var p = team.players[id], bw = p.bw || 0.1, cls = p.bowl ? P.styleClass(p.bowl) : 'none';
      var v = bw * 10;
      if (!p.bowl) v -= 8;
      if ((death || pp) && (cls === 'pace')) v += 1.5;
      if (!death && !pp && (cls === 'finger' || cls === 'wrist')) v += 1.2;
      var used = inn.ws[id].balls / 6; v -= used * (lim ? 0.35 : 0.08);
      if (!lim) { // Test: spells
        var recent = inn.overs.slice(-10).filter(function (o) { return o.bowler === id; }).length;
        v -= Math.max(0, recent - 3) * 2.5;
      }
      // keep quota for the death overs
      if (lim && !death && p.bowl && cls === 'pace' && bw > 0.8 && used >= (CRK.FORMATS[s.format].bowlMax || 99) - 2) v -= 3;
      if (v > bv) { bv = v; best = id; }
    });
    return best || el[0];
  };

  AI.chooseField = function (s, bowler) {
    var lim = CRK.oversLimit(s), inn = CRK.cur(s), cls = P.styleClass(bowler.bowl || 'RM');
    if (!lim) return cls === 'finger' || cls === 'wrist' ? 'spin' : (inn.balls < 120 || CRK.cur(s).target ? 'attacking' : 'balanced');
    if (CRK.inPowerplay(s)) return 'powerplay';
    var ov = Math.floor(inn.balls / 6);
    if (ov >= lim - 4) return 'defensive';
    return cls === 'finger' || cls === 'wrist' ? 'spin' : 'balanced';
  };

  /* bowling plan: type, line, length, release error */
  AI.bowlPlan = function (s, bowler, striker, rng, difficulty) {
    var types = P.deliveryTypes(bowler.bowl || 'RM'), cls = P.styleClass(bowler.bowl || 'RM');
    var lim = CRK.oversLimit(s), inn = CRK.cur(s), ov = Math.floor(inn.balls / 6);
    var death = lim && ov >= lim - 4, off = P.offSign(striker.bat);
    var type = 'stock', r = rng.next();
    var smart = 1 / (DIFF[difficulty] || 1);
    if (cls === 'pace' || cls === 'medium') {
      if (death) type = r < 0.33 * smart ? 'yorker' : r < 0.5 ? 'slower' : r < 0.58 && types.indexOf('bouncer') >= 0 ? 'bouncer' : (types.indexOf('cutter') >= 0 && r < 0.66 ? 'cutter' : 'stock');
      else type = r < 0.22 ? 'outswing' : r < 0.36 ? 'inswing' : r < 0.44 && types.indexOf('bouncer') >= 0 && (inn.overBouncers || 0) === 0 ? 'bouncer' : r < 0.5 ? 'slower' : 'stock';
    } else type = r < 0.62 ? 'stock' : rng.pick(types);
    if (types.indexOf(type) < 0) type = 'stock';
    var len = { yorker: 0.9, bouncer: 11.5, slower: 6.2 }[type];
    if (len == null) len = (cls === 'finger' || cls === 'wrist') ? rng.range(3.6, 5.8) : rng.range(5.6, 7.8);
    var line = off * (0.12 + rng.range(-0.08, 0.32)); // around off stump, 4th/5th stump
    if (death && type === 'yorker') line = off * rng.range(-0.05, 0.25);
    var e = rng.normal() * (0.32 - 0.2 * (bowler.bw || 0.5)) * (DIFF[difficulty] || 1);
    return { type: type, line: line, length: len, err: Math.max(-1, Math.min(1, e)) };
  };

  /* batting decision for an actual delivery plan + field */
  AI.batShot = function (s, play, rng, difficulty) {
    var ctx = play.ctx, pl = play.plan, off = play.offSign, at = play.atContact, cr = play.atCrease;
    var bat = ctx.striker, agg = ctx.aggression == null ? 0.5 : ctx.aggression;
    var dm = DIFF[difficulty] || 1;
    var xOff = at.x * off, len = pl.len, threat = cr && Math.abs(cr.x) < 0.2 && cr.z < 0.8;
    var lim = s ? CRK.oversLimit(s) : 20;
    // leave
    if (!threat && xOff > 0.3 + agg * 0.5 && (agg < 0.45 || rng.next() < 0.35)) return { kind: 'leave', angle: 0, err: 0 };
    if (cr && cr.z > (agg < 0.5 ? 1.25 : 1.7) && agg < 0.75) return { kind: 'leave', angle: 0, err: 0 }; // sway/duck
    var kind = 'ground';
    if (len > 4 && len < 8.5 && rng.next() < (0.62 - agg) * 1.3) kind = 'defend';
    else if (rng.next() < agg * 0.55 && len < 9) kind = 'loft';
    if (pl.type === 'yorker' && len < 1.2) kind = rng.next() < 0.6 ? 'defend' : 'ground';
    // natural direction from line/length
    var nat;
    if (len >= 8) nat = xOff > 0.2 ? 85 : -85;
    else if (len <= 3) nat = xOff > 0.15 ? 35 : xOff < -0.1 ? -45 : 5;
    else nat = xOff > 0.25 ? 55 : xOff < -0.05 ? -65 : (rng.next() < 0.5 ? 20 : -25);
    if (kind === 'defend') nat = nat * 0.3;
    // find the biggest gap near the natural direction (reads the actual field)
    var best = nat, bestGap = -1;
    for (var a = nat - 40; a <= nat + 40; a += 8) {
      var gap = 180;
      ctx.field.forEach(function (f) {
        if (f.role !== 'field') return;
        var r = Math.hypot(f.x, f.y), fa = P.angleOf(f.x, f.y, off);
        var relevant = kind === 'loft' ? r > 40 : r < 40;
        if (!relevant) return;
        gap = Math.min(gap, Math.abs(((fa - a + 540) % 360) - 180));
      });
      var score = gap - Math.abs(a - nat) * 0.25;
      if (score > bestGap) { bestGap = score; best = a; }
    }
    if (rng.next() < 0.12 * (dm - 0.6)) best = nat + rng.range(-35, 35); // poorer reads at lower difficulty
    var sigma = (100 - 60 * (bat.bt || 0.5)) * dm * (0.7 + 0.55 * agg); // ms — risk costs control
    if (P.styleClass(pl.bowl) === 'wrist' && pl.type === 'googly') sigma *= 1.25;
    return { kind: kind, angle: Math.max(-175, Math.min(175, best)), err: rng.normal() * sigma / 1000 };
  };

  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);
