/* Cricket, Unreasonably Serious — rules engine (pure, DOM-free).
   One explicit state machine + event log. Overs are never stored as decimals:
   every innings stores a legal-ball count; formatting happens on display. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};

  /* ---------- seeded RNG (mulberry32), state is serialisable ---------- */
  function RNG(seed) { this.s = (seed >>> 0) || 1; }
  RNG.prototype.next = function () {
    var t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  RNG.prototype.normal = function () {
    var u = Math.max(1e-9, this.next()), v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  RNG.prototype.pick = function (a) { return a[Math.floor(this.next() * a.length)]; };
  CRK.RNG = RNG;
  CRK.hashSeed = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* ---------- formats ---------- */
  // pp: [fromOver, toOver(exclusive), maxFieldersOutsideCircle]
  var FORMATS = {
    T20:   { key: 'T20', label: 'T20 — 20 overs', overs: 20, innings: 1, bowlMax: 4, freeHit: true, tie: 'superover', full: true,
             pp: [[0, 6, 2], [6, 20, 5]], bouncersPerOver: 1 },
    ODI:   { key: 'ODI', label: 'ODI — 50 overs', overs: 50, innings: 1, bowlMax: 10, freeHit: true, tie: 'tie', full: true,
             pp: [[0, 10, 2], [10, 40, 4], [40, 50, 5]], bouncersPerOver: 2 },
    TEST:  { key: 'TEST', label: 'Test — 5 days (90 overs/day)', overs: null, innings: 2, bowlMax: null, freeHit: false, tie: 'tie', full: true,
             days: 5, oversPerDay: 90, followOn: 200, pp: [[0, 9999, 9]], bouncersPerOver: 2 },
    TEST3: { key: 'TEST3', label: 'Test (custom short) — 3 days (90 overs/day)', overs: null, innings: 2, bowlMax: null, freeHit: false, tie: 'tie', full: false, custom: true,
             days: 3, oversPerDay: 90, followOn: 150, pp: [[0, 9999, 9]], bouncersPerOver: 2 },
    X10:   { key: 'X10', label: 'Arcade (custom) — 10 overs', overs: 10, innings: 1, bowlMax: 2, freeHit: true, tie: 'superover', custom: true,
             pp: [[0, 3, 2], [3, 10, 5]], bouncersPerOver: 1 },
    X5:    { key: 'X5', label: 'Arcade (custom) — 5 overs', overs: 5, innings: 1, bowlMax: 1, freeHit: true, tie: 'superover', custom: true,
             pp: [[0, 2, 2], [2, 5, 5]], bouncersPerOver: 1 },
    X2:    { key: 'X2', label: 'Arcade (custom) — 2 overs', overs: 2, innings: 1, bowlMax: 1, freeHit: true, tie: 'superover', custom: true,
             pp: [[0, 1, 2], [1, 2, 5]], bouncersPerOver: 1 },
    SUPER: { key: 'SUPER', label: 'Super Over — 1 over, 2 wickets', overs: 1, innings: 1, bowlMax: 1, freeHit: true, tie: 'tie', custom: true,
             maxWkts: 2, pp: [[0, 1, 2]], bouncersPerOver: 1 },
    NETS:  { key: 'NETS', label: 'Nets — practice', overs: 999, innings: 1, bowlMax: null, freeHit: true, tie: 'tie', custom: true, nets: true,
             pp: [[0, 9999, 5]], bouncersPerOver: 1 }
  };
  CRK.FORMATS = FORMATS;

  function oversText(balls) { return Math.floor(balls / 6) + '.' + (balls % 6); }
  CRK.oversText = oversText;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- match creation ---------- */
  // team: {id, name, short, color, xi:[playerIds in batting order], keeper, captain, players:{id:{...}}}
  function newMatch(cfg) {
    var f = FORMATS[cfg.format];
    if (!f) throw new Error('Unknown format');
    var s = {
      v: 1, id: cfg.id || ('m' + Date.now()), format: f.key, status: 'bowler',
      seed: cfg.seed >>> 0, rngState: (cfg.seed >>> 0) || 1,
      teams: [clone(cfg.teams[0]), clone(cfg.teams[1])],
      innings: [], log: [], result: null, freeHit: false, pending: null,
      target: cfg.target || null, oversOverride: cfg.overs || null, wktsOverride: cfg.wickets || null,
      clock: null, meta: cfg.meta || {}
    };
    if (f.days) s.clock = { total: f.days * f.oversPerDay * 6, used: 0 };
    startInnings(s, cfg.battingFirst || 0);
    if (cfg.target) s.innings[0].target = cfg.target; // chase challenge / daily
    if (cfg.startRuns) s.innings[0].runs = 0;
    return s;
  }
  CRK.newMatch = newMatch;

  function fmt(s) { return FORMATS[s.format]; }
  function oversLimit(s) { return s.oversOverride || fmt(s).overs; }
  CRK.oversLimit = oversLimit;
  function maxWkts(s, inn) {
    var f = fmt(s); var n = s.teams[inn.bat].xi.length - 1;
    return Math.min(s.wktsOverride && inn.n === 0 ? s.wktsOverride : (f.maxWkts || 10), n);
  }
  CRK.maxWkts = function (s) { return maxWkts(s, cur(s)); };

  function startInnings(s, batIdx) {
    var t = s.teams[batIdx], b = {}, w = {};
    t.xi.forEach(function (id) { b[id] = { r: 0, b: 0, f4: 0, s6: 0, out: null, dot: 0 }; });
    s.teams[1 - batIdx].xi.forEach(function (id) { w[id] = { balls: 0, r: 0, w: 0, md: 0, wd: 0, nb: 0, dots: 0 }; });
    var inn = {
      n: s.innings.length, bat: batIdx, bowl: 1 - batIdx, runs: 0, wkts: 0, balls: 0,
      extras: { wd: 0, nb: 0, b: 0, lb: 0, pen: 0 }, bs: b, ws: w,
      striker: t.xi[0], non: t.xi[1], next: 2, bowler: null, lastBowler: null,
      over: [], overRuns: 0, overBouncers: 0, overs: [], part: { r: 0, b: 0 }, parts: [], fow: [],
      target: null, closed: false, declared: false, followOn: false, wagon: [], pitch: [], fielding: {}
    };
    s.innings.push(inn);
    s.status = 'bowler';
    s.freeHit = false;
    return inn;
  }

  function cur(s) { return s.innings[s.innings.length - 1]; }
  CRK.cur = cur;

  function eligibleBowlers(s) {
    var inn = cur(s), f = fmt(s), lim = f.bowlMax;
    if (s.oversOverride && f.bowlMax) lim = Math.max(1, Math.ceil(s.oversOverride / 5));
    return s.teams[inn.bowl].xi.filter(function (id) {
      if (id === inn.lastBowler) return false;
      if (lim && inn.ws[id].balls >= lim * 6) return false;
      return true;
    });
  }
  CRK.eligibleBowlers = eligibleBowlers;

  function setBowler(s, id) {
    if (s.status !== 'bowler') throw new Error('Not awaiting bowler');
    if (eligibleBowlers(s).indexOf(id) < 0) throw new Error('Bowler not eligible');
    cur(s).bowler = id; s.status = 'ready';
    s.log.push({ t: 'bowler', inn: cur(s).n, ball: cur(s).balls, id: id });
  }
  CRK.setBowler = setBowler;

  function maxOutside(s) {
    var inn = cur(s), ov = Math.floor(inn.balls / 6), pp = fmt(s).pp;
    if (s.oversOverride && fmt(s).nets) return 5;
    for (var i = 0; i < pp.length; i++) if (ov >= pp[i][0] && ov < pp[i][1]) return pp[i][2];
    return 5;
  }
  CRK.maxOutside = maxOutside;
  CRK.inPowerplay = function (s) { var f = fmt(s); return !!f.overs && maxOutside(s) <= 2; };

  /* ---------- delivery application ----------
     d = { extra: null|'wd'|'nb'|'b'|'lb', bat: runs off the bat, ran: byes/leg-byes/wide runs run,
           boundary: 0|4|6 (applies to bat runs, or to extras if extra is b/lb/wd),
           wicket: null | { kind, end: 'striker'|'non' (run-out end broken), fielder },
           shot: {angle, dist}, pitch: {x, len}, bouncer: bool } */
  function legalWicket(kind, extra, freeHit) {
    if (kind === 'runout' || kind === 'obstructing') return true;
    if (freeHit) return false;
    if (extra === 'nb') return false;
    if (extra === 'wd') return kind === 'stumped' || kind === 'hitwicket';
    return true;
  }
  CRK.legalWicket = legalWicket;

  function applyDelivery(s, d) {
    if (s.status !== 'ready') throw new Error('Not ready for a delivery (status ' + s.status + ')');
    var inn = cur(s), f = fmt(s);
    var st = inn.bs[inn.striker], bw = inn.ws[inn.bowler];
    var extra = d.extra || null;
    var legal = extra !== 'wd' && extra !== 'nb';
    var batRuns = 0, extraRuns = 0, ranRuns = 0, label = '';
    var wasFreeHit = s.freeHit;

    if (extra === 'wd') {
      ranRuns = d.boundary ? d.boundary : (d.ran || 0);
      extraRuns = 1 + ranRuns; inn.extras.wd += extraRuns; bw.wd += extraRuns; bw.r += extraRuns;
      label = extraRuns > 1 ? (extraRuns - 1) + 'wd' : 'wd';
    } else if (extra === 'nb') {
      batRuns = d.boundary || d.bat || 0; ranRuns = d.boundary ? 0 : (d.bat || 0);
      var nbB = d.ran || 0; // byes off a no-ball
      if (nbB) { inn.extras.b += nbB; ranRuns += nbB; }
      inn.extras.nb += 1; bw.nb += 1; bw.r += 1 + batRuns;
      st.r += batRuns; st.b += 1; // a no-ball counts as a ball faced
      if (d.boundary === 4 && !nbB) st.f4++; if (d.boundary === 6) st.s6++;
      extraRuns = 1 + nbB; label = 'nb' + (batRuns + nbB ? '+' + (batRuns + nbB) : '');
    } else if (extra === 'b' || extra === 'lb') {
      ranRuns = d.boundary ? 0 : (d.ran || 0); extraRuns = d.boundary || d.ran || 0;
      inn.extras[extra] += extraRuns; st.b += 1; bw.balls += 1;
      label = extraRuns + extra;
    } else {
      batRuns = d.boundary || d.bat || 0; ranRuns = d.boundary ? 0 : (d.bat || 0);
      st.r += batRuns; st.b += 1; bw.balls += 1; bw.r += batRuns;
      if (d.boundary === 4) st.f4++; if (d.boundary === 6) st.s6++;
      if (!batRuns) { st.dot++; bw.dots++; }
      label = String(batRuns);
    }
    var total = batRuns + extraRuns;
    inn.runs += total; inn.overRuns += total; inn.part.r += total;
    if (legal) { inn.balls += 1; inn.part.b += 1; if (s.clock) s.clock.used += 1; }
    if (d.bouncer) inn.overBouncers++;

    // strike rotation from runs physically run (boundaries do not rotate)
    if (ranRuns % 2 === 1) swapStrike(inn);

    // wicket
    var wk = d.wicket && legalWicket(d.wicket.kind, extra, wasFreeHit) ? d.wicket : null;
    var outId = null;
    if (wk) {
      if (wk.kind === 'runout') {
        // batter running toward the broken end is out; after completed runs, the batter
        // heading to striker's end is the one currently at non-striker position (they crossed).
        // wk.returning: batters were turning back, so each heads to the end they started from
        if (wk.returning) outId = wk.end === 'striker' ? inn.striker : inn.non;
        else outId = wk.end === 'striker' ? inn.non : inn.striker;
      } else outId = inn.striker;
      inn.wkts += 1;
      var bowlerCredited = ['bowled', 'caught', 'lbw', 'stumped', 'hitwicket'].indexOf(wk.kind) >= 0;
      if (bowlerCredited) bw.w += 1;
      var fn = function (id) { var p = s.teams[inn.bowl].players[id]; return p ? p.name : '?'; };
      var desc = { bowled: 'b ' + fn(inn.bowler), lbw: 'lbw b ' + fn(inn.bowler),
        caught: (wk.fielder === inn.bowler ? 'c & b ' + fn(inn.bowler) : 'c ' + fn(wk.fielder) + ' b ' + fn(inn.bowler)),
        stumped: 'st ' + fn(wk.fielder) + ' b ' + fn(inn.bowler), runout: 'run out (' + fn(wk.fielder) + ')',
        hitwicket: 'hit wicket b ' + fn(inn.bowler), obstructing: 'obstructing the field' }[wk.kind];
      inn.bs[outId].out = desc;
      if (wk.fielder) { inn.fielding[wk.fielder] = inn.fielding[wk.fielder] || { c: 0, st: 0, ro: 0 };
        inn.fielding[wk.fielder][wk.kind === 'caught' ? 'c' : wk.kind === 'stumped' ? 'st' : 'ro'] += wk.kind === 'caught' || wk.kind === 'stumped' || wk.kind === 'runout' ? 1 : 0; }
      inn.fow.push({ w: inn.wkts, r: inn.runs, balls: inn.balls, id: outId });
      inn.parts.push({ a: inn.striker, b: inn.non, r: inn.part.r, b2: inn.part.b });
      inn.part = { r: 0, b: 0 };
      label += 'W';
      var xi = s.teams[inn.bat].xi;
      var inc = inn.next < xi.length && inn.wkts < maxWkts(s, inn) ? xi[inn.next++] : null;
      // new batter takes the end of the dismissal: run out → the broken end; otherwise striker's end
      // (Law 18.11: after a catch the incoming batter is on strike).
      var survivor = outId === inn.striker ? inn.non : inn.striker;
      if (wk.kind === 'runout' && wk.end === 'non') { inn.non = inc; inn.striker = survivor; }
      else { inn.striker = inc; inn.non = survivor; }
    }

    s.freeHit = f.freeHit && (extra === 'nb' || (wasFreeHit && !legal));
    if (d.shot) inn.wagon.push({ a: d.shot.angle, dist: d.shot.dist, r: batRuns, by: inn.striker });
    if (d.pitch) inn.pitch.push({ x: d.pitch.x, len: d.pitch.len, w: !!wk, r: total, bowler: inn.bowler });
    inn.over.push(label);
    var ev = { t: 'ball', inn: inn.n, ballNo: inn.balls, over: oversText(inn.balls), legal: legal, d: d,
      total: total, label: label, outId: outId, freeHit: wasFreeHit };
    s.log.push(ev);

    // over completion
    var overDone = legal && inn.balls % 6 === 0;
    if (overDone) {
      if (inn.overRuns === 0) bw.md += 1;
      inn.overs.push({ bowler: inn.bowler, balls: inn.over.slice(), runs: inn.overRuns });
      inn.over = []; inn.overRuns = 0; inn.overBouncers = 0;
      inn.lastBowler = inn.bowler; inn.bowler = null;
      swapStrike(inn);
    }
    checkEnd(s, overDone);
    return ev;
  }
  CRK.applyDelivery = applyDelivery;

  function swapStrike(inn) { var t = inn.striker; inn.striker = inn.non; inn.non = t; }

  function checkEnd(s, overDone) {
    var inn = cur(s), f = fmt(s), lim = oversLimit(s);
    var allOut = inn.wkts >= maxWkts(s, inn) || (!f.nets && (!inn.striker || !inn.non));
    var oversDone = lim && inn.balls >= lim * 6;
    var chased = inn.target && inn.runs >= inn.target;
    var clockOut = s.clock && s.clock.used >= s.clock.total;
    if (f.nets) { if (allOut) { reviveNets(s); } s.status = inn.bowler ? 'ready' : 'bowler'; return; }
    if (allOut || oversDone || chased || clockOut) return endInnings(s, { allOut: allOut, chased: chased, clockOut: clockOut });
    s.status = overDone || !inn.bowler ? 'bowler' : 'ready';
  }

  function reviveNets(s) { var inn = cur(s); inn.wkts = 0; inn.next = 2;
    var xi = s.teams[inn.bat].xi; if (!inn.striker) inn.striker = xi.find(function (id) { return id !== inn.non; });
    if (!inn.non) inn.non = xi.find(function (id) { return id !== inn.striker; }); }

  function declare(s) {
    if (fmt(s).innings !== 2) throw new Error('Declarations are Test-only');
    if (s.status !== 'bowler' && s.status !== 'ready') throw new Error('Cannot declare now');
    cur(s).declared = true;
    s.log.push({ t: 'declare', inn: cur(s).n });
    endInnings(s, {});
  }
  CRK.declare = declare;

  function totals(s, team) {
    return s.innings.filter(function (i) { return i.bat === team; }).reduce(function (a, i) { return a + i.runs; }, 0);
  }
  CRK.totals = totals;

  function teamName(s, i) { return s.teams[i].name; }

  function endInnings(s, why) {
    var inn = cur(s), f = fmt(s);
    inn.closed = true;
    if (inn.part.b || inn.part.r) inn.parts.push({ a: inn.striker, b: inn.non, r: inn.part.r, b2: inn.part.b, unbroken: true });
    s.log.push({ t: 'innings_end', inn: inn.n, runs: inn.runs, wkts: inn.wkts, balls: inn.balls, why: why });
    if (s.clock && s.clock.used >= s.clock.total && !why.chased) return finish(s, { kind: 'draw', text: 'Match drawn — time expired' });

    if (f.innings === 1) {
      if (s.innings.length === 1 && !inn.target) { // first innings in a 2-team limited match
        s.status = 'break';
        s.pending = { next: 'innings', bat: inn.bowl, target: inn.runs + 1 };
        return;
      }
      // chase innings (or single-innings challenge)
      var other = 1 - inn.bat;
      if (inn.runs >= inn.target) return finish(s, { kind: 'win', winner: inn.bat,
        text: teamName(s, inn.bat) + ' won by ' + plural(maxWkts(s, inn) - inn.wkts, 'wicket') + remainingTxt(s, inn) });
      if (inn.runs === inn.target - 1) return finish(s, { kind: 'tie', text: 'Match tied', superOver: f.tie === 'superover' });
      if (s.innings.length === 1) return finish(s, { kind: 'loss', winner: other, text: teamName(s, inn.bat) + ' fell short by ' + plural(inn.target - 1 - inn.runs, 'run') });
      return finish(s, { kind: 'win', winner: other, text: teamName(s, other) + ' won by ' + plural(inn.target - 1 - inn.runs, 'run') });
    }

    // ---- Test ----
    if (s.clock) { s.clock.used = Math.min(s.clock.total, s.clock.used + 12); } // changeover ≈ 2 overs (10 min)
    var n = s.innings.length;
    var A = s.innings[0].bat, B = 1 - A;
    if (n === 1) { s.status = 'break'; s.pending = { next: 'innings', bat: B }; return; }
    if (n === 2) {
      var lead = s.innings[0].runs - s.innings[1].runs;
      if (lead >= f.followOn) { s.status = 'decision'; s.pending = { next: 'followon', team: A, lead: lead }; return; }
      s.status = 'break'; s.pending = { next: 'innings', bat: A }; return;
    }
    if (n === 3) {
      var t3 = inn.bat, o3 = 1 - t3;
      var diff = totals(s, o3) - totals(s, t3);
      if (diff > 0) return finish(s, { kind: 'win', winner: o3, text: teamName(s, o3) + ' won by an innings and ' + plural(diff, 'run') });
      s.status = 'break'; s.pending = { next: 'innings', bat: o3, target: totals(s, t3) - totals(s, o3) + 1 }; return;
    }
    // n === 4
    var t4 = inn.bat, o4 = 1 - t4;
    if (inn.runs >= inn.target) return finish(s, { kind: 'win', winner: t4, text: teamName(s, t4) + ' won by ' + plural(maxWkts(s, inn) - inn.wkts, 'wicket') });
    if (why.allOut) {
      if (inn.runs === inn.target - 1) return finish(s, { kind: 'tie', text: 'Match tied' });
      return finish(s, { kind: 'win', winner: o4, text: teamName(s, o4) + ' won by ' + plural(inn.target - 1 - inn.runs, 'run') });
    }
    return finish(s, { kind: 'draw', text: 'Match drawn' });
  }

  function remainingTxt(s, inn) {
    var lim = oversLimit(s); if (!lim) return '';
    var left = lim * 6 - inn.balls; return left > 0 ? ' (' + plural(left, 'ball') + ' left)' : '';
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function decideFollowOn(s, enforce) {
    if (s.status !== 'decision') throw new Error('No decision pending');
    var A = s.pending.team, B = 1 - A;
    s.log.push({ t: 'followon', enforced: !!enforce });
    s.pending = null;
    var inn = startInnings(s, enforce ? B : A);
    inn.followOn = !!enforce;
  }
  CRK.decideFollowOn = decideFollowOn;

  function continueMatch(s) {
    if (s.status !== 'break') throw new Error('No break pending');
    var p = s.pending; s.pending = null;
    var inn = startInnings(s, p.bat);
    if (p.target) inn.target = p.target;
    s.log.push({ t: 'innings_start', inn: inn.n, bat: p.bat, target: p.target || null });
  }
  CRK.continueMatch = continueMatch;

  function finish(s, r) { s.result = r; s.status = 'done'; s.log.push({ t: 'result', r: r }); }
  CRK.finish = finish;

  /* Test match clock helpers */
  CRK.clockInfo = function (s) {
    if (!s.clock) return null;
    var f = fmt(s), perDay = f.oversPerDay * 6, used = s.clock.used;
    var day = Math.min(f.days, Math.floor(used / perDay) + 1);
    var inDay = used - (day - 1) * perDay;
    var session = Math.min(3, Math.floor(inDay / (perDay / 3)) + 1);
    return { day: day, session: session, oversLeftToday: Math.max(0, Math.ceil((perDay - inDay) / 6)),
      oversLeftMatch: Math.ceil((s.clock.total - used) / 6), days: f.days };
  };

  CRK.requiredRate = function (s) {
    var inn = cur(s), lim = oversLimit(s);
    if (!inn.target || !lim) return null;
    var left = lim * 6 - inn.balls, need = inn.target - inn.runs;
    return { need: need, balls: left, rrr: left > 0 ? (need * 6 / left) : Infinity };
  };
  CRK.runRate = function (inn) { return inn.balls ? inn.runs * 6 / inn.balls : 0; };

  /* Player of the match — transparent game calculation */
  CRK.playerOfMatch = function (s) {
    var pts = {};
    function add(id, v) { pts[id] = (pts[id] || 0) + v; }
    s.innings.forEach(function (inn) {
      Object.keys(inn.bs).forEach(function (id) { var b = inn.bs[id]; if (b.b) add(id, b.r + b.f4 + 2 * b.s6 + (b.r >= 50 ? 15 : 0) + (b.r >= 100 ? 25 : 0)); });
      Object.keys(inn.ws).forEach(function (id) { var w = inn.ws[id]; if (w.balls) add(id, w.w * 22 + w.md * 6 + w.dots * 0.5 - Math.max(0, w.r - w.balls * 1.3) * 0.5); });
      Object.keys(inn.fielding).forEach(function (id) { var f = inn.fielding[id]; add(id, f.c * 8 + f.st * 10 + f.ro * 10); });
    });
    var best = null;
    var winner = s.result && s.result.winner;
    Object.keys(pts).forEach(function (id) {
      var bonus = (winner != null && s.teams[winner].xi.indexOf(id) >= 0) ? 1.15 : 1;
      var v = pts[id] * bonus; if (!best || v > best.v) best = { id: id, v: v };
    });
    if (!best) return null;
    var team = s.teams[0].xi.indexOf(best.id) >= 0 ? 0 : 1;
    return { id: best.id, team: team, name: s.teams[team].players[best.id].name, points: Math.round(best.v) };
  };

  /* Squad validation (pure) */
  CRK.validateXI = function (team, opts) {
    opts = opts || {};
    var errs = [], xi = team.xi || [];
    if (xi.length !== 11) errs.push('Select exactly 11 players (currently ' + xi.length + ').');
    if (new Set(xi).size !== xi.length) errs.push('A player is selected twice.');
    xi.forEach(function (id) { if (!team.players[id]) errs.push('Unknown player in XI.'); });
    if (!team.keeper || xi.indexOf(team.keeper) < 0) errs.push('Choose a wicketkeeper from the XI.');
    if (!team.captain || xi.indexOf(team.captain) < 0) errs.push('Choose a captain from the XI.');
    var bowlers = xi.filter(function (id) { var p = team.players[id]; return p && p.bowl; });
    if (bowlers.length < (opts.minBowlers || 5)) errs.push('Need at least ' + (opts.minBowlers || 5) + ' players who can bowl (have ' + bowlers.length + ').');
    if (opts.overseasMax != null) {
      var os = xi.filter(function (id) { return team.players[id] && team.players[id].overseas; }).length;
      if (os > opts.overseasMax) errs.push('Too many overseas players: ' + os + ' (max ' + opts.overseasMax + ').');
      if (team.impact) {
        if (xi.indexOf(team.impact) >= 0) errs.push('Impact substitute must not be in the XI.');
        if (team.players[team.impact] && team.players[team.impact].overseas && os >= opts.overseasMax)
          errs.push('Impact substitute cannot be overseas when the XI already has ' + opts.overseasMax + ' overseas players.');
      }
    }
    if (opts.squad) xi.forEach(function (id) { if (opts.squad.indexOf(id) < 0) errs.push((team.players[id] || {}).name + ' is not in this squad.'); });
    return errs;
  };

  /* Impact Player substitution (IPL) — swaps a player for the nominated substitute */
  CRK.useImpact = function (s, teamIdx, outId) {
    var t = s.teams[teamIdx];
    if (!t.impact || t.impactUsed) throw new Error('No impact substitute available');
    var i = t.xi.indexOf(outId); if (i < 0) throw new Error('Player not in XI');
    var inn = cur(s);
    if (inn.bat === teamIdx) {
      var bs = inn.bs[outId];
      if (bs && (bs.b || bs.out || outId === inn.striker || outId === inn.non)) throw new Error('Cannot replace a batter who has batted');
      if (t.xi.indexOf(outId) < inn.next) throw new Error('Cannot replace a batter who has batted');
    } else if (inn.ws[outId] && inn.ws[outId].balls) {
      // a replaced bowler's overs remain; substitute may bowl full quota (IPL rule)
    }
    if (outId === inn.bowler) throw new Error('Cannot replace the current bowler mid-over');
    t.xi[i] = t.impact; t.impactUsed = { in: t.impact, out: outId };
    t.replaced = (t.replaced || []).concat(outId);
    if (inn.bat === teamIdx) inn.bs[t.impact] = { r: 0, b: 0, f4: 0, s6: 0, out: null, dot: 0 };
    else inn.ws[t.impact] = { balls: 0, r: 0, w: 0, md: 0, wd: 0, nb: 0, dots: 0 };
    s.log.push({ t: 'impact', team: teamIdx, in: t.impact, out: outId });
  };

  /* Save format */
  CRK.serialize = function (s) { return JSON.stringify({ kind: 'crk-match', v: 1, s: s }); };
  CRK.deserialize = function (txt) {
    var o = JSON.parse(txt);
    if (!o || o.kind !== 'crk-match' || o.v !== 1 || !o.s || !Array.isArray(o.s.innings)) throw new Error('Unsupported save');
    return o.s;
  };

  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);
