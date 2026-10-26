/* Experiment 009 — Snake, Escalated (v2) */
(function () {
  "use strict";

  /* ---------- Engine bridge ---------- */
  const LAB = window.LAB || {};
  const store = LAB.store || { get: (k, f) => { const v = localStorage.getItem("lab." + k); return v === null ? f : v; }, set: (k, v) => localStorage.setItem("lab." + k, v) };
  const sound = n => { try { if (LAB.sound) LAB.sound(n); } catch (e) { /* silent */ } };
  const unlock = id => { try { if (LAB.unlock) LAB.unlock(id); } catch (e) { /* ignore */ } };
  const toast = o => { try { if (LAB.toast) LAB.toast(o); } catch (e) { /* ignore */ } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
  const $ = id => document.getElementById(id);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Content ---------- */
  const DIET = [
    { at: 0, e: "🍎", n: "Apple", c: "A healthy start. It won't last." },
    { at: 4, e: "🍕", n: "Pizza", c: "Diet officially abandoned." },
    { at: 8, e: "☕", n: "Coffee", c: "Now with 400% more jitter." },
    { at: 12, e: "📱", n: "Smartphone", c: "Screen time: increasing." },
    { at: 16, e: "💻", n: "Laptop", c: "IT has been notified." },
    { at: 20, e: "🖨️", n: "Printer", c: "Finally. Justice." },
    { at: 25, e: "🚗", n: "Car", c: "Parking is no longer an issue." },
    { at: 30, e: "🏢", n: "Office Building", c: "HR would like a word." },
    { at: 36, e: "🚀", n: "Rocket", c: "We're not stopping, are we?" },
    { at: 42, e: "🌍", n: "The Earth", c: "Well. That's everyone." },
    { at: 48, e: "☀️", n: "The Sun", c: "Spicy." },
    { at: 54, e: "🌌", n: "The Galaxy", c: "Dessert." },
    { at: 60, e: "🕳️", n: "The Void", c: "There's nothing left. Keep going anyway." }
  ];
  const MODES = {
    escalation: { n: "Escalation", g: "🍎", d: "Walls are deadly. The food gets worse. Bombs appear once you reach Coffee.", wrap: false, diet: true },
    zen: { n: "Zen", g: "🧘", d: "Edges wrap. Biting yourself only trims your tail. Nothing can end you except you pressing End.", wrap: true },
    time: { n: "Time Attack", g: "⏱️", d: "60 seconds. Edges wrap. Every bite adds time. Combos are everything.", wrap: true },
    maze: { n: "Mazes", g: "🧱", d: "Five hand-built levels. Eat 8 to open the next one. Portals appear later.", wrap: false },
    daily: { n: "Daily", g: "📅", d: "Escalation rules with today's fixed seed. Same board for everyone, every attempt.", wrap: false, diet: true }
  };
  const ITEMS = {
    gold: { e: "⭐", n: "Golden", d: "+5 points (multiplied)." },
    ghost: { e: "👻", n: "Ghost", d: "Pass through walls, bombs and yourself.", t: 50 },
    slow: { e: "🐌", n: "Slow-mo", d: "Everything slows down for a while.", t: 60 },
    magnet: { e: "🧲", n: "Magnet", d: "Food drifts towards you.", t: 70 },
    double: { e: "💎", n: "Double", d: "Double points.", t: 80 },
    scissors: { e: "✂️", n: "Scissors", d: "Trim a third of your tail. +2 points." },
    clock: { e: "⏰", n: "Clock", d: "+5 seconds (Time Attack only).", only: "time" }
  };
  const SKINS = [
    { id: "lime", n: "Lime", how: "Default.", ok: () => true, sw: "linear-gradient(90deg,#c6ff3d,#e0a400)" },
    { id: "neon", n: "Neon", how: "Score 15 in any mode.", ok: () => maxBest() >= 15, sw: "linear-gradient(90deg,#00f0ff,#ff2bd6)" },
    { id: "midnight", n: "Midnight", how: "Play 10 games.", ok: () => D.games >= 10, sw: "linear-gradient(90deg,#e8ecf5,#39414f)" },
    { id: "lava", n: "Lava", how: "Score 30 in Escalation.", ok: () => (D.best.escalation || 0) >= 30, sw: "linear-gradient(90deg,#ffd60a,#ff3b30,#7a0a00)" },
    { id: "rainbow", n: "Rainbow", how: "Eat 150 things in total.", ok: () => D.eaten >= 150, sw: "linear-gradient(90deg,#ff453a,#ffd60a,#30d158,#0a84ff,#bf5af2)" },
    { id: "glitch", n: "Glitch", how: "Eat a bomb. (Don't.)", ok: () => !!D.trophies.bomb, sw: "linear-gradient(90deg,#00ffd5,#ff2a6d,#f5f5f7)" },
    { id: "gold", n: "Gold", how: "Eat the Earth.", ok: () => !!D.trophies.earth, sw: "linear-gradient(90deg,#fff1a8,#d4a017,#8a6100)" }
  ];
  const TROPHIES = [
    ["first", "🍎", "First bite", "Eat anything."],
    ["combo5", "🔥", "On fire", "Reach a ×5 combo multiplier."],
    ["earth", "🌍", "Planet eater", "Eat the Earth."],
    ["galaxy", "🌌", "Dessert", "Eat the Galaxy."],
    ["ghostself", "👻", "Phased", "Pass through yourself as a ghost."],
    ["defuse", "🧯", "Bomb squad", "Ghost through a bomb."],
    ["bomb", "💣", "Not a snack", "Eat a bomb."],
    ["scissors", "✂️", "Self-care", "Trim your own tail."],
    ["zen50", "🧘", "Inner length", "Reach length 50 in Zen."],
    ["ta40", "⏱️", "Speed eater", "Score 40 in Time Attack."],
    ["maze3", "🧱", "Getting lost", "Reach Maze level 3."],
    ["mazeall", "🏁", "Cartographer", "Clear all five mazes."],
    ["daily", "📅", "Daily habit", "Play the Daily."],
    ["zero", "🥚", "Zero", "Score nothing. Impressively."],
    ["century", "💯", "Centurion", "Eat 100 things in total."]
  ];
  const MAZES = [
    { n: "Corridors", walls: () => { const w = []; for (let x = 4; x <= 15; x++) { w.push([x, 5], [x, 14]); } return w; } },
    { n: "Pillars", walls: () => { const w = []; [[5, 4], [13, 4], [5, 14], [13, 14], [9, 6], [9, 12]].forEach(([x, y]) => w.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1])); return w; } },
    { n: "Crossroads", walls: () => { const w = []; for (let y = 2; y <= 7; y++) w.push([10, y]); for (let y = 13; y <= 17; y++) w.push([10, y]); for (let x = 14; x <= 18; x++) w.push([x, 10]); for (let x = 2; x <= 6; x++) w.push([x, 15]); return w; } },
    { n: "The Room", walls: () => { const w = []; for (let i = 3; i <= 16; i++) { if (i < 9 || i > 10) { w.push([i, 3], [i, 16]); } if (i < 9 || i > 11) { w.push([3, i], [16, i]); } } return w; } },
    { n: "Portals", walls: () => { const w = []; for (let y = 0; y <= 19; y++) { if (y <= 7 || y >= 13) { w.push([7, y], [13, y]); } } return w; }, portals: [[2, 2], [17, 17]] }
  ];
  const DEATH = {
    wall: ["Hit a wall while hunting {f}.", "The wall won. It usually does.", "Walls: 1. You: 0."],
    self: ["Ate yourself. Technically still eating.", "You were the snack all along.", "Self-defeating, literally."],
    bomb: ["Ate a bomb. It was not a snack.", "That was a bomb. It said so on it.", "Spicy. Fatally."],
    time: ["Time's up.", "The clock ate you."]
  };

  /* ---------- Persistent data ---------- */
  const DEF = () => ({ best: {}, daily: { date: "", best: 0 }, games: 0, eaten: 0, longest: 0, trophies: {}, skin: "lime", mode: "escalation" });
  let D;
  try { let raw = store.get("snake2", null); if (typeof raw === "string") raw = JSON.parse(raw); D = Object.assign(DEF(), raw || {}); } catch (e) { D = DEF(); }
  D.best = D.best || {}; D.trophies = D.trophies || {}; D.daily = D.daily || { date: "", best: 0 };
  const legacy = +store.get("snake.hi", 0) || 0;
  if (legacy > (D.best.escalation || 0)) D.best.escalation = legacy;
  const save = () => { try { store.set("snake2", JSON.stringify(D)); } catch (e) { /* storage full */ } };
  const maxBest = () => Math.max(0, ...Object.keys(MODES).filter(k => k !== "zen").map(k => D.best[k] || 0), D.daily.best || 0);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  if (!MODES[D.mode]) D.mode = "escalation";
  if (!SKINS.some(s => s.id === D.skin && s.ok())) D.skin = "lime";

  function trophy(id) {
    if (D.trophies[id]) return;
    const t = TROPHIES.find(x => x[0] === id);
    if (!t) return;
    D.trophies[id] = Date.now(); save();
    toast({ icon: t[1], kicker: "Trophy", title: t[2], text: t[3], ms: 2800 });
    floatText(t[1] + " " + t[2], "#ffd60a");
  }

  /* ---------- RNG ---------- */
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let rng = Math.random;
  const pick = a => a[Math.floor(rng() * a.length)];
  const pickR = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- DOM ---------- */
  const N = 20;
  const cv = $("board"), ctx = cv.getContext("2d"), wrap = $("wrap"), ov = $("ov"), pauseBtn = $("pauseBtn");
  const el = { score: $("score"), best: $("best"), len: $("len"), mstat: $("mstat"), mlbl: $("mlbl"), combo: $("combo"), cbar: $("cbar"), eatG: $("eatG"), eatN: $("eatN"), eatC: $("eatC"), fx: $("fx"), menu: $("menu") };
  el.menu.innerHTML = DIET.map((d, i) => `<i data-i="${i}" title="${esc(d.n)}">${d.e}</i>`).join("");

  /* ---------- Game state ---------- */
  let state = "menu"; // menu | play | pause | dying | over
  let mode = D.mode, M = MODES[mode];
  let snake, prev, dir, queue, food, item, bomb, walls, portals, fx, score, eaten, tier, combo, maxCombo, lastEatTick, tick, timeLeft, level, levelEaten, trims;
  let cell = 20, W = 400, dpr = 1, acc = 0, last = 0, shakeT = 0, flashT = 0, banner = null, deathReason = "";
  const parts = [], floats = [];
  const key = (x, y) => x + "," + y;

  function resetRun() {
    rng = mode === "daily" ? mulberry(+today().replace(/-/g, "")) : Math.random;
    snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
    prev = snake.map(s => ({ ...s }));
    dir = { x: 1, y: 0 }; queue = [];
    item = null; bomb = null; fx = { ghost: 0, slow: 0, magnet: 0, double: 0 };
    score = 0; eaten = 0; tier = 0; combo = 0; maxCombo = 1; lastEatTick = -999; tick = 0;
    timeLeft = 60000; level = 1; levelEaten = 0; trims = 0;
    parts.length = 0; floats.length = 0; banner = null;
    loadLevel();
    placeFood();
  }
  function loadLevel() {
    walls = new Set(); portals = null;
    if (mode !== "maze") return;
    const L = MAZES[level - 1];
    L.walls().forEach(([x, y]) => walls.add(key(x, y)));
    if (L.portals) portals = L.portals.map(([x, y]) => ({ x, y }));
  }
  const occupied = (x, y) => walls.has(key(x, y)) || snake.some(s => s.x === x && s.y === y) ||
    (food && food.x === x && food.y === y) || (item && item.x === x && item.y === y) || (bomb && bomb.x === x && bomb.y === y) ||
    (portals && portals.some(p => p.x === x && p.y === y));
  function freeCell() {
    const h = snake[0], free = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (!occupied(x, y) && Math.abs(x - h.x) + Math.abs(y - h.y) > 2) free.push({ x, y });
    return free.length ? free[Math.floor(rng() * free.length)] : null;
  }
  function placeFood() { food = null; food = freeCell(); }
  function maybeItem() {
    if (item || rng() > 0.24) return;
    const types = Object.keys(ITEMS).filter(k => !ITEMS[k].only || ITEMS[k].only === mode);
    const c = freeCell();
    if (c) item = { ...c, type: pick(types), ttl: 45 };
  }
  function maybeBomb() {
    if (!M.diet || bomb || tier < 2 || rng() > 0.28) return;
    const c = freeCell();
    if (c) bomb = { ...c, ttl: 70 };
  }

  /* ---------- Timing ---------- */
  function interval() {
    let b;
    if (M.diet) b = Math.max(58, 135 - eaten * 1.5);
    else if (mode === "zen") b = Math.max(85, 125 - eaten * 0.5);
    else if (mode === "time") b = Math.max(65, 100 - eaten * 0.8);
    else b = Math.max(70, 128 - (level - 1) * 10 - levelEaten * 1.5);
    return fx.slow > 0 ? b * 1.6 : b;
  }
  const mult = () => Math.min(5, 1 + Math.floor(Math.max(0, combo - 1) / 3)) * (fx.double > 0 ? 2 : 1);
  const tierFor = n => { let t = 0; DIET.forEach((d, i) => { if (n >= d.at) t = i; }); return t; };

  /* ---------- Step ---------- */
  function step() {
    tick++;
    prev = snake.map(s => ({ ...s }));
    if (queue.length) dir = queue.shift();
    let hx = snake[0].x + dir.x, hy = snake[0].y + dir.y;
    const ghost = fx.ghost > 0;
    if (hx < 0 || hy < 0 || hx >= N || hy >= N) {
      if (M.wrap || ghost) { hx = (hx + N) % N; hy = (hy + N) % N; } else return die("wall");
    }
    let head = { x: hx, y: hy };
    if (portals) {
      const pi = portals.findIndex(p => p.x === hx && p.y === hy);
      if (pi >= 0) { const o = portals[1 - pi]; head = { x: o.x, y: o.y }; burst(o.x, o.y, "#bf5af2", 10); sound("pop"); }
    }
    if (walls.has(key(head.x, head.y)) && !ghost) return die("wall");
    const eating = food && head.x === food.x && head.y === food.y;
    const body = eating ? snake : snake.slice(0, -1);
    const hit = body.findIndex(s => s.x === head.x && s.y === head.y);
    if (hit >= 0) {
      if (ghost) trophy("ghostself");
      else if (mode === "zen") {
        const cut = snake.length - Math.max(hit, 3);
        snake.slice(Math.max(hit, 3)).forEach(s => burst(s.x, s.y, "#8e8e93", 2));
        snake = snake.slice(0, Math.max(hit, 3)); prev = prev.slice(0, snake.length);
        trims++; floatText(`Trimmed ${cut}`, "#c7c7cc", head); sound("thud"); buzz(20);
      } else return die("self");
    }
    snake.unshift(head);
    if (eating) eat(head); else snake.pop();

    if (item && head.x === item.x && head.y === item.y) pickup(item);
    if (bomb && head.x === bomb.x && bomb.y === head.y) {
      if (ghost) { burst(bomb.x, bomb.y, "#ffd60a", 18); floatText("Defused +3", "#ffd60a", bomb); score += 3; bomb = null; trophy("defuse"); sound("win"); }
      else { trophy("bomb"); return die("bomb"); }
    }
    if (item && --item.ttl <= 0) item = null;
    if (bomb && --bomb.ttl <= 0) { burst(bomb.x, bomb.y, "#8e8e93", 6); bomb = null; }
    Object.keys(fx).forEach(k => {
      if (fx[k] > 0 && --fx[k] === 0) floatText(ITEMS[k].n + " wore off", "#a1a1a6", snake[0]);
    });
    if (fx.magnet > 0 && food && tick % 2 === 0) {
      const h = snake[0], dx = Math.sign(h.x - food.x), dy = Math.sign(h.y - food.y);
      const opts = Math.abs(h.x - food.x) >= Math.abs(h.y - food.y) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
      for (const [mx, my] of opts) {
        if (!mx && !my) continue;
        const nx = food.x + mx, ny = food.y + my;
        const f = food; food = null;
        const blocked = nx < 0 || ny < 0 || nx >= N || ny >= N || occupied(nx, ny);
        food = f;
        if (!blocked) { food = { x: nx, y: ny }; break; }
      }
    }
    if (tick - lastEatTick > 28 && combo > 0) combo = 0;
    if (mode === "zen" && snake.length >= 50) trophy("zen50");
    hud();
  }

  function eat(at) {
    eaten++; D.eaten++;
    combo = tick - lastEatTick <= 28 ? combo + 1 : 1;
    lastEatTick = tick;
    const m = mult();
    maxCombo = Math.max(maxCombo, m);
    if (Math.min(5, 1 + Math.floor((combo - 1) / 3)) >= 5) trophy("combo5");
    const base = M.diet ? 1 + Math.floor(tier / 2) : 1;
    const pts = base * m;
    score += pts;
    if (mode === "time") timeLeft = Math.min(99000, timeLeft + 1500);
    burst(at.x, at.y, "#b8f23a", reduced ? 6 : 14);
    floatText(`+${pts}${m > 1 ? ` ×${m}` : ""}`, m > 1 ? "#ffd60a" : "#ffffff", at);
    sound("pop"); buzz(10);
    trophy("first");
    if (D.eaten >= 100) trophy("century");
    if (M.diet) {
      const t = tierFor(eaten);
      if (t !== tier) {
        tier = t;
        const d = DIET[tier];
        banner = { t: `${d.e} Now eating: ${d.n}`, s: d.c, life: 2200 };
        shake(260); sound("win");
        if (tier >= 6) unlock("snake-sap");
        if (d.n === "The Earth") trophy("earth");
        if (d.n === "The Galaxy") trophy("galaxy");
        paintSide();
      }
    }
    if (mode === "maze" && ++levelEaten >= 8) return nextLevel();
    placeFood(); maybeItem(); maybeBomb();
  }

  function pickup(it) {
    const I = ITEMS[it.type];
    burst(it.x, it.y, "#64d2ff", 14);
    sound("win"); buzz([10, 30, 10]);
    if (it.type === "gold") { const p = 5 * mult(); score += p; floatText(`⭐ +${p}`, "#ffd60a", it); }
    else if (it.type === "scissors") {
      const keep = Math.max(3, Math.ceil(snake.length * 2 / 3));
      snake.slice(keep).forEach(s => burst(s.x, s.y, "#c7c7cc", 2));
      snake = snake.slice(0, keep); prev = prev.slice(0, keep);
      score += 2; floatText("✂️ Trimmed +2", "#ffffff", it); trophy("scissors");
    } else if (it.type === "clock") { timeLeft += 5000; floatText("⏰ +5s", "#64d2ff", it); }
    else { fx[it.type] = I.t; floatText(`${I.e} ${I.n}!`, "#64d2ff", it); }
    item = null;
  }

  function nextLevel() {
    if (level >= MAZES.length) { trophy("mazeall"); return finish("win"); }
    level++; levelEaten = 0;
    if (level >= 3) trophy("maze3");
    snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
    prev = snake.map(s => ({ ...s }));
    dir = { x: 1, y: 0 }; queue = []; item = null; bomb = null;
    loadLevel(); placeFood();
    banner = { t: `Level ${level}: ${MAZES[level - 1].n}`, s: level === 5 ? "Purple rings are portals." : "Eat 8 to continue.", life: 2000 };
    acc = -900; sound("win"); paintSide();
  }

  /* ---------- Death & results ---------- */
  function die(reason) {
    deathReason = reason;
    state = "dying";
    sound("thud"); buzz([40, 40, 90]);
    shake(500); flashT = 260;
    snake.forEach((s, i) => { if (i % 2 === 0) burst(s.x, s.y, "#ff453a", reduced ? 2 : 4); });
    setTimeout(() => finish(reason), 850);
  }
  function finish(reason) {
    state = "over";
    const val = mode === "zen" ? snake.length : score;
    let isBest = false;
    if (mode === "daily") {
      trophy("daily");
      if (D.daily.date !== today()) D.daily = { date: today(), best: 0 };
      if (val > D.daily.best) { D.daily.best = val; isBest = val > 0; }
    }
    if (val > (D.best[mode] || 0)) { D.best[mode] = val; isBest = val > 0; }
    if (mode === "escalation" && val > legacy) store.set("snake.hi", val);
    if (mode === "time" && score >= 40) trophy("ta40");
    if (val === 0 && mode !== "zen") trophy("zero");
    D.games++; D.longest = Math.max(D.longest, snake.length); save();
    const f = DIET[tier].n.toLowerCase();
    const msgs = {
      wall: DEATH.wall, self: DEATH.self, bomb: DEATH.bomb, time: DEATH.time,
      end: ["You chose peace. Respect."], win: ["All five mazes cleared. The snake is now a cartographer."]
    }[reason] || ["Game over."];
    const why = val === 0 && reason !== "end" ? "Zero. Not even the first bite. Impressive in its own way." : pickR(msgs).replace("{f}", (/^[aeiou]/.test(f) ? "an " : "a ") + f);
    const icon = { win: "🏆", end: "🧘", time: "⏱️", bomb: "💥" }[reason] || "🐍";
    const title = reason === "win" ? "Mazes cleared" : reason === "end" ? "Run ended" : mode === "zen" ? `Length ${val}` : `Score ${val}`;
    showOv(`<div class="ov-logo">${icon}</div><h2>${esc(title)}</h2><p class="ov-d">${esc(why)}</p>
      ${isBest ? `<div class="nb">New ${mode === "daily" ? "daily " : ""}best</div>` : ""}
      <div class="res"><div><b>${score}</b><span>Score</span></div><div><b>${snake.length}</b><span>Length</span></div><div><b>${eaten}</b><span>Eaten</span></div><div><b>×${maxCombo}</b><span>Combo</span></div></div>
      <button class="sb pri big" data-act="start">Play again</button>
      <div class="ov-row"><button class="sb" data-act="menu">Menu</button><button class="sb" data-act="stats">🏆 Trophies</button></div>`);
    hud();
  }

  /* ---------- Effects ---------- */
  function burst(gx, gy, color, n) {
    const cx = (gx + .5) * cell, cy = (gy + .5) * cell;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.04 + Math.random() * 0.14) * cell;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color, r: cell * (0.06 + Math.random() * 0.08) });
    }
    if (parts.length > 400) parts.splice(0, parts.length - 400);
  }
  function floatText(t, color, at) {
    const p = at || (snake && snake[0]) || { x: N / 2, y: N / 2 };
    floats.push({ x: (p.x + .5) * cell, y: (p.y + .2) * cell, t, color, life: 1 });
  }
  function shake(ms) { if (!reduced) shakeT = Math.max(shakeT, ms); }

  /* ---------- Rendering ---------- */
  const sprites = new Map();
  function sprite(e) {
    const s = Math.max(16, Math.round(cell * dpr * 1.3));
    const k = e + "|" + s;
    if (sprites.has(k)) return sprites.get(k);
    const c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d");
    x.globalAlpha = 1;
    x.fillStyle = "#ffffff"; // opaque — emoji glyphs inherit fill alpha
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `${Math.round(s * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif`;
    x.fillText(e, s / 2, s / 2 + s * 0.05);
    sprites.set(k, c);
    return c;
  }
  function drawSprite(e, gx, gy, scale = 1) {
    const s = cell * 1.3 * scale;
    ctx.globalAlpha = 1;
    ctx.drawImage(sprite(e), (gx + .5) * cell - s / 2, (gy + .5) * cell - s / 2, s, s);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function skinColor(i, len, now) {
    const t = i / Math.max(len - 1, 1);
    switch (D.skin) {
      case "neon": return `hsl(${185 + t * 125}, 100%, 60%)`;
      case "midnight": return `hsl(220, 18%, ${88 - t * 55}%)`;
      case "lava": return `hsl(${Math.max(0, 48 - t * 50 + 8 * Math.sin(i * 0.6 + now / 180))}, 100%, ${58 - t * 22}%)`;
      case "rainbow": return `hsl(${(i * 22 + now / 8) % 360}, 90%, 60%)`;
      case "glitch": return ["#00ffd5", "#ff2a6d", "#f5f5f7"][(i + Math.floor(now / 140)) % 3];
      case "gold": return `hsl(46, 95%, ${Math.max(30, 64 - t * 26 + 10 * Math.sin(i * 0.5 - now / 160))}%)`;
      default: return `hsl(${82 - t * 40}, 100%, ${62 - t * 22}%)`;
    }
  }
  function render(alpha, now, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#060708"; ctx.fillRect(0, 0, W, W);
    ctx.save();
    if (shakeT > 0) { const a = cell * 0.25 * (shakeT / 500); ctx.translate((Math.random() - .5) * a, (Math.random() - .5) * a); }

    // board
    ctx.fillStyle = "rgba(255,255,255,0.028)";
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) ctx.fillRect(x * cell, y * cell, cell, cell);
    if (!M.wrap) { ctx.strokeStyle = "rgba(255,69,58,0.25)"; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, W - 2); }
    if (!snake) { ctx.restore(); return; }

    // walls
    walls.forEach(k => {
      const [x, y] = k.split(",").map(Number);
      const g = ctx.createLinearGradient(0, y * cell, 0, (y + 1) * cell);
      g.addColorStop(0, "#4a5263"); g.addColorStop(1, "#2a2f3a");
      ctx.fillStyle = g; rr(x * cell + 1, y * cell + 1, cell - 2, cell - 2, cell * 0.18); ctx.fill();
    });
    // portals
    if (portals) portals.forEach((p, i) => {
      const cx = (p.x + .5) * cell, cy = (p.y + .5) * cell;
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = i ? `rgba(10,132,255,${0.9 - r * 0.25})` : `rgba(191,90,242,${0.9 - r * 0.25})`;
        ctx.lineWidth = cell * 0.08;
        ctx.beginPath();
        const a0 = now / 300 * (i ? -1 : 1) + r * 2;
        ctx.arc(cx, cy, cell * (0.42 - r * 0.11), a0, a0 + Math.PI * 1.4); ctx.stroke();
      }
    });
    // food (halo + sprite)
    if (food) {
      const pulse = reduced ? 1 : 1 + 0.07 * Math.sin(now / 170);
      const cx = (food.x + .5) * cell, cy = (food.y + .5) * cell;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 1.1);
      g.addColorStop(0, "rgba(255,214,10,0.35)"); g.addColorStop(1, "rgba(255,214,10,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - cell * 1.1, cy - cell * 1.1, cell * 2.2, cell * 2.2);
      drawSprite(M.diet ? DIET[tier].e : mode === "maze" ? "🍏" : mode === "time" ? "🍒" : "🍑", food.x, food.y, pulse * 0.92);
    }
    // item
    if (item) {
      const cx = (item.x + .5) * cell, cy = (item.y + .5) * cell;
      const blink = item.ttl < 12 && Math.floor(now / 120) % 2;
      ctx.strokeStyle = "rgba(100,210,255,0.9)"; ctx.lineWidth = cell * 0.07;
      ctx.beginPath(); ctx.arc(cx, cy, cell * 0.52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (item.ttl / 45)); ctx.stroke();
      if (!blink) drawSprite(ITEMS[item.type].e, item.x, item.y, 0.8);
    }
    // bomb
    if (bomb) {
      const cx = (bomb.x + .5) * cell, cy = (bomb.y + .5) * cell;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell);
      g.addColorStop(0, `rgba(255,69,58,${0.25 + 0.15 * Math.sin(now / 90)})`); g.addColorStop(1, "rgba(255,69,58,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - cell, cy - cell, cell * 2, cell * 2);
      if (!(bomb.ttl < 12 && Math.floor(now / 120) % 2)) drawSprite("💣", bomb.x, bomb.y, 0.85);
    }

    // snake
    const len = snake.length;
    const P = snake.map((s, i) => {
      const p = prev[i] || prev[prev.length - 1] || s;
      const jump = Math.abs(p.x - s.x) > 1 || Math.abs(p.y - s.y) > 1;
      const a = jump ? 1 : alpha;
      return { x: (p.x + (s.x - p.x) * a + .5) * cell, y: (p.y + (s.y - p.y) * a + .5) * cell };
    });
    const ghost = fx.ghost > 0;
    ctx.globalAlpha = ghost ? (fx.ghost < 12 && Math.floor(now / 100) % 2 ? 0.25 : 0.5) : 1;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = len - 1; i >= 1; i--) {
      const a = P[i], b = P[i - 1];
      if (Math.hypot(a.x - b.x, a.y - b.y) > cell * 1.5) continue;
      ctx.strokeStyle = skinColor(i, len, now);
      ctx.lineWidth = cell * (0.78 - 0.26 * (i / len));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    const h = P[0];
    ctx.fillStyle = skinColor(0, len, now);
    ctx.beginPath(); ctx.arc(h.x, h.y, cell * 0.45, 0, Math.PI * 2); ctx.fill();
    // tongue
    if (state === "play" && tick % 14 < 3) {
      ctx.strokeStyle = "#ff375f"; ctx.lineWidth = cell * 0.06;
      const tx = h.x + dir.x * cell * 0.45, ty = h.y + dir.y * cell * 0.45, L = cell * 0.28;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + dir.x * L, ty + dir.y * L);
      ctx.moveTo(tx + dir.x * L, ty + dir.y * L); ctx.lineTo(tx + dir.x * L * 1.3 + dir.y * L * .3, ty + dir.y * L * 1.3 + dir.x * L * .3);
      ctx.moveTo(tx + dir.x * L, ty + dir.y * L); ctx.lineTo(tx + dir.x * L * 1.3 - dir.y * L * .3, ty + dir.y * L * 1.3 - dir.x * L * .3);
      ctx.stroke();
    }
    // eyes
    const px = -dir.y, py = dir.x;
    [1, -1].forEach(k => {
      const ex = h.x + px * cell * 0.2 * k + dir.x * cell * 0.12, ey = h.y + py * cell * 0.2 * k + dir.y * cell * 0.12;
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ex, ey, cell * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#08090a"; ctx.beginPath(); ctx.arc(ex + dir.x * cell * 0.04, ey + dir.y * cell * 0.04, cell * 0.065, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt / 600;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    // floating text
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(12, cell * 0.62)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= dt * 0.03 * (cell / 20); f.life -= dt / 1100;
      if (f.life <= 0) { floats.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.7)";
      const fx2 = Math.min(W - cell * 3, Math.max(cell * 3, f.x));
      ctx.strokeText(f.t, fx2, f.y); ctx.fillStyle = f.color; ctx.fillText(f.t, fx2, f.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // banner
    if (banner) {
      banner.life -= dt;
      if (banner.life <= 0) banner = null;
      else {
        const a = Math.min(1, banner.life / 400, (2200 - banner.life) / 200 + 0.2);
        ctx.globalAlpha = Math.max(0, a);
        const bw = Math.min(W - 24, Math.max(220, W * 0.8)), bh = cell * 2.6, bx = (W - bw) / 2, by = W * 0.12;
        ctx.fillStyle = "rgba(10,12,14,0.88)"; rr(bx, by, bw, bh, 14); ctx.fill();
        ctx.strokeStyle = "rgba(184,242,58,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#ffffff"; ctx.font = `700 ${Math.max(14, cell * 0.7)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillText(banner.t, W / 2, by + bh * 0.38, bw - 20);
        ctx.fillStyle = "#c7c7cc"; ctx.font = `${Math.max(11, cell * 0.5)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillText(banner.s, W / 2, by + bh * 0.72, bw - 20);
        ctx.globalAlpha = 1;
      }
    }
    // time attack bar
    if (mode === "time" && state !== "menu") {
      const f = Math.max(0, Math.min(1, timeLeft / 60000));
      ctx.fillStyle = timeLeft < 10000 ? "#ff453a" : "#64d2ff";
      ctx.fillRect(0, 0, W * f, 4);
    }
    if (flashT > 0) { ctx.globalAlpha = flashT / 260 * 0.35; ctx.fillStyle = "#ff453a"; ctx.fillRect(0, 0, W, W); ctx.globalAlpha = 1; }
  }

  /* ---------- HUD ---------- */
  function hud() {
    el.score.textContent = mode === "zen" ? (snake ? snake.length : 3) : score;
    const best = mode === "daily" ? (D.daily.date === today() ? D.daily.best : 0) : (D.best[mode] || 0);
    el.best.textContent = best;
    el.len.textContent = snake ? snake.length : 3;
    if (M.diet) { el.mlbl.textContent = "Tier"; el.mstat.textContent = `${tier + 1}/${DIET.length}`; }
    else if (mode === "zen") { el.mlbl.textContent = "Trims"; el.mstat.textContent = trims || 0; }
    else if (mode === "time") { el.mlbl.textContent = "Time"; el.mstat.textContent = (Math.max(0, timeLeft) / 1000).toFixed(1); }
    else { el.mlbl.textContent = "Level"; el.mstat.textContent = `${level}·${levelEaten}/8`; }
    const m = state === "menu" ? 1 : mult();
    el.combo.textContent = "×" + m;
    const left = combo > 0 ? Math.max(0, 1 - (tick - lastEatTick) / 28) : 0;
    el.cbar.style.width = (state === "play" ? left * 100 : 0) + "%";
    el.fx.innerHTML = state === "menu" ? "" : Object.keys(fx).filter(k => fx[k] > 0).map(k => `<span class="chip">${ITEMS[k].e} ${ITEMS[k].n}<i style="width:${fx[k] / ITEMS[k].t * 100}%"></i></span>`).join("");
  }
  function paintSide() {
    el.menu.classList.toggle("hide", !M.diet);
    if (M.diet) {
      const d = DIET[tier || 0];
      el.eatG.textContent = d.e; el.eatN.textContent = d.n; el.eatC.textContent = d.c;
      el.menu.querySelectorAll("i").forEach((x, i) => { x.classList.toggle("on", i <= tier); x.classList.toggle("lock", i > tier + 1); });
    } else if (mode === "maze") {
      el.eatG.textContent = "🧱"; el.eatN.textContent = `Level ${level}: ${MAZES[level - 1].n}`; el.eatC.textContent = level === 5 ? "Purple and blue rings are linked portals." : "Eat 8 to open the next level.";
    } else if (mode === "time") {
      el.eatG.textContent = "⏱️"; el.eatN.textContent = "Time Attack"; el.eatC.textContent = "Each bite adds 1.5 seconds. Edges wrap.";
    } else {
      el.eatG.textContent = "🧘"; el.eatN.textContent = "Zen"; el.eatC.textContent = "Nothing can hurt you. Except you, slightly.";
    }
  }

  /* ---------- Screens ---------- */
  function showOv(html) { ov.innerHTML = `<div class="ov-in">${html}</div>`; ov.classList.remove("hide"); ov.scrollTop = 0; pauseBtn.hidden = true; }
  function hideOv() { ov.classList.add("hide"); pauseBtn.hidden = false; }
  function bestLabel(k) {
    if (k === "daily") return D.daily.date === today() ? `Today ${D.daily.best}` : "Not played";
    if (k === "zen") return `Longest ${D.best.zen || 0}`;
    return `Best ${D.best[k] || 0}`;
  }
  function menuScreen() {
    state = "menu";
    const m = MODES[D.mode];
    showOv(`<div class="ov-logo">🐍</div><h2>Snake, Escalated</h2>
      <div class="modes">${Object.entries(MODES).map(([k, v]) => `<button class="mode${k === D.mode ? " on" : ""}" data-mode="${k}"><span class="mg">${v.g}</span><b>${v.n}</b><small>${esc(bestLabel(k))}</small></button>`).join("")}</div>
      <p class="ov-d">${esc(m.d)}</p>
      <button class="sb pri big" data-act="start">Play ${esc(m.n)}</button>
      <div class="ov-row"><button class="sb" data-act="skins">🎨 Skins</button><button class="sb" data-act="stats">🏆 Trophies</button><button class="sb" data-act="help">❔ Guide</button></div>`);
  }
  function skinsScreen() {
    showOv(`<h2>Skins</h2><div class="skins">${SKINS.map(s => { const ok = s.ok(); return `<button class="skin${s.id === D.skin ? " on" : ""}${ok ? "" : " lock"}" data-skin="${s.id}" ${ok ? "" : "aria-disabled=\"true\""}><i style="background:${s.sw}"></i><b>${ok ? "" : "🔒 "}${s.n}</b><small>${esc(s.how)}</small></button>`; }).join("")}</div>
      <div class="ov-row" style="margin-top:14px"><button class="sb pri" data-act="menu">Done</button></div>`);
  }
  function statsScreen() {
    const n = TROPHIES.filter(t => D.trophies[t[0]]).length;
    showOv(`<h2>Trophies</h2>
      <div class="stats"><div><b>${D.games}</b>Games</div><div><b>${D.eaten}</b>Things eaten</div><div><b>${D.longest}</b>Longest snake</div><div><b>${n}/${TROPHIES.length}</b>Trophies</div></div>
      <h3>Collection</h3>
      <div class="trophies">${TROPHIES.map(t => D.trophies[t[0]] ? `<div class="tro">${t[1]} <b>${esc(t[2])}</b><small>${esc(t[3])}</small></div>` : `<div class="tro lock">❔ <b>???</b><small>${esc(t[3])}</small></div>`).join("")}</div>
      <div class="ov-row" style="margin-top:14px"><button class="sb pri" data-act="menu">Back</button></div>`);
  }
  function helpScreen() {
    showOv(`<h2>Guide</h2>
      <div class="legend">
        <div><span>🎮</span>${matchMedia("(pointer: coarse)").matches ? "Swipe on the board or use the D-pad. Tap ❚❚ to pause." : "Arrow keys or WASD. Space or P pauses. Esc opens the menu."}</div>
        <div><span>🔥</span>Eat again within a few moves to build a combo. Every 3 quick bites adds ×1, up to ×5.</div>
        ${Object.values(ITEMS).map(i => `<div><span>${i.e}</span><b>${i.n}</b>&nbsp;— ${esc(i.d)}</div>`).join("")}
        <div><span>💣</span><b>Bomb</b>&nbsp;— Escalation and Daily only. Don't eat it. Unless you're a ghost.</div>
      </div>
      <div class="ov-row" style="margin-top:14px"><button class="sb pri" data-act="menu">Back</button></div>`);
  }
  function pauseScreen() {
    showOv(`<div class="ov-logo">⏸️</div><h2>Paused</h2><p class="ov-d">${pickR(["The snake is contemplating its choices.", "Snack break.", "The food is waiting. Patiently. Unlike you."])}</p>
      <button class="sb pri big" data-act="resume">Resume</button>
      <div class="ov-row"><button class="sb" data-act="start">Restart</button>${mode === "zen" ? `<button class="sb" data-act="end">End run</button>` : ""}<button class="sb" data-act="menu">Menu</button></div>`);
  }

  /* ---------- Flow ---------- */
  function start() {
    mode = D.mode; M = MODES[mode]; save();
    resetRun();
    if (mode === "daily") trophy("daily");
    state = "play"; acc = -700;
    banner = { t: `${M.g} ${M.n}`, s: mode === "maze" ? `Level 1: ${MAZES[0].n}` : mode === "daily" ? `Seed ${today()}` : "Go!", life: 1500 };
    hideOv(); paintSide(); hud();
    sound("click");
  }
  function pause() { if (state !== "play") return; state = "pause"; pauseScreen(); }
  function resume() { if (state !== "pause") return; state = "play"; acc = -300; hideOv(); }

  ov.addEventListener("click", e => {
    const m = e.target.closest("[data-mode]");
    if (m) { D.mode = m.dataset.mode; save(); mode = D.mode; M = MODES[mode]; resetRun(); paintSide(); hud(); sound("click"); return menuScreen(); }
    const s = e.target.closest("[data-skin]");
    if (s) {
      const sk = SKINS.find(x => x.id === s.dataset.skin);
      if (sk && sk.ok()) { D.skin = sk.id; save(); sound("pop"); skinsScreen(); } else sound("error");
      return;
    }
    const a = e.target.closest("[data-act]");
    if (!a) return;
    const act = a.dataset.act;
    if (act === "start") start();
    else if (act === "resume") resume();
    else if (act === "end") finish("end");
    else if (act === "menu") { if (state === "pause" || state === "over") { state = "menu"; resetRun(); paintSide(); hud(); } menuScreen(); }
    else if (act === "skins") skinsScreen();
    else if (act === "stats") statsScreen();
    else if (act === "help") helpScreen();
  });
  pauseBtn.addEventListener("click", pause);

  /* ---------- Input ---------- */
  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  function turn(name) {
    const d = DIRS[name];
    if (!d || state !== "play") return;
    const lastD = queue.length ? queue[queue.length - 1] : dir;
    if ((d.x === lastD.x && d.y === lastD.y) || (d.x === -lastD.x && d.y === -lastD.y)) return;
    if (queue.length < 3) queue.push(d);
  }
  const KEYS = { arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right", w: "up", s: "down", a: "left", d: "right" };
  document.addEventListener("keydown", e => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    const k = e.key.toLowerCase();
    if (KEYS[k] && state === "play") { e.preventDefault(); turn(KEYS[k]); return; }
    if ((k === " " || k === "p") && (state === "play" || state === "pause")) { e.preventDefault(); state === "play" ? pause() : resume(); return; }
    if (k === "escape") { if (state === "play") pause(); else if (state === "pause" || state === "over") { state = "menu"; resetRun(); paintSide(); hud(); menuScreen(); } return; }
    if (k === "enter" && (state === "menu" || state === "over") && !(e.target.closest && e.target.closest("button"))) { e.preventDefault(); start(); }
  });
  $("dpad").addEventListener("pointerdown", e => { const b = e.target.closest("[data-dir]"); if (b) { e.preventDefault(); turn(b.dataset.dir); } });
  let sx = 0, sy = 0, swiped = false;
  wrap.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; swiped = false; }, { passive: true });
  wrap.addEventListener("touchmove", e => {
    if (state !== "play") return;
    e.preventDefault();
    if (swiped) return;
    const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    sx = t.clientX; sy = t.clientY; // allow chained swipes in one gesture
  }, { passive: false });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  window.addEventListener("blur", pause);

  /* ---------- Resize & loop ---------- */
  function resize() {
    const r = wrap.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; cell = W / N;
    cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr);
    sprites.clear();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap); else window.addEventListener("resize", resize);

  let hudT = 0;
  function frame(t) {
    const dt = Math.min(100, t - (last || t)); last = t;
    if (shakeT > 0) shakeT -= dt;
    if (flashT > 0) flashT -= dt;
    let alpha = 1;
    if (state === "play") {
      if (mode === "time" && acc >= 0) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; die("time"); }
      }
      acc += dt;
      let iv = interval(), guard = 0;
      while (state === "play" && acc >= iv && guard++ < 5) { acc -= iv; step(); iv = interval(); }
      alpha = state === "play" ? Math.max(0, Math.min(1, acc / iv)) : 1;
      hudT += dt;
      if (hudT > 100) { hudT = 0; hud(); }
    }
    render(alpha, t, dt);
    requestAnimationFrame(frame);
  }

  resize();
  resetRun(); paintSide(); hud();
  menuScreen();
  requestAnimationFrame(frame);
})();
