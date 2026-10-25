/* Experiment 009 — Snake, Escalated */
(function () {
  "use strict";
  const { store, unlock, sound, toast } = window.LAB;

  const DIET = [
    { at: 0,  e: "🍎", n: "Apple",        c: "A healthy start. It won't last." },
    { at: 4,  e: "🍕", n: "Pizza",        c: "Diet officially abandoned." },
    { at: 8,  e: "☕", n: "Coffee",       c: "Now with 400% more jitter." },
    { at: 12, e: "📱", n: "Smartphone",   c: "Screen time: increasing." },
    { at: 16, e: "💻", n: "Laptop",       c: "IT has been notified." },
    { at: 20, e: "🖨️", n: "Printer",      c: "Finally. Justice." },
    { at: 25, e: "🗄️", n: "SAP Server",   c: "Production is down. Worth it." },
    { at: 30, e: "🏢", n: "Office Building", c: "HR would like a word." },
    { at: 36, e: "🚀", n: "Rocket",       c: "We're not stopping, are we?" },
    { at: 42, e: "🌍", n: "The Earth",    c: "Well. That's everyone." }
  ];

  const N = 18;
  const cv = document.getElementById("board");
  const ctx = cv.getContext("2d");
  const wrap = document.getElementById("wrap");
  const overlay = document.getElementById("overlay");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const playBtn = document.getElementById("play");
  const scoreEl = document.getElementById("score");
  const hiEl = document.getElementById("hi");
  const menu = document.getElementById("menu");

  let cell = 20, snake, dir, nextDir, food, score, tier, running = false, paused = false, timer = null;
  let hi = store.get("snake.hi", 0);
  hiEl.textContent = hi;
  menu.innerHTML = DIET.map((d, i) => `<i data-i="${i}" title="${d.n}">${d.e}</i>`).join("");

  function resize() {
    const r = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = r.width * dpr; cv.height = r.width * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = r.width / N;
    draw();
  }

  function tierFor(s) { let t = 0; DIET.forEach((d, i) => { if (s >= d.at) t = i; }); return t; }
  function paintDiet() {
    const d = DIET[tier];
    document.getElementById("eatG").textContent = d.e;
    document.getElementById("eatN").textContent = d.n;
    document.getElementById("eatC").textContent = d.c;
    menu.querySelectorAll("i").forEach((el, i) => { el.classList.toggle("on", i <= tier); el.classList.toggle("lock", i > tier + 1); });
  }

  function placeFood() {
    const free = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    food = free[Math.floor(Math.random() * free.length)];
  }

  function reset() {
    snake = [{ x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }];
    dir = nextDir = { x: 1, y: 0 };
    score = 0; tier = 0;
    scoreEl.textContent = 0;
    placeFood(); paintDiet();
  }

  function speed() { return Math.max(65, 150 - score * 2.2); }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N;
    const hitSelf = snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) return gameOver(hitWall);
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      sound("pop");
      if (navigator.vibrate) navigator.vibrate(10);
      const t = tierFor(score);
      if (t !== tier) {
        tier = t; paintDiet();
        const d = DIET[tier];
        toast({ icon: d.e, kicker: "Diet escalated", title: `Now eating: ${d.n}`, text: d.c, ms: 2600 });
        if (d.n === "SAP Server") unlock("snake-sap");
      }
      placeFood();
    } else snake.pop();
    draw();
    timer = setTimeout(step, speed());
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw() {
    const W = cell * N;
    ctx.clearRect(0, 0, W, W);
    // subtle checkerboard
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      if ((x + y) % 2) { ctx.fillStyle = "rgba(255,255,255,0.018)"; ctx.fillRect(x * cell, y * cell, cell, cell); }
    }
    if (!snake) return;
    // food
    if (food) {
      ctx.font = `${cell * 0.82}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(DIET[tier].e, food.x * cell + cell / 2, food.y * cell + cell / 2 + cell * 0.04);
    }
    // snake
    snake.forEach((s, i) => {
      const t = i / Math.max(snake.length - 1, 1);
      ctx.fillStyle = `hsl(${82 - t * 40}, 100%, ${62 - t * 22}%)`;
      const pad = i === 0 ? cell * 0.06 : cell * 0.12;
      roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.3);
      ctx.fill();
    });
    // eyes
    const h = snake[0], cx = h.x * cell + cell / 2, cy = h.y * cell + cell / 2;
    const ex = dir.y !== 0 ? cell * 0.2 : 0, ey = dir.x !== 0 ? cell * 0.2 : 0;
    ctx.fillStyle = "#08090a";
    [[1], [-1]].forEach(([k]) => {
      ctx.beginPath(); ctx.arc(cx + ex * k + dir.x * cell * 0.15, cy + ey * k + dir.y * cell * 0.15, cell * 0.08, 0, Math.PI * 2); ctx.fill();
    });
  }

  function start() {
    reset(); running = true; paused = false;
    overlay.classList.add("hide");
    clearTimeout(timer);
    draw();
    timer = setTimeout(step, 400);
  }

  function gameOver(wall) {
    running = false; clearTimeout(timer);
    sound("thud");
    if (navigator.vibrate) navigator.vibrate([40, 40, 80]);
    const isBest = score > hi;
    if (isBest) { hi = score; store.set("snake.hi", hi); hiEl.textContent = hi; }
    const d = DIET[tier];
    ovTitle.textContent = `Score: ${score}`;
    ovText.textContent = score === 0 ? "Zero. Not even the apple. Impressive in its own way."
      : `${wall ? "Hit a wall" : "Ate yourself"} while hunting a ${d.n.toLowerCase()}. ${isBest ? "New personal best!" : "Classic."}`;
    playBtn.textContent = "Play again";
    overlay.classList.remove("hide");
  }

  function turn(name) {
    const D = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[name];
    if (!D || !running) return;
    if (D.x === -dir.x && D.y === -dir.y) return; // no reversing
    nextDir = D;
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) { clearTimeout(timer); ovTitle.textContent = "Paused"; ovText.textContent = "The snake is contemplating its choices."; playBtn.textContent = "Resume"; overlay.classList.remove("hide"); }
    else { overlay.classList.add("hide"); timer = setTimeout(step, 200); }
  }

  playBtn.addEventListener("click", () => { if (paused) togglePause(); else start(); });

  const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
  document.addEventListener("keydown", e => {
    if (KEYS[e.key] && running) { e.preventDefault(); turn(KEYS[e.key]); }
    if (e.key === " " && running) { e.preventDefault(); togglePause(); }
    if (e.key === "Enter" && !running) start();
  });

  document.getElementById("dpad").addEventListener("pointerdown", e => {
    const b = e.target.closest("[data-dir]");
    if (b) { e.preventDefault(); turn(b.dataset.dir); }
  });

  // swipe
  let sx = 0, sy = 0;
  wrap.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  wrap.addEventListener("touchmove", e => { if (running) e.preventDefault(); }, { passive: false });
  wrap.addEventListener("touchend", e => {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });

  document.addEventListener("visibilitychange", () => { if (document.hidden && running && !paused) togglePause(); });
  window.addEventListener("resize", resize);
  reset(); resize();
})();
