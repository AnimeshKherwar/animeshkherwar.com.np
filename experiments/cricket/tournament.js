/* Cricket, Unreasonably Serious — IPL-style tournament (custom schedule), standings, NRR, playoffs. DOM-free. */
(function (root) {
  'use strict';
  var CRK = root.CRK = root.CRK || {};
  var T = CRK.Tournament = {};

  /* single round-robin, deterministic shuffle by seed — labelled "custom schedule" in the UI */
  T.create = function (teamIds, userTeam, seed) {
    var rng = new CRK.RNG(seed || 1), ids = teamIds.slice(), fixtures = [];
    if (ids.length % 2) ids.push(null);
    var n = ids.length;
    for (var r = 0; r < n - 1; r++) {
      for (var i = 0; i < n / 2; i++) {
        var a = ids[i], b = ids[n - 1 - i];
        if (a && b) fixtures.push({ id: 'L' + fixtures.length, stage: 'league', round: r + 1, a: r % 2 ? b : a, b: r % 2 ? a : b, result: null });
      }
      ids.splice(1, 0, ids.pop());
    }
    var table = {};
    teamIds.forEach(function (t) { table[t] = { team: t, p: 0, w: 0, l: 0, nr: 0, t: 0, pts: 0, rf: 0, bf: 0, ra: 0, bb: 0 }; });
    return { kind: 'crk-tournament', v: 1, season: CRK.Rosters ? CRK.Rosters.IPL_SEASON : null, user: userTeam,
      seed: seed, fixtures: fixtures, table: table, stage: 'league', playoffs: [], champion: null, schedule: 'custom' };
  };

  /* NRR inputs: if a side is bowled out, its full quota of overs counts (standard NRR convention) */
  T.recordResult = function (tour, fixtureId, sum) {
    // sum: {a:{runs, balls, allOut}, b:{...}, winner: 'a'|'b'|null(tie/no result), quotaBalls}
    var fx = tour.fixtures.concat(tour.playoffs).filter(function (f) { return f.id === fixtureId; })[0];
    if (!fx || fx.result) throw new Error('Fixture missing or already played');
    fx.result = sum;
    if (fx.stage === 'league') {
      var A = tour.table[fx.a], B = tour.table[fx.b], q = sum.quotaBalls || 120;
      A.p++; B.p++;
      A.rf += sum.a.runs; A.bf += sum.a.allOut ? q : sum.a.balls; A.ra += sum.b.runs; A.bb += sum.b.allOut ? q : sum.b.balls;
      B.rf += sum.b.runs; B.bf += sum.b.allOut ? q : sum.b.balls; B.ra += sum.a.runs; B.bb += sum.a.allOut ? q : sum.a.balls;
      if (sum.winner === 'a') { A.w++; B.l++; A.pts += 2; } else if (sum.winner === 'b') { B.w++; A.l++; B.pts += 2; }
      else { A.t++; B.t++; A.pts++; B.pts++; }
    }
    T.advance(tour);
  };

  T.nrr = function (row) {
    if (!row.bf || !row.bb) return 0;
    return row.rf / (row.bf / 6) - row.ra / (row.bb / 6);
  };
  T.standings = function (tour) {
    return Object.keys(tour.table).map(function (k) { return tour.table[k]; }).sort(function (x, y) {
      return y.pts - x.pts || T.nrr(y) - T.nrr(x) || y.w - x.w || (x.team < y.team ? -1 : 1);
    });
  };

  T.advance = function (tour) {
    var pend = tour.fixtures.filter(function (f) { return !f.result; });
    if (tour.stage === 'league' && !pend.length) {
      var s = T.standings(tour);
      tour.stage = 'playoffs';
      tour.playoffs = [
        { id: 'Q1', stage: 'Qualifier 1', a: s[0].team, b: s[1].team, result: null },
        { id: 'EL', stage: 'Eliminator', a: s[2].team, b: s[3].team, result: null }
      ];
      return;
    }
    if (tour.stage === 'playoffs') {
      var by = function (id) { return tour.playoffs.filter(function (f) { return f.id === id; })[0]; };
      var W = function (f) { return f.result.winner === 'a' ? f.a : f.b; }, L = function (f) { return f.result.winner === 'a' ? f.b : f.a; };
      var q1 = by('Q1'), el = by('EL'), q2 = by('Q2'), fin = by('F');
      if (q1.result && el.result && !q2) tour.playoffs.push({ id: 'Q2', stage: 'Qualifier 2', a: L(q1), b: W(el), result: null });
      q2 = by('Q2');
      if (q2 && q2.result && !fin) tour.playoffs.push({ id: 'F', stage: 'Final', a: W(q1), b: W(q2), result: null });
      fin = by('F');
      if (fin && fin.result) { tour.champion = W(fin); tour.stage = 'complete'; }
    }
  };

  T.next = function (tour) {
    var list = tour.stage === 'league' ? tour.fixtures : tour.playoffs;
    return list.filter(function (f) { return !f.result; })[0] || null;
  };

  /* Summarise a completed engine match into a tournament result. Ties decided by a simulated
     Super Over through the same engine (playoffs and league alike, as in T20 leagues). */
  T.summarise = function (s, aIdx) {
    var inA = s.innings.filter(function (i) { return i.bat === aIdx; })[0], inB = s.innings.filter(function (i) { return i.bat !== aIdx; })[0];
    var mw = function (inn) { return inn.wkts >= CRK.maxWkts(s); };
    var sum = { a: { runs: inA.runs, balls: inA.balls, allOut: inA.wkts >= 10 }, b: { runs: inB.runs, balls: inB.balls, allOut: inB.wkts >= 10 },
      quotaBalls: CRK.oversLimit(s) * 6, text: s.result.text, winner: null };
    if (s.result.winner != null) sum.winner = s.result.winner === aIdx ? 'a' : 'b';
    if (s.result.superOverWinner != null) sum.winner = s.result.superOverWinner === aIdx ? 'a' : 'b';
    return sum;
  };

  T.superOver = function (s, seed) {
    // second-batting side bats first in the Super Over (standard convention)
    var first = s.innings[1].bat;
    var mk = function (i) { var t = JSON.parse(JSON.stringify(s.teams[i])); t.xi = t.xi.slice(0, 11); return t; };
    var so = CRK.newMatch({ format: 'SUPER', seed: seed, teams: [mk(0), mk(1)], battingFirst: first });
    CRK.Sim.simMatch(so, {});
    return so;
  };

  if (typeof module !== 'undefined') module.exports = CRK;
})(typeof window !== 'undefined' ? window : globalThis);
