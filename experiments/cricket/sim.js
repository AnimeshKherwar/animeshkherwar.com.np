/* BOC - Cricket controls update - Animesh - 26.10.2026 */
/* Cricket, Unreasonably Serious — match driver shared by live play and simulation.
   Simulation runs the very same physics + rules for every ball; no fabricated scorecards. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  var P = CRK.Physics, AI = CRK.AI;
  var Sim = CRK.Sim = {};

  Sim.rng = function (s) { var r = new CRK.RNG(1); r.s = s.rngState >>> 0 || 1; return r; };
  Sim.saveRng = function (s, r) { s.rngState = r.s >>> 0; };

  Sim.player = function (s, team, id) { return s.teams[team].players[id]; };

  Sim.fieldFor = function (s, bowler, striker) {
    var inn = CRK.cur(s), key = inn.fieldKey || AI.chooseField(s, bowler);
    var cls = P.styleClass(bowler.bowl || 'RM');
    var keeperUp = (cls === 'finger' || cls === 'wrist' || cls === 'medium' && CRK.oversLimit(s) && CRK.oversLimit(s) <= 10) && key !== 'attacking';
    if (key === 'spin') keeperUp = true;
    var off = P.offSign(striker.bat);
    var f = P.buildField(key, off, keeperUp, inn.customField && inn.customField[striker.bat === 'L' ? 'L' : 'R']);
    P.enforceRestriction(f, CRK.maxOutside(s));
    var team = s.teams[inn.bowl];
    // assign real fielders: keeper, bowler, then the rest of the XI
    var others = team.xi.filter(function (id) { return id !== team.keeper && id !== inn.bowler; });
    f[0].id = team.keeper; f[0].fd = (team.players[team.keeper] || {}).fd || 0.75;
    f[1].id = inn.bowler; f[1].fd = (team.players[inn.bowler] || {}).fd || 0.6;
    for (var i = 2; i < f.length; i++) { var id = others[i - 2]; f[i].id = id; f[i].fd = id ? team.players[id].fd : 0.6; }
    return { field: f, keeperUp: keeperUp, key: key };
  };

  Sim.buildCtx = function (s, opts) {
    opts = opts || {};
    var inn = CRK.cur(s), fm = CRK.FORMATS[s.format];
    var striker = Sim.player(s, inn.bat, inn.striker), non = Sim.player(s, inn.bat, inn.non), bowler = Sim.player(s, inn.bowl, inn.bowler);
    var fd = Sim.fieldFor(s, bowler, striker);
    return {
      striker: striker, non: non, bowler: bowler, field: fd.field, keeperUp: fd.keeperUp, fieldKey: fd.key,
      fmt: { limited: !!CRK.oversLimit(s), bouncersPerOver: fm.bouncersPerOver || 1 },
      overBouncers: inn.overBouncers || 0, freeHit: s.freeHit, ground: P.ground(),
      aggression: AI.aggression(s), humanBat: !!opts.humanBat, humanBowl: !!opts.humanBowl,
      assistedRun: !!opts.assistedRun, assistedTiming: !!opts.assistedTiming, difficulty: opts.difficulty || 'normal'
    };
  };

  /* Prepare a delivery. bowlSpec (human) = {type,line,length,err}; otherwise AI plans it. */
  Sim.prepare = function (s, rng, opts, bowlSpec) {
    opts = opts || {};
    if (s.status === 'bowler') CRK.setBowler(s, AI.chooseBowler(s));
    var ctx = Sim.buildCtx(s, opts);
    var spec = bowlSpec || AI.bowlPlan(s, ctx.bowler, ctx.striker, rng, opts.aiDifficulty || opts.difficulty || 'normal');
    var plan = P.planDelivery({ bowl: ctx.bowler.bowl || 'RM', type: spec.type, line: spec.line, length: spec.length,
      err: spec.err, speed: spec.speed, batHand: ctx.striker.bat, rating: ctx.bowler.bw }, rng);
    var play = P.createPlay(ctx, plan, rng);
    if (!opts.humanBat) {
      var sh = AI.batShot(s, play, rng, opts.aiDifficulty || opts.difficulty || 'normal');
      if (sh.kind === 'leave') play.ai = { shotAt: null };
      else play.ai = { kind: sh.kind, angle: sh.angle, shotAt: play.ta - P.SWING_LAG + sh.err };
    }
    return play;
  };

  Sim.commit = function (s, play, rng) {
    var ev = CRK.applyDelivery(s, play.result);
    ev.meta = { shot: play.shotName, timing: play.timingLabel, q: +(play.quality || 0).toFixed(2), nbReason: play.nbReason,
      speed: P.kmh(play.plan.v), type: play.plan.type, bowler: CRK.cur(s).bowler, dist: Math.round(play.maxDist) };
    Sim.saveRng(s, rng);
    return ev;
  };

  Sim.simBall = function (s, opts) {
    var rng = Sim.rng(s);
    var play = Sim.prepare(s, rng, Object.assign({}, opts, { humanBat: false, humanBowl: false }));
    P.runHeadless(play);
    return Sim.commit(s, play, rng);
  };

  // Advance automatically through breaks (AI decides follow-on: enforce if lead ≥ threshold + 50)
  Sim.autoBreak = function (s) {
    if (s.status === 'break') CRK.continueMatch(s);
    else if (s.status === 'decision') CRK.decideFollowOn(s, s.pending.lead >= CRK.FORMATS[s.format].followOn + 50);
  };

  Sim.simOver = function (s, opts) {
    var inn = CRK.cur(s), n = inn.n;
    do { Sim.simBall(s, opts); } while (s.status !== 'done' && s.status !== 'break' && s.status !== 'decision' && CRK.cur(s).n === n && CRK.cur(s).balls % 6 !== 0);
  };
  Sim.simInnings = function (s, opts, guard) {
    var n = CRK.cur(s).n, k = 0;
    while (s.status !== 'done' && s.status !== 'break' && s.status !== 'decision' && CRK.cur(s).n === n && k++ < (guard || 20000)) Sim.simBall(s, opts);
  };
  Sim.simMatch = function (s, opts) {
    var k = 0;
    while (s.status !== 'done' && k++ < 40) { Sim.autoBreak(s); Sim.simInnings(s, opts); Sim.autoBreak(s); }
    return s;
  };

  /* Test: AI declaration logic (simple, sensible) */
  Sim.aiShouldDeclare = function (s) {
    var inn = CRK.cur(s), ci = CRK.clockInfo(s); if (!ci) return false;
    if (s.innings.length !== 3) return false;
    var lead = CRK.totals(s, inn.bat) - CRK.totals(s, 1 - inn.bat);
    return lead > 260 && ci.oversLeftMatch < 110 || lead > 420;
  };

  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);

/* EOC - Cricket controls update - Animesh - 26.10.2026 */