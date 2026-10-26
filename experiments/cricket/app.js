/* BOC - Cricket controls update - Animesh - 26.10.2026 */
/* Cricket, Unreasonably Serious — UI controller.
   Rendering, physics, rules, AI and rosters live in their own files; this file wires them to the page.
   Player names and saved data are only ever inserted with textContent (never as HTML). */
(function () {
  'use strict';
  var CRK = window.CRK, P = CRK.Physics, R = CRK.Rosters, AI = CRK.AI, Sim = CRK.Sim, T = CRK.Tournament, AU = CRK.Audio;
  var LAB = window.LAB || null;
  var $ = function (id) { return document.getElementById(id); };
  var root = $('crk');

  /* ---------- safe DOM builder ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'text') n.textContent = v; else if (k === 'cls') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

  /* ---------- storage (Lab store when present, versioned, corruption-safe) ---------- */
  var SAVE_V = 1;
  var Store = {
    raw: function (k) { try { if (LAB && LAB.store) return LAB.store.get('crk.' + k, null); return localStorage.getItem('crk.' + k); } catch (e) { return null; } },
    put: function (k, v) { try { if (LAB && LAB.store) LAB.store.set('crk.' + k, v); else localStorage.setItem('crk.' + k, v); return true; } catch (e) { return false; } },
    get: function (k, fb) {
      var r = Store.raw(k); if (r == null) return fb;
      try { var o = typeof r === 'string' ? JSON.parse(r) : r; if (!o || o.v !== SAVE_V) throw new Error('version'); return o.d; }
      catch (e) { Store.put(k, null); notify('Saved data reset', 'A corrupted or outdated "' + k + '" save was discarded.'); return fb; }
    },
    set: function (k, d) { if (!Store.put(k, JSON.stringify({ v: SAVE_V, d: d }))) notify('Could not save', 'Browser storage is full or unavailable.'); },
    del: function (k) { Store.put(k, null); try { if (!(LAB && LAB.store)) localStorage.removeItem('crk.' + k); } catch (e) { } }
  };
  function notify(title, text) {
    if (LAB && typeof LAB.toast === 'function') { try { LAB.toast({ icon: '🏏', kicker: 'Cricket', title: title, text: text, ms: 3200 }); return; } catch (e) { } }
    var t = $('ticker'); if (t) t.textContent = title + ' — ' + text;
  }

  /* ---------- settings ---------- */
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var DEF = { commentary: 'light', assistTiming: false, assistRun: true, autoNext: false, reducedMotion: !!reduceMQ.matches, sound: true, labels: true, theme: 'day' };
  var S = Object.assign({}, DEF, Store.get('settings', {}));
  function saveSettings() { Store.set('settings', S); applySettings(); }
  function applySettings() { root.classList.toggle('reduced', !!S.reducedMotion); AU.enabledSetting = !!S.sound; AU.sync(); if (G.rd) G.rd.opts.reducedMotion = S.reducedMotion; }

  /* ---------- global state ---------- */
  var G = { setup: null, m: null, phase: 'none', play: null, rng: null, aim: 0, frames: [], replay: null, meterT: 0,
    bowlType: 'stock', target: null, fieldEdit: null, simming: false, postT: 0, rd: null, loop: null, paused: false, xiTeam: 0 };

  /* ---------- achievements & cosmetics ---------- */
  var ACH = [
    { id: 'crk-first-match', t: 'Whites Pressed', d: 'Complete any match.' },
    { id: 'crk-first-win', t: 'Unreasonably Victorious', d: 'Win a match.', unlock: 'twilight' },
    { id: 'crk-maximum', t: 'Postcode Change', d: 'Hit a six while batting.', unlock: 'night' },
    { id: 'crk-fifty', t: 'Half a Ton of Seriousness', d: 'Score 50 with one of your batters.' },
    { id: 'crk-hundred', t: 'The Full Ceremony', d: 'Score 100 with one of your batters.' },
    { id: 'crk-three-for', t: 'Three-Piece Suit', d: 'Take 3 wickets with one bowler (you bowling).' },
    { id: 'crk-five-wins', t: 'Habitual Winner', d: 'Win five matches.', unlock: 'monsoon' },
    { id: 'crk-associate', t: 'Associate Ambition', d: 'Win with Nepal or Netherlands against a Test nation.' },
    { id: 'crk-test-win', t: 'Five Days, No Regrets', d: 'Win a Test (any length).' },
    { id: 'crk-champion', t: 'Trophy Cabinet', d: 'Win the IPL-style tournament.', unlock: 'desert' },
    { id: 'crk-chase', t: 'Calm Under Pressure', d: 'Complete a chase challenge.' },
    { id: 'crk-daily', t: 'Daily Duty', d: 'Win today’s seeded challenge.' }
  ];
  var ACHS = Store.get('ach', {});
  function labHasAchievement(id) {
    var A = window.LAB_ACHIEVEMENTS; if (!A) return false;
    if (Array.isArray(A)) return A.some(function (a) { return a && a.id === id; });
    return Object.prototype.hasOwnProperty.call(A, id);
  }
  function unlock(id) {
    if (ACHS[id]) return; ACHS[id] = Date.now(); Store.set('ach', ACHS);
    var a = ACH.filter(function (x) { return x.id === id; })[0];
    if (LAB && typeof LAB.unlock === 'function' && labHasAchievement(id)) { try { LAB.unlock(id); return; } catch (e) { } }
    notify('Achievement: ' + a.t, a.d + (a.unlock ? ' Stadium unlocked: ' + CRK.Render.THEMES[a.unlock].name + '.' : ''));
    AU.cue('win');
  }
  function themeUnlocked(k) { if (k === 'day') return true; return ACH.some(function (a) { return a.unlock === k && ACHS[a.id]; }); }

  /* ---------- navigation ---------- */
  function show(id) {
    Array.prototype.forEach.call(document.querySelectorAll('.crk-screen'), function (s) { s.classList.toggle('is-active', s.id === 'scr-' + id); });
    G.screen = id;
    if (id !== 'match' && G.loop) { G.loop.stop(); AU.stopAll(); }
    if (id === 'home') renderHome(); if (id === 'career') renderCareer(); if (id === 'unlocks') renderUnlocks();
    if (id === 'settings') renderSettings(); if (id === 'about') renderAbout(); if (id === 'tour') renderTour(); if (id === 'challenges') renderChallenges();
    var h = document.querySelector('#scr-' + id + ' h1, #scr-' + id + ' h2'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { } }
  }

  function renderHome() {
    $('home-snapshot').textContent = 'Editable custom squads · IPL ' + R.IPL_SEASON;
    $('ipl-season-small').textContent = 'IPL ' + R.IPL_SEASON + ' squads · franchise match';
    var sv = Store.get('match', null);
    $('btn-resume').hidden = !sv;
    if (sv) $('resume-small').textContent = sv.label || 'Saved between deliveries';
    var d = dailyInfo(); $('daily-small').textContent = d.label + (Store.get('daily', {})[d.key] ? ' · completed ✓' : '');
  }

  /* ---------- teams ---------- */
  function kindFor(mode) { return mode === 'ipl' || mode === 'tour' ? 'ipl' : 'intl'; }
  function makeTeam(kind, id) {
    var t = R.team(kind, id), players = {};
    t.squad.forEach(function (pid) { var p = Object.assign({}, R.PLAYERS[pid]); p.overseas = kind === 'ipl' && R.isOverseas(pid); players[pid] = p; });
    var d = R.defaultXI(t.squad), xi = d.xi;
    if (kind === 'ipl') { // respect overseas cap in the default XI
      var os = function () { return xi.filter(function (x) { return players[x].overseas; }); };
      while (os().length > 4) {
        var out = os().filter(function (x) { return x !== d.keeper; }).pop();
        var rep = t.squad.filter(function (x) { return xi.indexOf(x) < 0 && !players[x].overseas && (!!players[x].bowl === !!players[out].bowl); })[0] ||
          t.squad.filter(function (x) { return xi.indexOf(x) < 0 && !players[x].overseas; })[0];
        if (!rep) break; xi[xi.indexOf(out)] = rep;
      }
      if (players[d.keeper].overseas && os().length > 4) d.keeper = xi.filter(function (x) { return players[x].role === 'WK'; })[0];
    }
    var team = { id: t.id, kind: kind, name: t.name, short: t.short, c1: t.c1, c2: t.c2, squad: t.squad.slice(), xi: xi, keeper: d.keeper,
      captain: xi.indexOf(t.capId) >= 0 ? t.capId : xi[0], players: players, impact: null, fictionalTest: kind === 'intl' && !t.test };
    if (kind === 'ipl') team.impact = t.squad.filter(function (x) { return xi.indexOf(x) < 0 && (team.xi.filter(function (y) { return players[y].overseas; }).length < 4 || !players[x].overseas); })[0] || null;
    return team;
  }
  function validationOpts(mode) {
    var o = { minBowlers: 5 };
    if (mode === 'ipl' || mode === 'tour') o.overseasMax = R.IPL_RULES.overseasMax;
    if (mode === 'nets' || mode === 'super' || mode === 'chase' || mode === 'daily') o.minBowlers = 1;
    return o;
  }

  /* ---------- setup screen ---------- */
  var FORMATS_BY_MODE = { intl: ['T20', 'ODI', 'TEST', 'TEST3', 'X10', 'X5', 'X2'], ipl: ['T20', 'X10', 'X5', 'X2'], super: ['SUPER'], nets: ['NETS'], tour: ['T20'] };
  function openSetup(mode, preset) {
    var kind = kindFor(mode), list = kind === 'ipl' ? R.IPL : R.INTL;
    G.setup = Object.assign({ mode: mode, kind: kind, format: FORMATS_BY_MODE[mode][0], diff: 'normal', theme: S.theme || 'day', a: list[4 % list.length].id, b: list[0].id }, preset || {});
    G.setup.teams = [makeTeam(kind, G.setup.a), makeTeam(kind, G.setup.b)];
    var fc = clear($('format-chips'));
    FORMATS_BY_MODE[mode].forEach(function (k) {
      var f = CRK.FORMATS[k];
      fc.appendChild(el('label', { cls: 'crk-chip' }, [el('input', { type: 'radio', name: 'fmt', value: k, checked: k === G.setup.format, onchange: function () { G.setup.format = k; refreshSetup(); } }), f.label]));
    });
    [['sel-a', 'a'], ['sel-b', 'b']].forEach(function (p) {
      var sel = clear($(p[0]));
      list.forEach(function (t) { sel.appendChild(el('option', { value: t.id, text: t.name + (t.test === false ? ' (Associate)' : ''), selected: t.id === G.setup[p[1]] })); });
      sel.onchange = function () { G.setup[p[1]] = sel.value; G.setup.teams[p[1] === 'a' ? 0 : 1] = makeTeam(kind, sel.value); refreshSetup(); };
    });
    var th = clear($('sel-theme'));
    Object.keys(CRK.Render.THEMES).forEach(function (k) { th.appendChild(el('option', { value: k, text: CRK.Render.THEMES[k].name + (themeUnlocked(k) ? '' : ' (locked)'), disabled: !themeUnlocked(k), selected: k === G.setup.theme })); });
    th.onchange = function () { G.setup.theme = th.value; S.theme = th.value; saveSettings(); };
    $('sel-diff').value = G.setup.diff; $('sel-diff').onchange = function () { G.setup.diff = $('sel-diff').value; };
    $('fs-nets').hidden = mode !== 'nets';
    $('sel-a').disabled = !!G.setup.lockTeams; $('sel-b').disabled = !!G.setup.lockTeams;
    $('setup-title').textContent = { intl: 'International match', ipl: 'IPL ' + R.IPL_SEASON + ' exhibition', super: 'Super Over', nets: 'Nets', tour: 'Tournament fixture' }[mode];
    refreshSetup(); show('setup');
  }
  function refreshSetup() {
    var st = G.setup, f = CRK.FORMATS[st.format];
    var notes = [];
    if (f.custom) notes.push('Custom/shortened variant — not an official full-format match.');
    else notes.push('Full format.');
    if (/TEST/.test(st.format)) notes.push('Test: up to two innings each, follow-on (' + f.followOn + '+ lead), declarations, ' + f.days + '-day clock (draws possible). No rain/DLS.');
    if (st.kind === 'ipl') notes.push('Custom franchise gameplay: max 4 overseas players and one nominated Impact Player.');
    $('format-note').textContent = notes.join(' ');
    [0, 1].forEach(function (i) {
      var t = st.teams[i], snap = (st.kind === 'ipl' ? 'IPL ' + R.IPL_SEASON + ' · ' : '') + 'Editable custom squad' + (/TEST/.test(st.format) && t.fictionalTest ? ' · FICTIONAL / CUSTOM Test participation' : '');
      $(i ? 'snap-b' : 'snap-a').textContent = snap;
      $(i ? 'xi-sum-b' : 'xi-sum-a').textContent = 'XI: ' + t.xi.map(function (id) { return t.players[id].name; }).join(', ');
    });
    clear($('setup-errors'));
  }
  function collectNetsRole() { var r = document.querySelector('input[name=netsrole]:checked'); return r ? r.value : 'bat'; }

  /* ---------- XI editor ---------- */
  function openXI(idx) {
    G.xiTeam = idx; var t = G.setup.teams[idx];
    $('xi-title').textContent = t.name + ' — playing XI';
    var vo = validationOpts(G.setup.mode);
    $('xi-rules').textContent = 'Pick 11 from the announced squad, then set order, keeper and captain. Ratings shown are game ratings (balancing estimates), not official ratings.' +
      (vo.overseasMax != null ? ' Max ' + vo.overseasMax + ' overseas players; nominate one Impact Player substitute.' : '');
    $('xi-impact-wrap').hidden = vo.overseasMax == null;
    renderXI(); show('xi');
  }
  function renderXI() {
    var t = G.setup.teams[G.xiTeam], sq = clear($('xi-squad')), ord = clear($('xi-order'));
    t.squad.forEach(function (id) {
      var p = t.players[id], on = t.xi.indexOf(id) >= 0;
      var cb = el('input', { type: 'checkbox', checked: on, 'aria-label': 'Select ' + p.name, onchange: function () {
        if (cb.checked && t.xi.indexOf(id) < 0) t.xi.push(id); if (!cb.checked) t.xi = t.xi.filter(function (x) { return x !== id; });
        if (t.impact === id) t.impact = null; renderXI(); } });
      sq.appendChild(el('li', null, [el('label', null, [cb, el('span', { text: p.name }),
        el('span', { cls: 'crk-badge', text: p.role }), el('span', { cls: 'crk-badge', text: (p.bat === 'L' ? 'LHB' : 'RHB') + (p.bowl ? ' · ' + p.bowl : '') }),
        p.overseas ? el('span', { cls: 'crk-badge crk-badge--os', text: 'Overseas' }) : null,
        el('span', { cls: 'crk-badge', text: 'Bat ' + Math.round((p.displayRatings ? p.displayRatings.bt : p.bt) * 100) + ' / Bowl ' + Math.round((p.displayRatings ? p.displayRatings.bw : p.bw) * 100) })])]));
    });
    t.xi.forEach(function (id, i) {
      var p = t.players[id];
      ord.appendChild(el('li', null, [el('span', { cls: 'nm', text: p.name + (id === t.captain ? ' (c)' : '') + (id === t.keeper ? ' †' : '') }),
        el('button', { cls: 'crk-btn crk-btn--icon', 'aria-label': 'Move ' + p.name + ' up', disabled: i === 0, onclick: function () { var a = t.xi; a.splice(i - 1, 0, a.splice(i, 1)[0]); renderXI(); } }, ['↑']),
        el('button', { cls: 'crk-btn crk-btn--icon', 'aria-label': 'Move ' + p.name + ' down', disabled: i === t.xi.length - 1, onclick: function () { var a = t.xi; a.splice(i + 1, 0, a.splice(i, 1)[0]); renderXI(); } }, ['↓'])]));
    });
    [['xi-keeper', 'keeper'], ['xi-captain', 'captain']].forEach(function (q) {
      var s = clear($(q[0])); s.appendChild(el('option', { value: '', text: '— choose —' }));
      t.xi.forEach(function (id) { s.appendChild(el('option', { value: id, text: t.players[id].name, selected: t[q[1]] === id })); });
      s.onchange = function () { t[q[1]] = s.value || null; renderXI(); };
    });
    var im = clear($('xi-impact')); im.appendChild(el('option', { value: '', text: '— none —' }));
    t.squad.filter(function (id) { return t.xi.indexOf(id) < 0; }).forEach(function (id) { im.appendChild(el('option', { value: id, text: t.players[id].name + (t.players[id].overseas ? ' (overseas)' : ''), selected: t.impact === id })); });
    im.onchange = function () { t.impact = im.value || null; renderXI(); };
    var errs = CRK.validateXI(t, Object.assign({ squad: t.squad }, validationOpts(G.setup.mode)));
    var eu = clear($('xi-errors')); errs.forEach(function (e) { eu.appendChild(el('li', { text: e })); });
  }

  /* ---------- toss ---------- */
  function toToss() {
    var st = G.setup, errs = [];
    if (st.a === st.b && st.mode !== 'nets') errs.push('Choose two different teams.');
    [0, 1].forEach(function (i) { CRK.validateXI(st.teams[i], Object.assign({ squad: st.teams[i].squad }, validationOpts(st.mode))).forEach(function (e) { errs.push(st.teams[i].name + ': ' + e); }); });
    var eu = clear($('setup-errors')); errs.forEach(function (e) { eu.appendChild(el('li', { text: e })); });
    if (errs.length) return;
    st.diff = $('sel-diff').value;
    if (st.mode === 'nets') { st.netsRole = collectNetsRole(); return startMatch(st.netsRole === 'bat' ? 0 : 1); }
    $('toss-text').textContent = st.teams[0].name + ' to call.'; $('toss-call').hidden = false; $('toss-choose').hidden = true; $('toss-go').hidden = true;
    show('toss');
  }
  function doToss(call) {
    var coin = $('coin'), res = Math.random() < 0.5 ? 'H' : 'T';
    coin.classList.remove('spin'); void coin.offsetWidth; coin.classList.add('spin');
    $('toss-call').hidden = true;
    setTimeout(function () {
      coin.firstChild.textContent = res; var st = G.setup;
      if (res === call) { $('toss-text').textContent = 'You won the toss (' + (res === 'H' ? 'heads' : 'tails') + '). Bat or bowl?'; $('toss-choose').hidden = false; }
      else {
        var aiBat = /TEST/.test(st.format) ? true : Math.random() < 0.4;
        st.batFirst = aiBat ? 1 : 0;
        $('toss-text').textContent = st.teams[1].name + ' won the toss and chose to ' + (aiBat ? 'bat' : 'bowl') + '.'; $('toss-go').hidden = false;
      }
    }, S.reducedMotion ? 50 : 1600);
  }

  /* ---------- match start ---------- */
  function startMatch(batFirst, extra) {
    var st = G.setup; extra = extra || {};
    var seed = extra.seed || (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    var teams = st.teams.map(function (t) { return JSON.parse(JSON.stringify(t)); });
    var cfg = { format: st.format, seed: seed, teams: teams, battingFirst: batFirst, target: extra.target, overs: extra.overs, wickets: extra.wickets };
    var s = CRK.newMatch(cfg);
    G.m = { s: s, mode: st.mode, user: 0, diff: st.diff, theme: st.theme || S.theme, tour: st.tourFixture || null, challenge: extra.challenge || null,
      daily: extra.daily || null, netsRole: st.netsRole || null, label: teams[0].short + ' v ' + teams[1].short + ' · ' + CRK.FORMATS[st.format].label };
    enterMatch();
  }
  function enterMatch() {
    if (window.CRKUpdate) window.CRKUpdate.refresh(G);
    show('match');
    if (!G.rd) { G.rd = new CRK.Render($('cv'), { reducedMotion: S.reducedMotion }); bindStage(); }
    G.rd.opts.reducedMotion = S.reducedMotion;
    G.rd.resize(); G.rd.setCamera('delivery', null, true);
    if (!G.loop) G.loop = new CRK.Loop(update, draw);
    G.loop.resume(); G.loop.start(); G.paused = false;
    AU.crowdStart();
    G.rng = Sim.rng(G.m.s);
    G.play = null; G.phase = 'between';
    afterState(true);
  }
  function userBatting() { var s = G.m.s; return CRK.cur(s).bat === G.m.user; }
  function userBowling() { var s = G.m.s; return CRK.cur(s).bowl === G.m.user; }
  function curTeams() { var s = G.m.s, inn = CRK.cur(s); return { bat: s.teams[inn.bat], bowl: s.teams[inn.bowl] }; }
  function pl(teamIdx, id) { return G.m.s.teams[teamIdx].players[id]; }

  /* Decide what happens next based on the rules-engine state machine */
  function afterState(initial) {
    var s = G.m.s;
    hud();
    if (s.status === 'done') return onMatchDone();
    if (s.status === 'break') return inningsBreak();
    if (s.status === 'decision') return followOnDecision();
    if (s.status === 'bowler') {
      if (userBowling()) return chooseBowlerModal();
      CRK.setBowler(s, AI.chooseBowler(s)); hud();
    }
    G.phase = 'between'; showControls();
    G.autoT = initial ? 3 : -1;
    saveMatch();
  }

  /* ---------- controls visibility ---------- */
  function showControls() {
    var ph = G.phase, s = G.m && G.m.s, live = G.play && G.play.ball.live && !G.play.done;
    var ub = s && userBatting(), uw = s && userBowling();
    $('ctl-between').hidden = ph !== 'between';
    $('ctl-bat').hidden = !(ph === 'play' && ub && G.play && !G.play.contact);
    $('ctl-run').hidden = !(ph === 'play' && ub && live && G.play.contact);
    $('ctl-bowl').hidden = ph !== 'bowlAim';
    $('ctl-field').hidden = ph !== 'field';
    $('ctl-skip').hidden = !((ph === 'play' && (!ub || (G.play && G.play.contact && S.assistRun))) || ph === 'replay' || ph === 'sim');
    $('timing').hidden = !(ph === 'play' && ub && S.assistTiming && G.play && !G.play.contact);
    if (s) {
      var f = CRK.FORMATS[s.format];
      $('btn-declare').hidden = !(f.innings === 2 && ub && ph === 'between');
      var me = s.teams[G.m.user];
      $('btn-impact').hidden = !(me.impact && !me.impactUsed && ph === 'between' && G.m.mode !== 'nets');
      $('btn-field').hidden = !uw; $('btn-replay').disabled = !G.frames.length;
      Array.prototype.forEach.call(document.querySelectorAll('[data-act=sim-over],[data-act=sim-inn]'), function (b) { b.hidden = !!f.nets; });
      var ex = $('btn-exit'); if (ex) ex.hidden = !f.nets;
    }
  }

  /* ---------- between balls ---------- */
  function nextBall() {
    var s = G.m.s; if (s.status !== 'ready' || G.phase !== 'between') return;
    G.rng = Sim.rng(s);
    if (userBowling()) return startBowlAim();
    launchPlay(null);
  }
  function opts() {
    return { humanBat: userBatting(), humanBowl: userBowling(), assistedRun: S.assistRun, assistedTiming: S.assistTiming, difficulty: G.m.diff, aiDifficulty: G.m.diff };
  }
  function launchPlay(bowlSpec) {
    var s = G.m.s, o = opts();
    G.play = Sim.prepare(s, G.rng, o, bowlSpec);
    G.frames = []; G.frameTick = 0; G.phase = 'play'; G.lastEvIdx = 0; G.broken = null;
    G.rd.setCamera(o.humanBowl ? 'bowl' : 'delivery', null, true);
    $('feedback').classList.remove('show');
    showControls();
  }

  /* ---------- human bowling ---------- */
  function startBowlAim() {
    var s = G.m.s, inn = CRK.cur(s), b = pl(inn.bowl, inn.bowler), st = pl(inn.bat, inn.striker), off = P.offSign(st.bat);
    var types = P.deliveryTypes(b.bowl || 'RM');
    if (types.indexOf(G.bowlType) < 0) G.bowlType = 'stock';
    var cls = P.styleClass(b.bowl || 'RM');
    G.target = G.target && G.target.hand === st.bat ? G.target : { x: off * 0.12, len: cls === 'finger' || cls === 'wrist' ? 4.6 : 6.6, hand: st.bat };
    var box = clear($('bowl-types'));
    types.forEach(function (t, i) {
      box.appendChild(el('button', { cls: 'crk-btn', role: 'radio', 'aria-checked': String(t === G.bowlType), text: (i + 1) + ' · ' + P.TYPE_LABEL[t],
        onclick: function () { G.bowlType = t; startBowlAim(); } }));
    });
    $('bowl-hint').textContent = b.name + ' (' + (b.bowl || 'part-time') + ') to ' + st.name + ' (' + (st.bat === 'L' ? 'LHB' : 'RHB') + ') · tap the pitch to aim, release in the green.';
    G.meterT = 0; G.phase = 'bowlAim'; G.rd.setCamera('bowl', null, true); showControls(); if (window.CRKUpdate) window.CRKUpdate.bowling(G);
  }
  function meterPos() {
    var sp = { easy: 2.1, normal: 2.9, hard: 3.5, legend: 4.0 }[G.m.diff] * (S.assistTiming ? 0.7 : 1);
    return 0.5 + 0.5 * Math.sin(G.meterT * sp);
  }
  function release() {
    if (G.phase !== 'bowlAim') return;
    var m = meterPos(), err = (m - 0.5) * 2;
    if (Math.abs(err) < 0.1) err = 0; // green zone = perfect release
    AU.cue('click');
    launchPlay({ type: G.bowlType, line: G.target.x, length: G.target.len, speed: G.deliverySpeed || 1, err: err });
  }

  /* ---------- per-step update ---------- */
  function update(dt) {
    if (!G.m) return;
    if (G.phase === 'bowlAim') { G.meterT += dt; return; }
    if (G.phase === 'between' && G.autoT > 0) { G.autoT -= dt; if (G.autoT <= 0) { G.autoT = -1; nextBall(); } return; }
    if (G.phase === 'post') { G.postT -= dt; if (G.postT <= 0) finishPost(); return; }
    if (G.phase === 'replay') { G.replay.i += dt * 60 * (S.reducedMotion ? 1 : 0.5); if (G.replay.i >= G.frames.length - 1) endReplay(); return; }
    if (G.phase !== 'play' || !G.play) return;
    var play = G.play;
    if (play.ai && play.ai.shotAt != null && !play.shot && play.t >= play.ai.shotAt) P.inputShot(play, play.ai.kind, play.ai.angle);
    P.step(play, dt);
    if ((G.frameTick++ & 1) === 0 && play.phase !== 'runup') G.frames.push(snapshot(play));
    processEvents(play);
    if (play.done) onPlayDone();
  }
  function snapshot(play) {
    return { b: { x: play.ball.x, y: play.ball.y, z: play.ball.z }, f: play.fielders.map(function (f) { return [f.x, f.y, f.anim]; }),
      r: { p: play.run.p, d: play.run.done, a: play.run.active }, t: play.t, sw: play.swingT, live: play.ball.live, held: play.ball.held };
  }
  function processEvents(play) {
    for (; G.lastEvIdx < play.events.length; G.lastEvIdx++) {
      var e = play.events[G.lastEvIdx];
      if (e.e === 'contact') {
        AU.bat(e.q || 0.3);
        if (userBatting()) flash(e.timing || '');
        G.rd.setCamera('field', play.ball, false); showControls();
      } else if (e.e === 'release') { if (S.assistTiming && userBatting() && play.plan.bounce) G.bounceCue = { x: play.plan.bounce.x, y: play.plan.bounce.y }; }
      else if (e.e === 'boundary') { AU.cheer(e.n === 6 ? 1 : 0.7); G.cheer = 1; if (e.n === 6) G.rd.burst(play.ball.x, play.ball.y, 3, ['#ffcf4a', '#ff4fa3', '#4dabf7', '#ffffff'], 0.5); flash(e.n === 6 ? 'SIX!' : 'FOUR!'); }
      else if (e.e === 'bowled' || e.e === 'runout' || e.e === 'stumped') { AU.stumps(); G.rd.shake = 0.6; G.broken = e.e === 'runout' ? (e.end === 'striker' ? [1, 0] : [0, 1]) : [1, 0]; flash(e.e === 'runout' ? 'RUN OUT?' : e.e === 'stumped' ? 'STUMPED!' : 'BOWLED!'); }
      else if (e.e === 'catch') { AU.cheer(0.8); G.cheer = 1; flash('CAUGHT!'); }
      else if (e.e === 'lbw') { AU.cue('error'); flash('LBW!'); }
      else if (e.e === 'drop') { AU.cheer(0.5); flash('Dropped!'); }
      else if (e.e === 'pad') { AU.cue('thud'); }
      else if (e.e === 'runDone') { AU.cue('click'); }
    }
  }
  function flash(txt) { var f = $('feedback'); f.textContent = txt; f.classList.add('show'); clearTimeout(G.flashT); G.flashT = setTimeout(function () { f.classList.remove('show'); }, 1100); }

  function onPlayDone() {
    var s = G.m.s, play = G.play, inn = CRK.cur(s);
    var names = { bowler: pl(inn.bowl, inn.bowler).name, striker: pl(inn.bat, inn.striker).name };
    var ev = Sim.commit(s, play, G.rng);
    G.lastPlayFielders = play.fielders.map(function (f) { return { role: f.role, id: f.id, fd: f.fd }; });
    if (ev.outId) names.how = CRK.cur(s).bs[ev.outId] ? CRK.cur(s).bs[ev.outId].out : s.innings[ev.inn].bs[ev.outId].out;
    if (ev.outId) names.striker = pl(s.innings[ev.inn].bat, ev.outId).name;
    var line = CRK.Commentary.line(S.commentary, ev, names, Math.random);
    $('ticker').textContent = line;
    $('sr-live').textContent = describeBall(ev);
    G.bounceCue = null;
    ballAchievements(ev);
    G.phase = 'post'; G.postT = 3; showControls();
  }
  function finishPost() { G.rd.setCamera('delivery', null, false); G.play = null; G.broken = null; afterState(false); if (G.phase === 'between' && !G.paused && G.m.s.status === 'ready') { G.autoT = -1; nextBall(); } }
  function describeBall(ev) {
    var d = ev.d, txt = ev.over + ': ';
    if (ev.outId) txt += 'Wicket. '; if (d.extra === 'wd') txt += 'Wide. '; if (d.extra === 'nb') txt += 'No-ball. ';
    txt += ev.total + ' run' + (ev.total === 1 ? '' : 's') + '.'; return txt;
  }
  function skip() {
    if (G.phase === 'replay') return endReplay();
    if (G.phase === 'sim') { G.simAbort = true; return; }
    if (G.phase === 'play' && G.play) {
      if (!G.play.shot && G.play.ai && G.play.ai.shotAt != null) { /* AI shot fires inside runHeadless */ }
      if (userBatting() && !G.play.contact) return; // never skip the human's shot
      G.play.ai = G.play.ai || { shotAt: null };
      P.runHeadless(G.play); processEvents(G.play); onPlayDone(); G.postT = 0.3;
    }
  }

  /* ---------- replay ---------- */
  function startReplay() { if (!G.frames.length || G.phase !== 'between') return; G.replay = { i: 0 }; G.phase = 'replay'; G.rd.setCamera('field', null, true); showControls(); }
  function endReplay() { G.replay = null; G.phase = 'between'; G.rd.setCamera('delivery', null, true); showControls(); }

  /* ---------- HUD ---------- */
  function hud() {
    var s = G.m.s, inn = CRK.cur(s), f = CRK.FORMATS[s.format], bt = s.teams[inn.bat], lim = CRK.oversLimit(s);
    $('sb-team').textContent = bt.short + (f.innings === 2 ? ' · ' + ordinal(inn.n + 1) + ' inns' + (inn.followOn ? ' (f/o)' : '') : '');
    $('sb-runs').textContent = inn.runs + '/' + inn.wkts;
    $('sb-overs').textContent = CRK.oversText(inn.balls) + (lim && !f.nets ? ' / ' + lim : '') + ' ov';
    var tags = [];
    if (s.freeHit) tags.push('FREE HIT'); if (CRK.inPowerplay(s) && !f.nets) tags.push('POWERPLAY');
    if (f.custom) tags.push('CUSTOM'); if (/TEST/.test(s.format) && s.teams.some(function (t) { return t.fictionalTest; })) tags.push('FICTIONAL TEST');
    $('sb-tag').textContent = tags.join(' · ');
    var bl = function (id, star) { if (!id) return ''; var b = inn.bs[id]; return pl(inn.bat, id).name + (star ? '*' : '') + ' ' + b.r + ' (' + b.b + ')'; };
    $('sb-bat1').textContent = bl(inn.striker, true); $('sb-bat2').textContent = bl(inn.non, false);
    if (inn.bowler || inn.lastBowler) { var id = inn.bowler || inn.lastBowler, w = inn.ws[id]; $('sb-bowl').textContent = 'Bowling: ' + pl(inn.bowl, id).name + ' ' + CRK.oversText(w.balls) + '-' + w.md + '-' + w.r + '-' + w.w; }
    else $('sb-bowl').textContent = '';
    var info = 'CRR ' + CRK.runRate(inn).toFixed(2);
    var rr = CRK.requiredRate(s);
    if (rr && !f.nets) info = 'Need ' + rr.need + ' from ' + rr.balls + ' · RRR ' + (isFinite(rr.rrr) ? rr.rrr.toFixed(2) : '—') + ' · ' + info;
    if (s.clock) {
      var ci = CRK.clockInfo(s), lead = CRK.totals(s, inn.bat) - CRK.totals(s, 1 - inn.bat);
      info = ['Day ' + ci.day + ' · Session ' + ci.session, inn.n === 0 ? '' : lead >= 0 ? 'Lead ' + lead : 'Trail ' + (-lead), inn.target ? 'Target ' + inn.target : '', ci.oversLeftMatch + ' ov left in match'].filter(Boolean).join(' · ');
    }
    $('sb-info').textContent = info;
    $('sb-part').textContent = 'P\'ship ' + inn.part.r + ' (' + inn.part.b + ')';
    var ov = clear($('sb-over'));
    var balls = inn.over.length ? inn.over : (inn.overs.length ? inn.overs[inn.overs.length - 1].balls : []);
    balls.forEach(function (l) { var c = /W/.test(l) ? 'bw' : l === '4' ? 'b4' : l === '6' ? 'b6' : /wd|nb|b|lb/.test(l) ? 'bx' : ''; ov.appendChild(el('i', { cls: c, text: l === '0' ? '•' : l })); });
    $('cv').setAttribute('aria-label', bt.name + ' ' + inn.runs + ' for ' + inn.wkts + ' after ' + CRK.oversText(inn.balls) + ' overs');
  }
  function ordinal(n) { return n + (['th', 'st', 'nd', 'rd'][n] || 'th'); }

  /* ---------- draw ---------- */
  function draw(elapsed) {
    if (!G.m || !G.rd) return;
    var rd = G.rd, s = G.m.s, inn = CRK.cur(s);
    rd.update(elapsed);
    G.time = (G.time || 0) + elapsed; G.cheer = Math.max(0, (G.cheer || 0) - elapsed * 0.5);
    var scene = { theme: G.m.theme, time: G.time, cheer: G.cheer, people: [], ballColor: /TEST/.test(s.format) ? '#c41e2a' : '#f6f6f2', broken: G.broken };
    var striker = inn.striker ? pl(inn.bat, inn.striker) : null, non = inn.non ? pl(inn.bat, inn.non) : null;
    var off = striker ? P.offSign(striker.bat) : -1, batT = s.teams[inn.bat], bowlT = s.teams[inn.bowl];
    var play = G.play, fr = G.phase === 'replay' && G.replay ? G.frames[Math.floor(G.replay.i)] : null;
    var fielders, ball = null, run = { p: 0, d: 0, a: false }, t = 0, swingT = -1;
    if (fr) { var base = play ? play.fielders : (G.lastPlayFielders || []); fielders = base.map(function (f, i) { return Object.assign({}, f, { x: fr.f[i][0], y: fr.f[i][1], anim: fr.f[i][2] }); }); ball = fr.b; run = fr.r; t = fr.t; swingT = fr.sw; }
    else if (play) { fielders = play.fielders; ball = play.ball; run = { p: play.run.p, d: play.run.done, a: play.run.active, dir: play.run.dir }; t = play.t; swingT = play.swingT; rd.followBall(ball); }
    else if (inn.bowler && striker) { fielders = Sim.fieldFor(s, pl(inn.bowl, inn.bowler), striker).field; }
    else fielders = [];
    if (G.phase === 'field' && G.fieldEdit) fielders = G.fieldEdit.field;
    // fielders
    (fielders || []).forEach(function (f, i) {
      if (i === 1 && play && play.phase === 'runup') return; // bowler drawn separately during run-up
      var p = f.id ? bowlT.players[f.id] : null;
      scene.people.push({ x: f.x, y: f.y, c1: bowlT.c1, c2: bowlT.c2, moving: f.act === 'chase' || f.act === 'backup', anim: f.anim || 0,
        gloves: f.role === 'keeper', pads: f.role === 'keeper', label: S.labels && G.phase === 'field' && p ? p.name.split(' ').slice(-1)[0] : null,
        ring: G.fieldEdit && G.fieldEdit.sel === i ? '#ffcf4a' : null });
    });
    if (play && play.phase === 'runup') {
      var k = play.t / P.RUNUP; scene.people.push({ x: play.plan.p0.x * 1.4, y: -34 + 12.5 * k, c1: bowlT.c1, c2: bowlT.c2, moving: true, anim: k * 18, armAngle: k > 0.85 ? 3.1 : 0.4 });
    }
    // batters: positions follow the run state
    if (striker && non) {
      var sEnd = -0.55, nEnd = -PITCH_N + 1.0, prog = run.a ? run.p : 0, swapped = run.d % 2 === 1;
      var aY = sEnd + (nEnd - sEnd) * prog, bY = nEnd + (sEnd - nEnd) * prog;
      if (swapped) { var tmp = aY; aY = bY; bY = tmp; }
      var batAngle = 2.7;
      if (play && play.phase === 'flight') batAngle = 3.5;
      if (swingT >= 0) { var sk = Math.min(1, (t - swingT) / 0.38); batAngle = 3.7 - sk * 3.1; }
      var sx = -off * 0.32;
      scene.people.push({ x: sx, y: aY, c1: batT.c1, c2: batT.c2, pads: true, helmet: true, bat: true, batAngle: run.a ? 2.4 : batAngle, gloves: true, moving: run.a, anim: prog * 20, label: S.labels && G.phase === 'between' ? striker.name.split(' ').slice(-1)[0] + '*' : null });
      scene.people.push({ x: off * 0.9, y: bY, c1: batT.c1, c2: batT.c2, pads: true, helmet: true, bat: true, batAngle: 2.4, gloves: true, moving: run.a, anim: prog * 20 });
    }
    scene.people.push({ x: 0.9 * off, y: -PITCH_N - 2.6, c1: '#f2f2ee', c2: '#1d1d1d' });
    scene.people.push({ x: -off * 26, y: -0.8, c1: '#f2f2ee', c2: '#1d1d1d' });
    if (ball && (!play || play.phase !== 'runup' || fr)) scene.ball = { x: ball.x, y: ball.y, z: ball.z };
    if (play && !fr) scene.trail = play.trail;
    if (G.phase === 'bowlAim' && G.target) scene.bowlTarget = { x: G.target.x, len: G.target.len };
    if (G.bounceCue && play && !play.contact) scene.bounceCue = G.bounceCue;
    if (G.phase === 'play' && play && userBatting() && !play.contact) { scene.aim = aimField(); scene.offSign = off; }
    // keep near-camera figures from blocking the delivery (field and replay views show everyone)
    if (!rd.camTo && rd.mode === 'delivery') scene.people = scene.people.filter(function (p) { return p.y < 0.8; });
    if (!rd.camTo && rd.mode === 'bowl') scene.people = scene.people.filter(function (p) { return p.y > -15; });
    rd.draw(scene);
    if (G.phase === 'bowlAim') $('meter-needle').style.left = (meterPos() * 100).toFixed(1) + '%';
    if (!$('timing').hidden && play) {
      var rel = P.RUNUP, ideal = play.ta - P.SWING_LAG, k2 = Math.max(0, Math.min(1, (play.t - rel) / (play.ta - rel)));
      var z = (ideal - rel) / (play.ta - rel), w = (S.assistTiming ? 0.055 * 1.6 : 0.055) / (play.ta - rel);
      $('timing-fill').style.height = (k2 * 100).toFixed(1) + '%';
      var zone = $('timing-zone'); zone.style.bottom = ((z - w) * 100).toFixed(1) + '%'; zone.style.height = (2 * w * 100).toFixed(1) + '%';
    }
  }
  var PITCH_N = 20.12;

  /* ---------- aiming ---------- */
  function aimField() { // screen angle → field angle for the current striker
    var s = G.m.s, inn = CRK.cur(s), st = pl(inn.bat, inn.striker); return P.offSign(st.bat) === -1 ? G.aim : -G.aim;
  }
  function setAim(deg) {
    G.aim = Math.max(-178, Math.min(178, deg));
    var r = 52, a = G.aim * Math.PI / 180, k = $('aimknob');
    k.style.left = 'calc(50% + ' + (Math.sin(a) * r).toFixed(1) + 'px)'; k.style.top = 'calc(50% - ' + (Math.cos(a) * r).toFixed(1) + 'px)';
    var fa = G.m ? aimField() : G.aim, A = Math.abs(fa), side = fa >= 0 ? 'off' : 'leg';
    var lab = A < 15 ? 'Straight' : A < 60 ? (side === 'off' ? 'Cover' : 'Mid-wicket') : A < 110 ? (side === 'off' ? 'Point' : 'Square leg') : (side === 'off' ? 'Third man' : 'Fine leg');
    $('aimlabel').textContent = lab; $('aimpad').setAttribute('aria-valuenow', String(Math.round(fa))); $('aimpad').setAttribute('aria-valuetext', lab);
  }
  function shot(kind) {
    if (G.phase !== 'play' || !G.play || !userBatting()) return;
    if (G.play.phase === 'runup') { flash('Wait for the release'); return; }
    if (kind === 'leave') { P.inputShot(G.play, 'leave', 0); return; }
    P.inputShot(G.play, kind, aimField());
  }

  /* ---------- stage input (touch + mouse + pen) ---------- */
  function bindStage() {
    var stage = $('stage'), cv = $('cv'), pad = $('aimpad');
    // keep gameplay gestures from scrolling the page (page scroll outside the stage is untouched)
    ['touchstart', 'touchmove'].forEach(function (ev) { stage.addEventListener(ev, function (e) { if (!e.target.closest('canvas, .crk-aimpad, [data-shot]')) return; e.preventDefault(); }, { passive: false }); });
    var padDrag = false;
    function padAt(e) { var r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); if (Math.hypot(dx, dy) > 8) setAim(Math.atan2(dx, -dy) * 180 / Math.PI); }
    pad.addEventListener('pointerdown', function (e) { padDrag = true; pad.setPointerCapture(e.pointerId); padAt(e); });
    pad.addEventListener('pointermove', function (e) { if (padDrag) padAt(e); });
    pad.addEventListener('pointerup', function () { padDrag = false; });
    pad.addEventListener('pointercancel', function () { padDrag = false; });
    pad.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { setAim(G.aim - 10); e.preventDefault(); } if (e.key === 'ArrowRight') { setAim(G.aim + 10); e.preventDefault(); } });
    Array.prototype.forEach.call(document.querySelectorAll('[data-shot]'), function (b) { b.addEventListener('pointerdown', function (e) { e.preventDefault(); shot(b.getAttribute('data-shot')); }); b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shot(b.getAttribute('data-shot')); } }); });
    var drag = null;
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, g = G.rd.unproject(x, y);
      if (G.phase === 'bowlAim' && g) { setTarget(g.x, -g.y); return; }
      if (G.phase === 'replay') { endReplay(); return; }
      if (G.phase === 'field' && g) {
        var best = -1, bd = 6; G.fieldEdit.field.forEach(function (f, i) { if (f.role !== 'field') return; var d = Math.hypot(f.x - g.x, f.y - g.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { drag = best; G.fieldEdit.sel = best; cv.setPointerCapture(e.pointerId); }
      }
    });
    cv.addEventListener('pointermove', function (e) {
      if (drag == null || G.phase !== 'field') return; var r = cv.getBoundingClientRect(), g = G.rd.unproject(e.clientX - r.left, e.clientY - r.top); if (!g) return;
      var gr = P.ground(); if (P.outside(gr, g.x * 1.04, (g.y + 10.06) * 1.04 - 10.06)) return;
      if (Math.abs(g.x) < 2 && g.y > -21 && g.y < 2) return; // not on the pitch
      var f = G.fieldEdit.field[drag]; f.x = g.x; f.y = g.y; fieldHint();
    });
    cv.addEventListener('pointerup', function () { drag = null; });
    window.addEventListener('resize', function () { if (G.rd && G.screen === 'match') G.rd.resize(); });
  }
  function setTarget(x, len) { G.target.x = Math.max(-1.6, Math.min(1.6, x)); G.target.len = Math.max(0.2, Math.min(13.5, len)); }

  // BOC - Cricket keyboard controls - Animesh - 26.10.2026
  var heldDirections = new Set();
  function keyboardAim() {
    var x = (heldDirections.has('d') || heldDirections.has('arrowright') ? 1 : 0) - (heldDirections.has('a') || heldDirections.has('arrowleft') ? 1 : 0);
    var y = (heldDirections.has('s') || heldDirections.has('arrowdown') ? 1 : 0) - (heldDirections.has('w') || heldDirections.has('arrowup') ? 1 : 0);
    if (x || y) setAim(Math.atan2(x, -y) * 180 / Math.PI);
  }
  document.addEventListener('keyup', function(e) { heldDirections.delete(e.key.toLowerCase()); });
  window.addEventListener('blur', function() { heldDirections.clear(); });
  document.addEventListener('keydown', function (e) {
    if (G.screen !== 'match' || !G.m) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    var k = e.key.toLowerCase(), used = true;
    if (k === 'p' || k === 'escape') { pause(); e.preventDefault(); return; }
    if (G.paused) return;
    if (G.phase === 'play' && userBatting()) {
      if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].indexOf(k) >= 0) { heldDirections.add(k); keyboardAim(); }
      else if (k === ' ') { if (!e.repeat) shot('leave'); }
      else if (k === 'shift') { if (!e.repeat) shot('loft'); }
      else if (k === 'capslock') { if (!e.repeat) shot('ground'); }
      else if (k === 'tab') { if (!e.repeat) shot('defend'); }
      else if (k === 'r') P.inputRun(G.play);
      else if (k === 'e') P.inputReturn(G.play);
      else used = false;
    } else if (G.phase === 'bowlAim') {
      var t = G.target;
      if (k === 'arrowleft' || k === 'a') setTarget(t.x + 0.05, t.len);
      else if (k === 'arrowright' || k === 'd') setTarget(t.x - 0.05, t.len);
      else if (k === 'arrowup' || k === 'w') setTarget(t.x, t.len + 0.4);
      else if (k === 'arrowdown' || k === 's') setTarget(t.x, t.len - 0.4);
      else if (k === ' ') { if (!e.repeat) release(); }
      else if (/^[1-6]$/.test(k)) { var ty = $('bowl-types').children[+k - 1]; if (ty) ty.click(); }
      else used = false;
      if (window.CRKUpdate) window.CRKUpdate.sync(G);
    } else if (k === 'n' && G.phase === 'between') nextBall();
    else if (k === 'c') scorecard();
    else if (k === 'f' && G.phase === 'between' && userBowling()) openField();
    else used = false;
    if (used) e.preventDefault();
  });
  // EOC - Cricket keyboard controls - Animesh - 26.10.2026

  /* ---------- modal helpers ---------- */
  function modal(title, body, opts) {
    $('modal-title').textContent = title; var b = clear($('modal-body')); (Array.isArray(body) ? body : [body]).forEach(function (n) { b.appendChild(n); });
    $('modal').hidden = false; G.modalLock = !!(opts && opts.lock);
    document.querySelector('#modal [data-act=modal-close]').hidden = G.modalLock;
    var f = b.querySelector('button, select'); if (f) f.focus();
  }
  function closeModal() { if (G.modalLock) return; $('modal').hidden = true; if (G.modalOnClose) { var f = G.modalOnClose; G.modalOnClose = null; f(); } }
  function forceClose() { G.modalLock = false; $('modal').hidden = true; G.modalOnClose = null; }

  /* ---------- bowler choice ---------- */
  function chooseBowlerModal() {
    var s = G.m.s, inn = CRK.cur(s), list = el('ul', { cls: 'crk-cards' });
    var sugg = AI.chooseBowler(s);
    CRK.eligibleBowlers(s).forEach(function (id) {
      var p = pl(inn.bowl, id), w = inn.ws[id];
      list.appendChild(el('li', null, [el('h3', { text: p.name + (id === sugg ? ' — suggested' : '') }),
        el('p', { cls: 'crk-note', text: (p.bowl ? p.bowl : 'Part-time (no listed style → medium pace)') + ' · ' + CRK.oversText(w.balls) + '-' + w.md + '-' + w.r + '-' + w.w }),
        el('button', { cls: 'crk-btn crk-btn--primary', text: 'Bowl ' + p.name.split(' ').slice(-1)[0], onclick: function () { forceClose(); CRK.setBowler(s, id); G.phase = 'between'; hud(); showControls(); saveMatch(); startBowlAim(); } })]));
    });
    G.phase = 'modal'; showControls();
    modal('Choose the bowler for over ' + (Math.floor(inn.balls / 6) + 1), [list], { lock: true });
  }

  /* ---------- breaks & decisions ---------- */
  function aiImpact(s, teamIdx) {
    var t = s.teams[teamIdx]; if (!t.impact || t.impactUsed) return;
    var inn = CRK.cur(s), sub = t.players[t.impact];
    try {
      if (inn.bat === teamIdx && !sub.bowl) { // bring in a batter for an unbatted bowler
        var out = t.xi.slice(inn.next).filter(function (id) { return t.players[id].role === 'BOWL'; }).pop(); if (out) CRK.useImpact(s, teamIdx, out);
      } else if (inn.bowl === teamIdx && sub.bowl) {
        var o2 = t.xi.filter(function (id) { return !t.players[id].bowl && id !== t.keeper && id !== t.captain; }).pop(); if (o2) CRK.useImpact(s, teamIdx, o2);
      }
    } catch (e) { /* rule refused — keep XI */ }
  }
  function inningsBreak() {
    var s = G.m.s, done = CRK.cur(s), p = s.pending;
    var txt = s.teams[done.bat].name + ' ' + done.runs + '/' + done.wkts + ' (' + CRK.oversText(done.balls) + ' ov)' + (done.declared ? ' declared' : '');
    var nextTxt = s.teams[p.bat].name + ' to bat' + (p.target ? ' — target ' + p.target : '');
    G.phase = 'modal'; showControls();
    modal('Innings break', [el('p', { cls: 'crk-result' }, [el('strong', { text: txt }), nextTxt]),
      el('div', { cls: 'crk-row' }, [el('button', { cls: 'crk-btn crk-btn--primary', text: 'Continue', onclick: function () {
        forceClose(); CRK.continueMatch(s);
        if (G.m.mode !== 'nets') [0, 1].forEach(function (i) { if (i !== G.m.user) aiImpact(s, i); });
        G.rd.setCamera('delivery', null, true); afterState(true); } }),
        el('button', { cls: 'crk-btn', text: 'Scorecard', onclick: function () { scorecard(); } })])], { lock: true });
    saveMatch();
  }
  function followOnDecision() {
    var s = G.m.s, p = s.pending;
    if (p.team !== G.m.user) { var enforce = p.lead >= CRK.FORMATS[s.format].followOn + 50; CRK.decideFollowOn(s, enforce); notify('Follow-on', s.teams[p.team].name + (enforce ? ' enforce the follow-on.' : ' choose to bat again.')); return afterState(true); }
    G.phase = 'modal'; showControls();
    modal('Follow-on available', [el('p', { text: 'You lead by ' + p.lead + '. Enforce the follow-on?' }),
      el('div', { cls: 'crk-row' }, [el('button', { cls: 'crk-btn crk-btn--primary', text: 'Enforce follow-on', onclick: function () { forceClose(); CRK.decideFollowOn(s, true); afterState(true); } }),
        el('button', { cls: 'crk-btn', text: 'Bat again', onclick: function () { forceClose(); CRK.decideFollowOn(s, false); afterState(true); } })])], { lock: true });
  }
  function declare() {
    var s = G.m.s; if (G.phase !== 'between') return;
    modal('Declare?', [el('p', { text: 'Close the innings at ' + CRK.cur(s).runs + '/' + CRK.cur(s).wkts + '?' }),
      el('div', { cls: 'crk-row' }, [el('button', { cls: 'crk-btn crk-btn--danger', text: 'Declare', onclick: function () { forceClose(); CRK.declare(s); afterState(true); } }),
        el('button', { cls: 'crk-btn', text: 'Keep batting', onclick: forceClose })])]);
  }
  function impactModal() {
    var s = G.m.s, t = s.teams[G.m.user], list = el('ul', { cls: 'crk-cards' });
    t.xi.forEach(function (id) {
      list.appendChild(el('li', null, [el('h3', { text: t.players[id].name }), el('button', { cls: 'crk-btn', text: 'Replace with ' + t.players[t.impact].name, onclick: function () {
        try { CRK.useImpact(s, G.m.user, id); forceClose(); notify('Impact Player', t.players[t.impact].name + ' replaces ' + t.players[id].name + '.'); hud(); showControls(); saveMatch(); }
        catch (e) { notify('Not allowed', e.message); } } })]));
    });
    modal('Impact Player — choose who to replace', [el('p', { cls: 'crk-note', text: 'Simplified IPL rule: one substitution per match; a batter who has already batted cannot be replaced while batting.' }), list]);
  }

  /* ---------- pause ---------- */
  function pause() {
    if (!G.m || G.screen !== 'match') return;
    if (G.paused) return resume();
    G.paused = true; if (G.loop) G.loop.pause(); G.simAbort = true; AU.stopAll();
    modal('Paused', [el('div', { cls: 'crk-row' }, [
      el('button', { cls: 'crk-btn crk-btn--primary', text: 'Resume', onclick: function () { forceClose(); resume(); } }),
      el('button', { cls: 'crk-btn', text: 'Scorecard', onclick: function () { scorecard(); } }),
      el('button', { cls: 'crk-btn', text: 'Settings', onclick: function () { forceClose(); G.paused = false; saveMatch(); show('settings'); } }),
      el('button', { cls: 'crk-btn crk-btn--ghost', text: 'Save & quit to menu', onclick: function () { forceClose(); G.paused = false; saveMatch(); show('home'); } })]),
      el('p', { cls: 'crk-note', text: 'Matches save automatically between deliveries. A delivery in progress is not saved; resuming restarts from the last completed ball.' })], { lock: true });
  }
  function resume() { G.paused = false; if (G.loop) { G.loop.resume(); G.loop.start(); } AU.crowdStart(); if (G.phase === 'sim') { G.phase = 'between'; showControls(); } }
  document.addEventListener('visibilitychange', function () { if (document.hidden && G.screen === 'match' && !G.paused) pause(); });
  window.addEventListener('pagehide', function () { if (G.m && G.m.s.status !== 'done') saveMatch(); if (G.loop) G.loop.stop(); AU.stopAll(); });

  /* ---------- simulation (same engine, chunked so the page stays responsive) ---------- */
  function simulate(kind) {
    var s = G.m.s; if (G.phase !== 'between') return;
    var startInn = CRK.cur(s).n, o = { difficulty: 'normal' };
    G.phase = 'sim'; G.simAbort = false; showControls(); $('ticker').textContent = 'Simulating with the full rules and physics engine…';
    (function chunk() {
      if (G.simAbort) { G.phase = 'between'; return afterState(true); }
      for (var i = 0; i < 30; i++) {
        if (s.status === 'bowler') CRK.setBowler(s, AI.chooseBowler(s));
        if (s.status !== 'ready') break;
        Sim.simBall(s, o);
        var inn = CRK.cur(s);
        if (kind === 'over' && inn.balls % 6 === 0 && s.status === 'bowler') break;
        if (inn.n !== startInn || s.status !== 'ready' && s.status !== 'bowler') break;
      }
      hud();
      var inn2 = CRK.cur(s), stop = s.status !== 'ready' && s.status !== 'bowler' || inn2.n !== startInn || (kind === 'over' && s.status === 'bowler');
      if (stop) { G.phase = 'between'; $('ticker').textContent = 'Simulation complete.'; G.frames = []; return afterState(true); }
      setTimeout(chunk, 0);
    })();
  }

  /* ---------- field editor ---------- */
  function openField() {
    var s = G.m.s, inn = CRK.cur(s), st = pl(inn.bat, inn.striker), bw = pl(inn.bowl, inn.bowler || inn.lastBowler || s.teams[inn.bowl].xi[10]);
    var fd = Sim.fieldFor(s, bw, st);
    G.fieldEdit = { field: fd.field.map(function (f) { return Object.assign({}, f); }), sel: -1, hand: st.bat === 'L' ? 'L' : 'R', off: P.offSign(st.bat), keeperUp: fd.keeperUp };
    var box = clear($('field-presets'));
    Object.keys(P.PRESETS).forEach(function (k) {
      box.appendChild(el('button', { cls: 'crk-btn crk-btn--small', text: P.PRESETS[k].label, onclick: function () {
        var f = P.buildField(k, G.fieldEdit.off, k === 'spin' || G.fieldEdit.keeperUp); P.enforceRestriction(f, CRK.maxOutside(s));
        G.fieldEdit.field.forEach(function (o, i) { if (i > 1) { o.x = f[i].x; o.y = f[i].y; } }); inn.fieldKey = k; fieldHint(); } }));
    });
    G.phase = 'field'; G.rd.setCamera('top', null, false); fieldHint(); showControls();
  }
  function fieldHint() {
    var n = P.countOutside(G.fieldEdit.field), mx = CRK.maxOutside(G.m.s);
    $('field-hint').textContent = 'Drag fielders · outside the circle: ' + n + ' / ' + mx + ' allowed' + (n > mx ? ' — too many, move one inside' : '') + ' · field set for ' + (G.fieldEdit.hand === 'L' ? 'left' : 'right') + '-handers';
  }
  function saveField() {
    var s = G.m.s, inn = CRK.cur(s), fe = G.fieldEdit;
    if (P.countOutside(fe.field) > CRK.maxOutside(s)) { AU.cue('error'); fieldHint(); return; }
    inn.customField = inn.customField || {};
    inn.customField[fe.hand] = fe.field.slice(2).map(function (f) { return [Math.round(P.angleOf(f.x, f.y, fe.off)), +Math.hypot(f.x, f.y).toFixed(1)]; });
    G.fieldEdit = null; G.phase = 'between'; G.rd.setCamera('delivery', null, false); showControls(); saveMatch();
  }
  function resetField() { var inn = CRK.cur(G.m.s); if (inn.customField) delete inn.customField[G.fieldEdit.hand]; G.fieldEdit = null; G.phase = 'between'; G.rd.setCamera('delivery', null, false); showControls(); saveMatch(); }

  /* ---------- scorecard ---------- */
  function scorecard(sOverride) {
    var s = sOverride || G.m.s, tabs = el('div', { cls: 'crk-tabs', role: 'tablist' }), body = el('div');
    var views = s.innings.map(function (inn, i) { return { label: s.teams[inn.bat].short + ' ' + ordinal(Math.floor(i / 2) + 1 > 1 && CRK.FORMATS[s.format].innings === 2 ? 2 : 1) + (CRK.FORMATS[s.format].innings === 2 ? ' inns' : ''), fn: function () { return inningsCard(s, inn); } }; });
    views.push({ label: 'Wagon wheel', fn: function () { return wagon(s); } }, { label: 'Pitch map', fn: function () { return pitchMap(s); } }, { label: 'Overs', fn: function () { return overHistory(s); } });
    function sel(i) { Array.prototype.forEach.call(tabs.children, function (b, j) { b.setAttribute('aria-selected', String(i === j)); }); clear(body).appendChild(views[i].fn()); }
    views.forEach(function (v, i) { tabs.appendChild(el('button', { cls: 'crk-btn crk-btn--small', role: 'tab', text: v.label, onclick: function () { sel(i); } })); });
    var wasLocked = G.modalLock, prev = wasLocked ? Array.prototype.slice.call($('modal-body').childNodes) : null, prevTitle = $('modal-title').textContent;
    modal('Scorecard', [tabs, body]); sel(Math.max(0, s.innings.length - 1));
    if (wasLocked) { // return to the locked dialog (e.g. innings break) after closing
      G.modalOnClose = function () { modal(prevTitle, prev, { lock: true }); };
    }
  }
  function inningsCard(s, inn) {
    var bt = s.teams[inn.bat], wt = s.teams[inn.bowl], wrap = el('div');
    var t1 = el('table', { cls: 'crk-table' }, [el('thead', null, [el('tr', null, ['Batter', 'How out', 'R', 'B', '4s', '6s', 'SR'].map(function (h) { return el('th', { text: h, scope: 'col' }); }))])]);
    var tb = el('tbody');
    bt.xi.forEach(function (id) {
      var b = inn.bs[id]; if (!b) return; var batted = b.b || b.out || id === inn.striker || id === inn.non;
      tb.appendChild(el('tr', null, [el('td', { text: bt.players[id].name + (id === bt.captain ? ' (c)' : '') + (id === bt.keeper ? ' †' : '') }),
        el('td', { cls: 'l dim', text: batted ? (b.out || 'not out') : 'did not bat' }), el('td', { text: batted ? b.r : '' }), el('td', { text: batted ? b.b : '' }),
        el('td', { text: batted ? b.f4 : '' }), el('td', { text: batted ? b.s6 : '' }), el('td', { text: b.b ? (b.r * 100 / b.b).toFixed(1) : '' })]));
    });
    var e = inn.extras;
    tb.appendChild(el('tr', null, [el('td', { text: 'Extras' }), el('td', { cls: 'l dim', text: 'b ' + e.b + ', lb ' + e.lb + ', w ' + e.wd + ', nb ' + e.nb }), el('td', { text: e.b + e.lb + e.wd + e.nb + e.pen }), el('td'), el('td'), el('td'), el('td')]));
    tb.appendChild(el('tr', null, [el('td', { text: 'Total' }), el('td', { cls: 'l dim', text: CRK.oversText(inn.balls) + ' overs' + (inn.declared ? ', declared' : '') }), el('td', { text: inn.runs + '/' + inn.wkts }), el('td'), el('td'), el('td'), el('td')]));
    t1.appendChild(tb); wrap.appendChild(t1);
    if (inn.fow.length) wrap.appendChild(el('p', { cls: 'crk-note', text: 'Fall of wickets: ' + inn.fow.map(function (f) { return f.w + '-' + f.r + ' (' + bt.players[f.id].name + ', ' + CRK.oversText(f.balls) + ')'; }).join(', ') }));
    var t2 = el('table', { cls: 'crk-table' }, [el('thead', null, [el('tr', null, ['Bowler', 'O', 'M', 'R', 'W', 'Wd', 'Nb', 'Econ'].map(function (h) { return el('th', { text: h, scope: 'col' }); }))])]);
    var tb2 = el('tbody');
    Object.keys(inn.ws).forEach(function (id) { var w = inn.ws[id]; if (!w.balls && !w.wd && !w.nb) return;
      tb2.appendChild(el('tr', null, [el('td', { text: wt.players[id].name }), el('td', { text: CRK.oversText(w.balls) }), el('td', { text: w.md }), el('td', { text: w.r }), el('td', { text: w.w }), el('td', { text: w.wd }), el('td', { text: w.nb }), el('td', { text: w.balls ? (w.r * 6 / w.balls).toFixed(2) : '-' })])); });
    t2.appendChild(tb2); wrap.appendChild(t2);
    var parts = inn.parts.concat(inn.part.b || inn.part.r ? [{ a: inn.striker, b: inn.non, r: inn.part.r, b2: inn.part.b, unbroken: true }] : []).filter(function (p, i, a) { return !(p.unbroken && i < a.length - 1 && inn.closed); });
    if (parts.length) wrap.appendChild(el('p', { cls: 'crk-note', text: 'Partnerships: ' + parts.map(function (p, i) { return (i + 1) + ') ' + p.r + ' (' + p.b2 + ')' + (p.unbroken ? '*' : ''); }).join(' · ') }));
    return wrap;
  }
  function wagon(s) {
    var c = el('canvas', { cls: 'crk-mini', width: 320, height: 320, role: 'img', 'aria-label': 'Wagon wheel of scoring shots' }), x = c.getContext('2d'), wrap = el('div', null, [c]);
    var inn = CRK.cur(s); x.fillStyle = '#0e3a1c'; x.beginPath(); x.arc(160, 160, 158, 0, 7); x.fill(); x.fillStyle = '#cbb27a'; x.fillRect(155, 150, 10, 26);
    x.strokeStyle = '#ffffff55'; x.beginPath(); x.arc(160, 160, 70, 0, 7); x.stroke();
    inn.wagon.forEach(function (w) {
      if (!w.r && w.dist < 5) return; var a = w.a * Math.PI / 180, len = Math.min(150, w.dist * 1.9);
      x.strokeStyle = w.r === 6 ? '#c77dff' : w.r === 4 ? '#4dabf7' : w.r ? '#ffd43b' : '#ffffff55'; x.lineWidth = w.r >= 4 ? 2.5 : 1.5;
      x.beginPath(); x.moveTo(160, 165); x.lineTo(160 + Math.sin(a) * len, 165 - Math.cos(a) * len); x.stroke();
    });
    wrap.appendChild(el('p', { cls: 'crk-note', text: 'Current innings. Up = straight; right = off side. Purple 6 · blue 4 · yellow 1–3 · white dots.' }));
    return wrap;
  }
  function pitchMap(s) {
    var c = el('canvas', { cls: 'crk-mini crk-mini--pitch', width: 200, height: 320, role: 'img', 'aria-label': 'Bowling pitch map' }), x = c.getContext('2d'), wrap = el('div', null, [c]);
    var inn = CRK.cur(s); x.fillStyle = '#cbb27a'; x.fillRect(40, 0, 120, 320); x.fillStyle = '#fff'; x.fillRect(90, 300, 20, 4);
    [['Full', 40], ['Good', 140], ['Short', 230]].forEach(function (z) { x.fillStyle = '#00000088'; x.font = '11px sans-serif'; x.fillText(z[0], 2, 300 - z[1]); });
    inn.pitch.forEach(function (p) { var px = 100 - p.x * 45, py = 300 - Math.max(0, p.len) * 22; x.fillStyle = p.w ? '#d22f3a' : p.r >= 4 ? '#1d6fd1' : '#ffffff'; x.strokeStyle = '#000'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill(); x.stroke(); });
    wrap.appendChild(el('p', { cls: 'crk-note', text: 'Where deliveries pitched (batter’s view: right = off side). Red = wicket, blue = boundary.' }));
    return wrap;
  }
  function overHistory(s) {
    var inn = CRK.cur(s), t = s.teams[inn.bowl], ul = el('ol', { cls: 'crk-list' });
    inn.overs.forEach(function (o, i) { ul.appendChild(el('li', { text: 'Over ' + (i + 1) + ' — ' + t.players[o.bowler].name + ': ' + o.balls.join(' ') + ' (' + o.runs + ')' })); });
    if (inn.over.length) ul.appendChild(el('li', { text: 'This over: ' + inn.over.join(' ') }));
    return ul;
  }

  /* ---------- match completion ---------- */
  function onMatchDone() {
    var s = G.m.s, r = s.result, m = G.m, potm = CRK.playerOfMatch(s);
    G.phase = 'done'; showControls(); Store.del('match');
    var userWon = r.winner === m.user;
    if (m.mode !== 'nets') { recordCareer(s); unlock('crk-first-match'); }
    if (userWon && m.mode !== 'nets') {
      unlock('crk-first-win'); var c = Store.get('career', null); if (c && c.wins >= 5) unlock('crk-five-wins');
      var me = s.teams[m.user], opp = s.teams[1 - m.user];
      if ((me.id === 'NEP' || me.id === 'NED') && R.team('intl', opp.id) && R.team('intl', opp.id).test) unlock('crk-associate');
      if (/TEST/.test(s.format)) unlock('crk-test-win');
      if (m.challenge) { unlock('crk-chase'); var ch = Store.get('chal', {}); ch[m.challenge] = true; Store.set('chal', ch); }
      if (m.daily) { var dd = Store.get('daily', {}); dd[m.daily] = true; Store.set('daily', dd); unlock('crk-daily'); }
    }
    var kids = [el('p', { cls: 'crk-result' }, [el('strong', { text: r.text }), potm ? 'Player of the match (game calculation): ' + potm.name + ' · ' + potm.points + ' pts' : ''])];
    var row = el('div', { cls: 'crk-row' });
    row.appendChild(el('button', { cls: 'crk-btn', text: 'Scorecard', onclick: function () { scorecard(); } }));
    if (m.tour) {
      var tour = Store.get('tour', null);
      if (tour) {
        var fx = tour.fixtures.concat(tour.playoffs).filter(function (f) { return f.id === m.tour; })[0];
        var aIdx = s.teams[0].id === fx.a ? 0 : 1, sum = T.summarise(s, aIdx);
        if (!sum.winner) { var so = T.superOver(s, s.seed ^ 77), n = 0; while (so.result.kind === 'tie' && n++ < 4) so = T.superOver(s, (s.seed ^ 77) + n); if (so.result.winner != null) { sum.winner = (so.result.winner === aIdx) ? 'a' : 'b'; sum.text += ' · Super Over (simulated): ' + so.result.text; } }
        if (!fx.result) { T.recordResult(tour, fx.id, sum); Store.set('tour', tour); }
        if (tour.champion === tour.user) unlock('crk-champion');
        kids.push(el('p', { cls: 'crk-note', text: sum.text }));
      }
      row.appendChild(el('button', { cls: 'crk-btn crk-btn--primary', text: 'Back to tournament', onclick: function () { forceClose(); show('tour'); } }));
    } else {
      if (r.kind === 'tie' && r.superOver) row.appendChild(el('button', { cls: 'crk-btn crk-btn--primary', text: 'Play the Super Over', onclick: function () { forceClose(); superOverFrom(s); } }));
      if (m.retry) row.appendChild(el('button', { cls: 'crk-btn crk-btn--primary', text: 'Try again', onclick: function () { forceClose(); m.retry(); } }));
      else if (!m.challenge && !m.daily && FORMATS_BY_MODE[G.setup.mode]) row.appendChild(el('button', { cls: 'crk-btn crk-btn--primary', text: 'Play again', onclick: function () { forceClose(); openSetup(G.setup.mode, { format: G.setup.format, a: G.setup.a, b: G.setup.b, diff: G.setup.diff, theme: G.setup.theme }); } }));
    }
    row.appendChild(el('button', { cls: 'crk-btn crk-btn--ghost', text: 'Menu', onclick: function () { forceClose(); show('home'); } }));
    kids.push(row);
    AU.cheer(1);
    modal('Result', kids, { lock: true });
  }
  function superOverFrom(s) {
    var st = G.setup; st.format = 'SUPER'; st.mode = 'super';
    st.teams = s.teams.map(function (t) { var c = JSON.parse(JSON.stringify(t)); return c; });
    startMatch(s.innings[1].bat === 0 ? 0 : 1); // side batting second bats first in the Super Over
  }

  /* ---------- career stats & per-ball achievements ---------- */
  function recordCareer(s) {
    var c = Store.get('career', { matches: 0, wins: 0, losses: 0, other: 0, players: {} });
    c.matches++; if (s.result.winner === G.m.user) c.wins++; else if (s.result.winner != null) c.losses++; else c.other++;
    s.innings.forEach(function (inn) {
      var bt = s.teams[inn.bat], wt = s.teams[inn.bowl];
      Object.keys(inn.bs).forEach(function (id) { var b = inn.bs[id]; if (!b.b && !b.out) return; var p = c.players[id] = c.players[id] || { n: bt.players[id].name, r: 0, b: 0, f4: 0, s6: 0, inns: 0, no: 0, hs: 0, w: 0, bb: 0, rc: 0 };
        p.r += b.r; p.b += b.b; p.f4 += b.f4; p.s6 += b.s6; p.inns++; if (!b.out) p.no++; p.hs = Math.max(p.hs, b.r); });
      Object.keys(inn.ws).forEach(function (id) { var w = inn.ws[id]; if (!w.balls) return; var p = c.players[id] = c.players[id] || { n: wt.players[id].name, r: 0, b: 0, f4: 0, s6: 0, inns: 0, no: 0, hs: 0, w: 0, bb: 0, rc: 0 };
        p.w += w.w; p.bb += w.balls; p.rc += w.r; });
    });
    Store.set('career', c);
  }
  function ballAchievements(ev) {
    var s = G.m.s, inn = s.innings[ev.inn]; if (G.m.mode === 'nets') return;
    if (inn.bat === G.m.user) {
      if (ev.d.boundary === 6 && ev.d.extra !== 'wd') unlock('crk-maximum');
      Object.keys(inn.bs).forEach(function (id) { if (inn.bs[id].r >= 50) unlock('crk-fifty'); if (inn.bs[id].r >= 100) unlock('crk-hundred'); });
    } else Object.keys(inn.ws).forEach(function (id) { if (inn.ws[id].w >= 3) unlock('crk-three-for'); });
  }

  /* ---------- save / resume ---------- */
  function saveMatch() {
    if (!G.m || G.m.s.status === 'done') return;
    Store.set('match', { s: G.m.s, mode: G.m.mode, user: G.m.user, diff: G.m.diff, theme: G.m.theme, tour: G.m.tour, challenge: G.m.challenge, daily: G.m.daily,
      netsRole: G.m.netsRole, label: G.m.label + ' · ' + CRK.oversText(CRK.cur(G.m.s).balls) + ' ov', setup: { mode: G.setup.mode, format: G.setup.format, a: G.setup.a, b: G.setup.b, diff: G.setup.diff, theme: G.setup.theme } });
  }
  function resumeMatch() {
    var sv = Store.get('match', null); if (!sv) return;
    try {
      var s = CRK.deserialize(CRK.serialize(sv.s)); if (!CRK.FORMATS[s.format]) throw new Error('format');
      G.setup = Object.assign({ kind: kindFor(sv.setup.mode) }, sv.setup); G.setup.teams = s.teams.map(function (t) { return JSON.parse(JSON.stringify(t)); });
      G.m = { s: s, mode: sv.mode, user: sv.user, diff: sv.diff, theme: sv.theme, tour: sv.tour, challenge: sv.challenge, daily: sv.daily, netsRole: sv.netsRole, label: sv.label };
      enterMatch();
    } catch (e) { Store.del('match'); notify('Save could not be loaded', 'It was corrupted and has been removed.'); renderHome(); }
  }

  /* ---------- tournament ---------- */
  function renderTour() {
    var body = clear($('tour-body')), tour = Store.get('tour', null);
    body.appendChild(el('p', { cls: 'crk-snap', text: 'IPL ' + R.IPL_SEASON + ' · Editable custom squads · CUSTOM SCHEDULE — single round-robin + playoffs, not the official fixture list.' }));
    if (!tour) {
      var sel = el('select', { cls: 'crk-select', id: 'tour-team', 'aria-label': 'Your franchise' });
      R.IPL.forEach(function (t) { sel.appendChild(el('option', { value: t.id, text: t.name })); });
      body.appendChild(el('label', { cls: 'crk-lbl', text: 'Choose your franchise' })); body.appendChild(sel);
      body.appendChild(el('button', { cls: 'crk-btn crk-btn--primary crk-wide', text: 'Start tournament', onclick: function () {
        var tr = T.create(R.IPL.map(function (t) { return t.id; }), sel.value, (Date.now() >>> 0)); Store.set('tour', tr); renderTour(); } }));
      return;
    }
    var name = function (id) { return R.team('ipl', id).name; };
    body.appendChild(el('h3', { text: 'You: ' + name(tour.user) + ' · Stage: ' + (tour.stage === 'complete' ? 'Complete' : tour.stage === 'league' ? 'League' : 'Playoffs') }));
    if (tour.champion) body.appendChild(el('p', { cls: 'crk-result' }, [el('strong', { text: '🏆 Champions: ' + name(tour.champion) })]));
    var tbl = el('table', { cls: 'crk-table' }, [el('thead', null, [el('tr', null, ['Team', 'P', 'W', 'L', 'T/NR', 'Pts', 'NRR'].map(function (h) { return el('th', { text: h, scope: 'col' }); }))])]);
    var tb = el('tbody');
    T.standings(tour).forEach(function (r, i) { tb.appendChild(el('tr', { cls: r.team === tour.user ? 'me' : null }, [el('td', { text: (i + 1) + '. ' + name(r.team) }), el('td', { text: r.p }), el('td', { text: r.w }), el('td', { text: r.l }), el('td', { text: r.t + r.nr }), el('td', { text: r.pts }), el('td', { text: (T.nrr(r) >= 0 ? '+' : '') + T.nrr(r).toFixed(3) })])); });
    tbl.appendChild(tb); body.appendChild(tbl);
    var nx = T.next(tour);
    if (nx) {
      var mine = nx.a === tour.user || nx.b === tour.user;
      body.appendChild(el('p', { text: 'Next: ' + (nx.stage === 'league' ? 'League match ' + (tour.fixtures.indexOf(nx) + 1) + '/45' : nx.stage) + ' — ' + name(nx.a) + ' v ' + name(nx.b) }));
      var row = el('div', { cls: 'crk-row' });
      if (mine) row.appendChild(el('button', { cls: 'crk-btn crk-btn--primary', text: 'Play this match', onclick: function () {
        var opp = nx.a === tour.user ? nx.b : nx.a;
        openSetup('tour', { a: tour.user, b: opp, format: 'T20', tourFixture: nx.id, lockTeams: true }); } }));
      row.appendChild(el('button', { cls: 'crk-btn', text: mine ? 'Simulate this match' : 'Simulate to my next match', onclick: function () { simTour(mine); } }));
      body.appendChild(row);
    }
    var pl2 = el('ol', { cls: 'crk-list' });
    tour.fixtures.concat(tour.playoffs).filter(function (f) { return f.result; }).slice(-12).reverse().forEach(function (f) { pl2.appendChild(el('li', { text: (f.stage === 'league' ? 'League' : f.stage) + ': ' + name(f.a) + ' v ' + name(f.b) + ' — ' + f.result.text })); });
    body.appendChild(el('h3', { text: 'Recent results' })); body.appendChild(pl2);
    body.appendChild(el('button', { cls: 'crk-btn crk-btn--danger', text: 'Abandon tournament', onclick: function () { if (window.confirm('Abandon this tournament? Progress will be deleted.')) { Store.del('tour'); renderTour(); } } }));
  }
  function simTour(includeMine) {
    var tour = Store.get('tour', null); if (!tour) return;
    var status = el('p', { 'aria-live': 'polite', text: 'Simulating ball-by-ball with the full engine…' });
    modal('Simulating', [status], { lock: true });
    var first = true;
    (function step() {
      var nx = T.next(tour);
      if (!nx || (!first || !includeMine) && (nx.a === tour.user || nx.b === tour.user)) { Store.set('tour', tour); forceClose(); if (tour.champion === tour.user) unlock('crk-champion'); return renderTour(); }
      first = false;
      var ta = makeTeam('ipl', nx.a), tb = makeTeam('ipl', nx.b), seed = CRK.hashSeed(nx.id + tour.seed);
      var s = CRK.newMatch({ format: 'T20', seed: seed, teams: [ta, tb], battingFirst: seed % 2 });
      Sim.simMatch(s, {});
      var sum = T.summarise(s, 0);
      if (!sum.winner) { var so = T.superOver(s, seed ^ 99), n = 0; while (so.result.kind === 'tie' && n++ < 4) so = T.superOver(s, (seed ^ 99) + n); if (so.result.winner != null) { sum.winner = so.result.winner === 0 ? 'a' : 'b'; sum.text += ' · Super Over: ' + so.result.text; } }
      T.recordResult(tour, nx.id, sum);
      status.textContent = 'Simulated: ' + ta.name + ' v ' + tb.name + ' — ' + sum.text;
      setTimeout(step, 0);
    })();
  }

  /* ---------- chase challenges & daily ---------- */
  var CHALLENGES = [
    { id: 'c1', t: 'Last-over thriller', a: 'IND', b: 'PAK', need: 14, balls: 6, wk: 2 },
    { id: 'c2', t: 'Two-over heist', a: 'ENG', b: 'AUS', need: 31, balls: 12, wk: 4 },
    { id: 'c3', t: 'Tail-end nerves', a: 'SA', b: 'NZ', need: 9, balls: 12, wk: 1 },
    { id: 'c4', t: 'Powerplay blitz', a: 'AUS', b: 'IND', need: 70, balls: 30, wk: 8 },
    { id: 'c5', t: 'Associate ambition', a: 'NEP', b: 'AUS', need: 45, balls: 24, wk: 5 },
    { id: 'c6', t: 'Orange surge', a: 'NED', b: 'ENG', need: 60, balls: 36, wk: 6 }
  ];
  function renderChallenges() {
    var ul = clear($('ch-list')), done = Store.get('chal', {});
    CHALLENGES.forEach(function (c) {
      ul.appendChild(el('li', null, [el('h3', { text: c.t + (done[c.id] ? ' ✓' : '') }),
        el('p', { text: R.team('intl', c.a).name + ' need ' + c.need + ' from ' + c.balls + ' balls with ' + c.wk + ' wicket' + (c.wk > 1 ? 's' : '') + ' in hand v ' + R.team('intl', c.b).name + '.' }),
        el('p', { cls: 'crk-note', text: 'Fictional scenario · custom format' }),
        el('button', { cls: 'crk-btn crk-btn--primary', text: 'Play', onclick: function () { startChase(c.a, c.b, c.need, c.balls, c.wk, { challenge: c.id }); } })]));
    });
  }
  function startChase(a, b, need, balls, wk, extra) {
    G.setup = { mode: 'chase', kind: 'intl', format: 'X2', a: a, b: b, diff: 'normal', theme: S.theme, teams: [makeTeam('intl', a), makeTeam('intl', b)] };
    startMatch(0, Object.assign({ target: need, overs: balls / 6, wickets: wk }, extra));
    G.m.retry = function () { startChase(a, b, need, balls, wk, extra); };
  }
  function dailyInfo() {
    var d = new Date(), key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var h = CRK.hashSeed('crk-daily-' + key), teams = R.INTL.map(function (t) { return t.id; });
    var a = teams[h % 14], b = teams[(h >>> 4) % 14]; if (a === b) b = teams[(teams.indexOf(a) + 5) % 14];
    var need = 20 + (h >>> 9) % 14, wk = 2 + (h >>> 13) % 3;
    return { key: key, seed: h, a: a, b: b, need: need, wk: wk, label: key + ': ' + R.team('intl', a).short + ' need ' + need + ' off 12 v ' + R.team('intl', b).short };
  }
  function startDaily() { var d = dailyInfo(); startChase(d.a, d.b, d.need, 12, d.wk, { daily: d.key, seed: d.seed }); }

  /* ---------- career / unlocks / settings / about ---------- */
  function renderCareer() {
    var b = clear($('career-body')), c = Store.get('career', null);
    if (!c) { b.appendChild(el('p', { text: 'No completed matches yet. Nets do not count.' })); return; }
    b.appendChild(el('p', { text: 'Matches ' + c.matches + ' · Won ' + c.wins + ' · Lost ' + c.losses + ' · Tied/Drawn ' + c.other }));
    var ps = Object.keys(c.players).map(function (k) { return c.players[k]; });
    var bat = ps.filter(function (p) { return p.inns; }).sort(function (x, y) { return y.r - x.r; }).slice(0, 15);
    var t1 = el('table', { cls: 'crk-table' }, [el('thead', null, [el('tr', null, ['Batting (in your games)', 'Inns', 'R', 'HS', 'Avg', 'SR', '6s'].map(function (h) { return el('th', { text: h }); }))])]), tb = el('tbody');
    bat.forEach(function (p) { var outs = p.inns - p.no; tb.appendChild(el('tr', null, [el('td', { text: p.n }), el('td', { text: p.inns }), el('td', { text: p.r }), el('td', { text: p.hs }), el('td', { text: outs ? (p.r / outs).toFixed(1) : '-' }), el('td', { text: p.b ? (p.r * 100 / p.b).toFixed(1) : '-' }), el('td', { text: p.s6 })])); });
    t1.appendChild(tb); b.appendChild(t1);
    var bw = ps.filter(function (p) { return p.bb; }).sort(function (x, y) { return y.w - x.w; }).slice(0, 15);
    var t2 = el('table', { cls: 'crk-table' }, [el('thead', null, [el('tr', null, ['Bowling (in your games)', 'O', 'W', 'R', 'Econ'].map(function (h) { return el('th', { text: h }); }))])]), tb2 = el('tbody');
    bw.forEach(function (p) { tb2.appendChild(el('tr', null, [el('td', { text: p.n }), el('td', { text: CRK.oversText(p.bb) }), el('td', { text: p.w }), el('td', { text: p.rc }), el('td', { text: (p.rc * 6 / p.bb).toFixed(2) })])); });
    t2.appendChild(tb2); b.appendChild(t2);
    b.appendChild(el('p', { cls: 'crk-note', text: 'These are statistics from matches played in this game on this browser — not real career records.' }));
  }
  function renderUnlocks() {
    var b = clear($('unlocks-body')), ul = el('ul', { cls: 'crk-cards' });
    ACH.forEach(function (a) { ul.appendChild(el('li', { cls: ACHS[a.id] ? '' : 'locked' }, [el('h3', { text: (ACHS[a.id] ? '🏅 ' : '🔒 ') + a.t }), el('p', { text: a.d }), a.unlock ? el('p', { cls: 'crk-note', text: 'Unlocks stadium: ' + CRK.Render.THEMES[a.unlock].name }) : null])); });
    b.appendChild(el('h3', { text: 'Achievements' })); b.appendChild(ul);
    var th = el('ul', { cls: 'crk-cards' });
    Object.keys(CRK.Render.THEMES).forEach(function (k) { var ok = themeUnlocked(k); th.appendChild(el('li', { cls: ok ? '' : 'locked' }, [el('h3', { text: CRK.Render.THEMES[k].name }), el('button', { cls: 'crk-btn', disabled: !ok, text: S.theme === k ? 'Selected' : ok ? 'Use this stadium' : 'Locked', onclick: function () { S.theme = k; saveSettings(); renderUnlocks(); } })])); });
    b.appendChild(el('h3', { text: 'Stadiums (cosmetic only — no gameplay advantage)' })); b.appendChild(th);
  }
  function renderSettings() {
    var f = $('settings-form');
    f.commentary.value = S.commentary; ['assistTiming', 'assistRun', 'autoNext', 'reducedMotion', 'sound', 'labels'].forEach(function (k) { f[k].checked = !!S[k]; });
    var m = AU.labMuted();
    $('sound-note').textContent = !LAB ? 'Standalone mode: the Sound setting above controls all game audio.' :
      m === null ? 'Lab mute state is not readable on this page, so crowd and bat audio stay off; short cues use the Lab sound engine (which respects the Lab mute).' :
      'Lab mute is ' + (m ? 'ON — all game audio is silent.' : 'off.');
  }
  function renderAbout() {
    var b = clear($('about-body'));
    b.appendChild(el('h3', { text: 'Roster data status' }));
    b.appendChild(el('p', { cls: 'crk-snap', text: R.SNAPSHOT.status + ' · compiled ' + R.SNAPSHOT.compiled + ' · ' + R.SNAPSHOT.basis }));
    b.appendChild(el('p', { text: R.SNAPSHOT.note + ' Squads are selection snapshots, not permanent national rosters. Captains shown are the latest known to the builder and may be out of date.' }));
    b.appendChild(el('p', { text: 'Nepal and Netherlands do not have official Test status. Their Test option here is FICTIONAL / CUSTOM gameplay using their ODI-style squad pool.' }));
    b.appendChild(el('p', { text: 'IPL season shown: ' + R.IPL_SEASON + '. Mid-season replacements may be missing. Tournament schedule is custom, not official. ' + R.IPL_RULES.note }));
    b.appendChild(el('h3', { text: 'Game ratings' }));
    b.appendChild(el('p', { text: 'Player ratings are balancing estimates derived from listed role (with a tiny deterministic spread). They are not official ratings and do not reflect real statistics. Ratings are gameplay balancing estimates, not official statistics.' }));
    b.appendChild(el('h3', { text: 'What is and is not modelled' }));
    b.appendChild(el('p', { text: 'Modelled: legal-ball counting, wides, no-balls, free hits, byes, leg-byes, strike rotation, bowled, caught, LBW, stumped, run out, bowling quotas, fielding-circle limits, follow-on, declarations, Test match clock and draws, ties and Super Overs. Not modelled: rain and DLS, reviews (DRS), over-rate penalties, penalty runs, hit wicket, concussion substitutes.' }));
    b.appendChild(el('p', { cls: 'crk-note', text: 'Team badges are text, kits are stylised colours. No official logos, photos, broadcast footage or licensed audio are used. All sounds are synthesized in your browser.' }));
  }

  /* ---------- global click delegation ---------- */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go],[data-act]'); if (!b || !root.contains(b)) return;
    var go = b.getAttribute('data-go'), act = b.getAttribute('data-act');
    if (go) { AU.cue('click'); if (go === 'setup') return openSetup(b.getAttribute('data-mode')); return show(go); }
    switch (act) {
      case 'edit-xi': return openXI(+b.getAttribute('data-team'));
      case 'xi-done': return (function () { var t = G.setup.teams[G.xiTeam], errs = CRK.validateXI(t, Object.assign({ squad: t.squad }, validationOpts(G.setup.mode))); if (errs.length) { AU.cue('error'); return renderXI(); } refreshSetup(); show('setup'); })();
      case 'to-toss': return toToss();
      case 'call': return doToss(b.getAttribute('data-v'));
      case 'choose': G.setup.batFirst = b.getAttribute('data-v') === 'bat' ? 0 : 1; $('toss-choose').hidden = true; $('toss-text').textContent = 'You chose to ' + b.getAttribute('data-v') + ' first.'; $('toss-go').hidden = false; return;
      case 'start-match': return startMatch(G.setup.batFirst || 0);
      case 'resume': return resumeMatch();
      case 'daily': return startDaily();
      case 'next': return nextBall();
      case 'release': return release();
      case 'run': if (G.play) P.inputRun(G.play); return;
      case 'return': if (G.play) P.inputReturn(G.play); return;
      case 'skip': return skip();
      case 'replay': return startReplay();
      case 'sim-over': return simulate('over');
      case 'sim-inn': return simulate('innings');
      case 'card': return scorecard();
      case 'field': return openField();
      case 'field-save': return saveField();
      case 'field-reset': return resetField();
      case 'declare': return declare();
      case 'impact': return impactModal();
      case 'pause': return pause();
      case 'modal-close': return closeModal();
      case 'reset-data': if (window.confirm('Delete all cricket saves, stats, tournament and achievements on this browser?')) { ['match', 'tour', 'career', 'ach', 'chal', 'daily', 'settings'].forEach(Store.del); ACHS = {}; S = Object.assign({}, DEF); applySettings(); renderSettings(); notify('Reset', 'All cricket data deleted.'); } return;
    }
  });
  $('modal').addEventListener('click', function (e) { var b = e.target.closest('[data-act=modal-close]'); if (b) closeModal(); else if (e.target === $('modal')) closeModal(); });
  $('settings-form').addEventListener('change', function () {
    var f = $('settings-form'); S.commentary = f.commentary.value;
    ['assistTiming', 'assistRun', 'autoNext', 'reducedMotion', 'sound', 'labels'].forEach(function (k) { S[k] = f[k].checked; }); saveSettings(); renderSettings();
  });
  // keep the crowd bed in sync if the Lab mute changes elsewhere on the page
  setInterval(function () { AU.sync(); if (G.screen === 'match' && !G.paused && AU.customAllowed()) AU.crowdStart(); }, 1500);

  // BOC - Cricket controls update - Animesh - 26.10.2026
  window.__crkDebug = G;
  // EOC - Cricket controls update - Animesh - 26.10.2026
  applySettings(); setAim(0); show('home');
})();

/* EOC - Cricket controls update - Animesh - 26.10.2026 */