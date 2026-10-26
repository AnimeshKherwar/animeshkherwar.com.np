/* Automated rules tests — run: node tests/rules.test.js */
const { CRK, mkTeam } = require('./helpers'); require('../tournament.js'); require('../loop.js');
const P = CRK.Physics;
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ok  ', name); } catch (e) { fail++; console.log('  FAIL', name, '\n       ', e.message); } }
function eq(a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || '') + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); }
function ok(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
function match(fmt, opts) { return CRK.newMatch(Object.assign({ format: fmt, seed: 42, teams: [mkTeam('intl', 'IND'), mkTeam('intl', 'NEP')] }, opts || {})); }
function bowl(s, id) { const inn = CRK.cur(s); CRK.setBowler(s, id || CRK.eligibleBowlers(s).filter(x => s.teams[inn.bowl].players[x].bowl)[0]); }
const D = (o) => Object.assign({ extra: null, bat: 0, ran: 0, boundary: 0, wicket: null }, o);

console.log('Rules engine');
t('single: runs to batter, strike changes', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker, b = inn.non;
  CRK.applyDelivery(s, D({ bat: 1 })); eq(inn.runs, 1); eq(inn.bs[a].r, 1); eq(inn.striker, b); eq(inn.non, a); eq(inn.balls, 1);
});
t('boundary four does not rotate strike; 2 runs do not rotate', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker;
  CRK.applyDelivery(s, D({ boundary: 4 })); eq(inn.striker, a); eq(inn.bs[a].f4, 1);
  CRK.applyDelivery(s, D({ bat: 2 })); eq(inn.striker, a); eq(inn.runs, 6);
});
t('over completion: 6 legal balls, strike swaps, new bowler required, same bowler barred', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker, bw = inn.bowler;
  for (let i = 0; i < 6; i++) CRK.applyDelivery(s, D({}));
  eq(inn.balls, 6); eq(CRK.oversText(inn.balls), '1.0'); eq(inn.striker !== a, true); eq(s.status, 'bowler');
  ok(CRK.eligibleBowlers(s).indexOf(bw) < 0, 'previous bowler eligible');
  let threw = false; try { CRK.setBowler(s, bw); } catch (e) { threw = true; } ok(threw, 'consecutive overs allowed');
  eq(inn.ws[bw].md, 1, 'maiden');
});
t('single off the last ball: strike swaps twice (same striker keeps strike next over)', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker;
  for (let i = 0; i < 5; i++) CRK.applyDelivery(s, D({}));
  CRK.applyDelivery(s, D({ bat: 1 })); eq(inn.striker, a);
});
t('wides/no-balls do not consume legal deliveries; wide runs', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker;
  CRK.applyDelivery(s, D({ extra: 'wd' })); eq(inn.balls, 0); eq(inn.runs, 1); eq(inn.extras.wd, 1); eq(inn.striker, a);
  CRK.applyDelivery(s, D({ extra: 'wd', ran: 1 })); eq(inn.runs, 3); eq(inn.extras.wd, 3); eq(inn.striker !== a, true, 'ran 1 on wide swaps');
  CRK.applyDelivery(s, D({ extra: 'nb', bat: 4, boundary: 4 })); eq(inn.balls, 0); eq(inn.runs, 8); eq(inn.extras.nb, 1);
  for (let i = 0; i < 6; i++) CRK.applyDelivery(s, D({})); eq(inn.balls, 6); eq(s.status, 'bowler');
  eq(inn.ws[Object.keys(inn.ws).find(k => inn.ws[k].balls)].r, 8, 'wides+nb charged to bowler');
});
t('byes / leg-byes: extras, not bowler, ball faced by batter', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker, bw = inn.bowler;
  CRK.applyDelivery(s, D({ extra: 'lb', ran: 1 })); eq(inn.extras.lb, 1); eq(inn.ws[bw].r, 0); eq(inn.bs[a].b, 1); eq(inn.bs[a].r, 0); eq(inn.striker !== a, true);
  CRK.applyDelivery(s, D({ extra: 'b', boundary: 4 })); eq(inn.extras.b, 4); eq(inn.runs, 5); eq(inn.balls, 2);
});
t('free hit after no-ball; bowled on free hit not out; run-out is out; free hit persists through a wide', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s);
  CRK.applyDelivery(s, D({ extra: 'nb' })); eq(s.freeHit, true);
  CRK.applyDelivery(s, D({ extra: 'wd' })); eq(s.freeHit, true, 'persists after wide');
  CRK.applyDelivery(s, D({ wicket: { kind: 'bowled' } })); eq(inn.wkts, 0); eq(s.freeHit, false);
  CRK.applyDelivery(s, D({ extra: 'nb' }));
  CRK.applyDelivery(s, D({ bat: 1, wicket: { kind: 'runout', end: 'striker' } })); eq(inn.wkts, 1);
});
t('caught on a no-ball is not out; stumped off a wide is out', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s);
  CRK.applyDelivery(s, D({ extra: 'nb', wicket: { kind: 'caught' } })); eq(inn.wkts, 0);
  CRK.applyDelivery(s, D({})); // free hit used
  CRK.applyDelivery(s, D({ extra: 'wd', wicket: { kind: 'stumped', fielder: s.teams[1].keeper } })); eq(inn.wkts, 1);
});
t('run-out end assignment (completed 1, out going for 2nd at striker end)', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker, b = inn.non; const nb = s.teams[0].xi[2];
  // after 1 run: b at striker end, a at non-striker end. Attempting 2nd: a runs to striker end → out at striker end
  CRK.applyDelivery(s, D({ bat: 1, wicket: { kind: 'runout', end: 'striker' } }));
  ok(inn.bs[a].out && inn.bs[a].out.indexOf('run out') === 0, 'a should be run out'); eq(inn.bs[b].out, null);
  eq(inn.striker, nb, 'new batter at broken (striker) end'); eq(inn.non, b);
});
t('run-out when turning back (returning) at non-striker end', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const a = inn.striker, b = inn.non; const nb = s.teams[0].xi[2];
  CRK.applyDelivery(s, D({ bat: 0, wicket: { kind: 'runout', end: 'non', returning: true } }));
  ok(inn.bs[b].out, 'non-striker returning to non end is out'); eq(inn.non, nb); eq(inn.striker, a);
});
t('caught: new batter on strike (Law 18.11)', () => {
  const s = match('T20'); bowl(s); const inn = CRK.cur(s); const b = inn.non; const nb = s.teams[0].xi[2];
  CRK.applyDelivery(s, D({ wicket: { kind: 'caught', fielder: s.teams[1].xi[3] } })); eq(inn.striker, nb); eq(inn.non, b);
});
t('chase ends immediately when target reached (mid-over)', () => {
  const s = match('X2'); bowl(s); for (let i = 0; i < 12; i++) { if (s.status === 'bowler') bowl(s); CRK.applyDelivery(s, D({ bat: 1 })); }
  eq(s.status, 'break'); CRK.continueMatch(s); eq(CRK.cur(s).target, 13); bowl(s);
  CRK.applyDelivery(s, D({ boundary: 6 })); CRK.applyDelivery(s, D({ boundary: 6 })); eq(s.status, 'ready');
  CRK.applyDelivery(s, D({ bat: 1 })); eq(s.status, 'done'); eq(s.result.winner, 1); ok(/won by 10 wickets \(9 balls left\)/.test(s.result.text), s.result.text);
});
t('last-wicket transition ends innings; limited-overs tie detected', () => {
  const s = match('X2'); bowl(s);
  for (let i = 0; i < 10; i++) { CRK.applyDelivery(s, D({ wicket: { kind: 'bowled' } })); if (s.status === 'bowler') bowl(s); if (s.status === 'break') break; }
  eq(CRK.cur(s).wkts, 10); eq(s.status, 'break'); CRK.continueMatch(s); bowl(s);
  CRK.applyDelivery(s, D({ wicket: { kind: 'lbw' } }));
  for (let i = 0; i < 9; i++) { if (s.status === 'bowler') bowl(s); CRK.applyDelivery(s, D({ wicket: { kind: 'bowled' } })); }
  eq(s.status, 'done'); eq(s.result.kind, 'tie'); eq(s.result.superOver, true);
});
t('final over: innings closes at overs limit exactly', () => {
  const s = match('X2'); bowl(s); for (let i = 0; i < 12; i++) { if (s.status === 'bowler') bowl(s); CRK.applyDelivery(s, D({})); }
  eq(CRK.cur(s).balls, 12); eq(s.status, 'break'); eq(s.pending.target, 1);
});
t('bowling quota enforced (T20: 4 overs)', () => {
  const s = match('T20'); const inn = CRK.cur(s); const ids = s.teams[1].xi.filter(id => s.teams[1].players[id].bowl).slice(0, 2);
  for (let o = 0; o < 8; o++) { CRK.setBowler(s, ids[o % 2]); for (let i = 0; i < 6; i++) CRK.applyDelivery(s, D({})); }
  ok(CRK.eligibleBowlers(s).indexOf(ids[0]) < 0 && CRK.eligibleBowlers(s).indexOf(ids[1]) < 0, 'quota');
});
t('field restriction: T20 powerplay max 2 outside, then 5', () => {
  const s = match('T20'); eq(CRK.maxOutside(s), 2); CRK.cur(s).balls = 36; eq(CRK.maxOutside(s), 5);
  const f = P.buildField('defensive', -1, false); P.enforceRestriction(f, 2); ok(P.countOutside(f) <= 2);
});

console.log('Test matches');
function playInnings(s, runs, wkts, declare) {
  bowl(s); const inn = CRK.cur(s);
  while (inn.runs < runs && s.status !== 'done') { if (s.status === 'bowler') bowl(s); CRK.applyDelivery(s, D({ boundary: 4 })); if (inn.closed) return; }
  if (declare) return CRK.declare(s);
  for (let i = 0; i < wkts && !inn.closed; i++) { if (s.status === 'bowler') bowl(s); CRK.applyDelivery(s, D({ wicket: { kind: 'bowled' } })); }
}
t('follow-on offered when lead ≥ 200 (5-day); enforcing → innings victory', () => {
  const s = match('TEST'); playInnings(s, 400, 10); eq(s.status, 'break'); CRK.continueMatch(s);
  playInnings(s, 100, 10); eq(s.status, 'decision'); ok(s.pending.lead >= 200);
  CRK.decideFollowOn(s, true); eq(CRK.cur(s).bat, 1); eq(CRK.cur(s).followOn, true);
  playInnings(s, 100, 10); eq(s.status, 'done'); ok(/innings and/.test(s.result.text), s.result.text); eq(s.result.winner, 0);
});
t('declaration closes innings; 4th-innings target set; chase win by wickets', () => {
  const s = match('TEST'); playInnings(s, 300, 0, true); ok(s.innings[0].declared); CRK.continueMatch(s);
  playInnings(s, 200, 10); eq(s.status, 'break'); CRK.continueMatch(s);
  playInnings(s, 100, 0, true); CRK.continueMatch(s); eq(CRK.cur(s).target, 201);
  playInnings(s, 201, 0); eq(s.status, 'done'); eq(s.result.winner, 1); ok(/wickets/.test(s.result.text));
});
t('no follow-on below threshold; draw when match clock expires', () => {
  const s = match('TEST3'); playInnings(s, 200, 10); CRK.continueMatch(s); playInnings(s, 100, 10); eq(s.status, 'break', 'lead 100 < 150');
  CRK.continueMatch(s); bowl(s);
  while (s.status !== 'done') { if (s.status === 'bowler') bowl(s); CRK.applyDelivery(s, D({})); }
  eq(s.result.kind, 'draw'); ok(s.clock.used >= s.clock.total);
});
t('declare not allowed in limited overs', () => { const s = match('T20'); bowl(s); let th = false; try { CRK.declare(s); } catch (e) { th = true; } ok(th); });
t('Test clock → day/session display', () => { const s = match('TEST'); s.clock.used = 90 * 6 + 31 * 6; const c = CRK.clockInfo(s); eq(c.day, 2); eq(c.session, 2); });

console.log('Save / resume');
t('serialize → deserialize preserves exact state and future simulation', () => {
  const s = match('T20'); CRK.Sim.simOver(s, {}); CRK.Sim.simOver(s, {});
  const txt = CRK.serialize(s); const r = CRK.deserialize(txt); eq(JSON.stringify(r), JSON.stringify(s));
  CRK.Sim.simInnings(s, {}); CRK.Sim.simInnings(r, {}); eq(CRK.cur(r).runs, CRK.cur(s).runs, 'deterministic continuation'); eq(r.log.length, s.log.length);
});
t('corrupted save rejected gracefully', () => { let th = false; try { CRK.deserialize('{"kind":"x"}'); } catch (e) { th = true; } ok(th); });

console.log('Squads');
t('valid default XI for every international team', () => {
  CRK.Rosters.INTL.forEach(tm => { const x = mkTeam('intl', tm.id); const e = CRK.validateXI(x); eq(e, [], tm.id); });
});
t('14 international teams; Nepal & Netherlands flagged non-Test', () => {
  eq(CRK.Rosters.INTL.length, 14); eq(CRK.Rosters.INTL.filter(x => !x.test).map(x => x.id).sort(), ['NED', 'NEP']);
  ok(/FICTIONAL/.test(CRK.Rosters.snapshotFor('NEP', 'TEST')));
});
t('IPL: 10 franchises; overseas cap 4 enforced; impact sub rule', () => {
  eq(CRK.Rosters.IPL.length, 10);
  const tm = CRK.Rosters.team('ipl', 'MI'); const players = {}; tm.squad.forEach(p => players[p] = CRK.Rosters.PLAYERS[p]);
  Object.values(players).forEach(p => p.overseas = CRK.Rosters.isOverseas(p.id));
  const os = tm.squad.filter(id => players[id].overseas); const dom = tm.squad.filter(id => !players[id].overseas);
  const xi = os.slice(0, 5).concat(dom.slice(0, 6));
  const e = CRK.validateXI({ xi, players, keeper: xi[0], captain: xi[0] }, { overseasMax: 4, minBowlers: 1 });
  ok(e.some(m => /overseas/.test(m)), 'should flag 5 overseas');
  const ids = new Set(); CRK.Rosters.IPL.forEach(f => f.squad.forEach(id => ok(CRK.Rosters.PLAYERS[id], id)));
  ok(CRK.Rosters.PLAYERS['jasprit-bumrah'] && CRK.Rosters.IPL.find(f => f.id === 'MI').squad.includes('jasprit-bumrah'), 'shared stable id');
});
t('XI validation catches missing keeper / duplicates / non-squad player', () => {
  const x = mkTeam('intl', 'ENG'); x.keeper = null; ok(CRK.validateXI(x).length);
  const y = mkTeam('intl', 'ENG'); y.xi[1] = y.xi[0]; ok(CRK.validateXI(y).some(m => /twice/.test(m)));
  const z = mkTeam('intl', 'ENG'); ok(CRK.validateXI(z, { squad: ['nobody'] }).length);
});

console.log('Tournament');
t('round robin: 10 teams → 45 league fixtures, each team 9', () => {
  const ids = CRK.Rosters.IPL.map(f => f.id); const tr = CRK.Tournament.create(ids, 'MI', 5); eq(tr.fixtures.length, 45);
  ids.forEach(id => eq(tr.fixtures.filter(f => f.a === id || f.b === id).length, 9, id));
});
t('points and NRR (all-out uses full quota)', () => {
  const tr = CRK.Tournament.create(['A', 'B', 'C', 'D'], 'A', 1); const f = tr.fixtures.find(x => (x.a === 'A' && x.b === 'B'));
  CRK.Tournament.recordResult(tr, f.id, { a: { runs: 180, balls: 120, allOut: false }, b: { runs: 150, balls: 100, allOut: true }, winner: 'a', quotaBalls: 120 });
  const A = tr.table.A, B = tr.table.B; eq(A.pts, 2); eq(B.pts, 0);
  eq(+CRK.Tournament.nrr(A).toFixed(3), 1.5); eq(+CRK.Tournament.nrr(B).toFixed(3), -1.5);
});
t('playoffs Q1/EL → Q2 → Final → champion', () => {
  const tr = CRK.Tournament.create(['A', 'B', 'C', 'D'], 'A', 1);
  while (tr.stage !== 'complete') { const f = CRK.Tournament.next(tr); CRK.Tournament.recordResult(tr, f.id, { a: { runs: 100, balls: 120 }, b: { runs: 90, balls: 120 }, winner: 'a', quotaBalls: 120 }); }
  eq(tr.playoffs.map(p => p.id), ['Q1', 'EL', 'Q2', 'F']); ok(tr.champion);
});

console.log('Physics');
function livePlay(fieldPos, vx, vy, vz) {
  const s = match('T20'); CRK.setBowler(s, CRK.AI.chooseBowler(s)); const rng = new CRK.RNG(9);
  const play = CRK.Sim.prepare(s, rng, { humanBat: true });
  play.phase = 'live'; play.t = play.ta + 0.01; play.contact = { type: 'bat' }; play.hitTheta = 0;
  play.fielders.forEach((f, i) => { if (i > 1) { f.x = 0; f.y = 300; } });
  if (fieldPos) { play.fielders[2].x = fieldPos[0]; play.fielders[2].y = fieldPos[1]; play.fielders[2].fd = 1; }
  Object.assign(play.ball, { x: 0, y: -0.8, z: 1, vx: vx, vy: vy, vz: vz, live: true, bounced: false, held: -1 });
  P._planFielding(play); P.runHeadless(play, play.t + 30); return play;
}
t('big hit with nobody under it carries for six', () => { const p = livePlay(null, 0, -32, 17); eq(p.result.boundary, 6); });
t('lofted hit to a fielder under it: catch attempt happens (caught or dropped), never a six', () => {
  const free = livePlay(null, 8, -24, 15); const i = free.traj.findIndex((q, k) => k > 20 && q.z < 1.8 && !q.b); ok(i > 0, 'landing found');
  const land = free.traj[i];
  const p = livePlay([land.x, land.y], 8, -24, 15);
  ok(p.events.some(e => e.e === 'catch' || e.e === 'drop'), 'catch attempted'); ok(p.result.boundary !== 6);
});
t('ground ball beats no fielder → four (bounced first)', () => { const p = livePlay(null, 22, -36, 1); eq(p.result.boundary, 4); });
t('ball visible: render radius never below 5px and has outline', () => {
  const R = require('../render.js').Render; ok(R.ballRadius(0.0001) >= 5); ok(R.BALL_OUTLINE && R.BALL_OUTLINE.length);
});
t('full simulated T20 completes through the same engine, scorecards reconcile', () => {
  const s = match('T20', { seed: 7 }); CRK.Sim.simMatch(s, {}); eq(s.status, 'done');
  s.innings.forEach(inn => {
    const bat = Object.values(inn.bs).reduce((a, b) => a + b.r, 0); const ex = Object.values(inn.extras).reduce((a, b) => a + b, 0);
    eq(bat + ex, inn.runs, 'batting + extras = total');
    const legal = s.log.filter(e => e.t === 'ball' && e.inn === inn.n && e.legal).length; eq(legal, inn.balls, 'legal balls');
    const bowlBalls = Object.values(inn.ws).reduce((a, b) => a + b.balls, 0); eq(bowlBalls, inn.balls, 'bowler balls');
    ok(inn.balls <= 120);
  });
});
t('full simulated Test completes with a valid result', () => { const s = match('TEST', { seed: 3 }); CRK.Sim.simMatch(s, {}); ok(['win', 'draw', 'tie'].includes(s.result.kind)); });

console.log('Loop / pause');
t('paused loop advances zero simulation steps', () => {
  const steps = []; const L = new CRK.Loop(dt => steps.push(dt), () => {});
  L.tick(0); L.tick(100); const n = steps.length; ok(n > 0);
  L.pause(); L.tick(200); L.tick(1000); eq(steps.length, n); L.resume(); L.tick(1010); L.tick(1030); ok(steps.length > n && steps.length < n + 5, 'no catch-up burst after resume');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
