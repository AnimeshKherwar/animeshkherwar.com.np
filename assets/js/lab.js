/* =========================================================
   ANIMESH KHERWAR'S LAB — CORE ENGINE
   Exposes window.LAB:
     LAB.store.get(key, fallback) / LAB.store.set(key, value)
     LAB.unlock(achievementId)
     LAB.toast({ icon, kicker, title, text })
     LAB.isTouch, LAB.rand(min,max), LAB.pick(array), LAB.sleep(ms)
     LAB.sound(type)   // "click" | "pop" | "thud" | "error" | "win"
     LAB.experiment    // current experiment object (or null)
   Page hooks (HTML attributes):
     <body data-root="../../" data-exp="001">
     <div data-lab-header></div>   -> sticky header
     <section data-lab-hero></section> -> experiment title block
     <nav data-lab-pager></nav>    -> prev/next experiment links
   ========================================================= */
(function () {
  "use strict";

  const NS = "aklab:";
  const EXPS = window.LAB_EXPERIMENTS || [];
  const ACHS = window.LAB_ACHIEVEMENTS || [];
  const body = document.body;
  const ROOT = body.dataset.root || "./";
  const EXP_ID = body.dataset.exp || null;

  /* ---------- Storage ---------- */
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(NS + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    },
    clearAll() {
      try {
        Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }
  };

  /* ---------- Helpers ---------- */
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if (isTouch) body.classList.add("is-touch");
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const expUrl = e => ROOT + "experiments/" + e.slug + "/";

  /* ---------- Sound (Web Audio, no files) ---------- */
  let actx = null;
  function sound(type) {
    if (store.get("muted", false)) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const presets = {
        click: { f: 520, f2: 260, d: 0.07, w: "triangle", v: 0.12 },
        pop:   { f: 380, f2: 900, d: 0.12, w: "sine", v: 0.14 },
        thud:  { f: 140, f2: 50,  d: 0.25, w: "sine", v: 0.3 },
        error: { f: 220, f2: 110, d: 0.3,  w: "square", v: 0.06 },
        win:   { f: 660, f2: 1320, d: 0.35, w: "sine", v: 0.12 }
      };
      const p = presets[type] || presets.click;
      o.type = p.w;
      o.frequency.setValueAtTime(p.f, t);
      o.frequency.exponentialRampToValueAtTime(p.f2, t + p.d);
      g.gain.setValueAtTime(p.v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.d);
      o.start(t); o.stop(t + p.d + 0.02);
    } catch (e) {}
  }

  /* ---------- Toasts ---------- */
  let stack;
  function toast({ icon = "🧪", kicker = "Lab notice", title = "", text = "", ms = 4200 }) {
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = `<div class="t-icon">${icon}</div><div><small>${esc(kicker)}</small><strong>${esc(title)}</strong>${text ? `<span>${esc(text)}</span>` : ""}</div>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 420); }, ms);
  }

  /* ---------- Achievements ---------- */
  function unlocked() { return store.get("achievements", {}); }
  function unlock(id) {
    const a = ACHS.find(x => x.id === id);
    if (!a) return false;
    const got = unlocked();
    if (got[id]) return false;
    got[id] = Date.now();
    store.set("achievements", got);
    sound("win");
    toast({ icon: a.icon, kicker: "Achievement unlocked", title: a.title, text: a.desc, ms: 5200 });
    updateBadge();
    return true;
  }

  /* ---------- Visits ---------- */
  function visited() { return store.get("visited", {}); }
  function markVisit(id) {
    const v = visited();
    if (!v[id]) { v[id] = Date.now(); store.set("visited", v); }
    const n = Object.keys(v).filter(k => EXPS.some(e => e.id === k)).length;
    if (n >= 5) unlock("curious");
    if (EXPS.length && n >= EXPS.length) unlock("completionist");
  }

  /* ---------- Header ---------- */
  function renderHeader() {
    const slot = document.querySelector("[data-lab-header]");
    if (!slot) return;
    slot.className = "lab-header";
    slot.innerHTML = `
      <div class="wrap">
        <a class="lab-logo" href="${ROOT}" data-logo aria-label="Animesh Kherwar's Lab — home">
          <span class="lab-logo-mark">AK</span>
          <span class="lab-logo-text">Animesh Kherwar's Lab<small>/ experiments</small></span>
        </a>
        <nav class="lab-nav">
          <button class="chip-btn" data-mute aria-label="Toggle sound"></button>
          <button class="chip-btn" data-passport>Passport <span class="count" data-ach-count>0</span></button>
        </nav>
      </div>`;
    const muteBtn = slot.querySelector("[data-mute]");
    const paintMute = () => { muteBtn.textContent = store.get("muted", false) ? "🔇" : "🔊"; };
    paintMute();
    muteBtn.addEventListener("click", () => { store.set("muted", !store.get("muted", false)); paintMute(); sound("click"); });
    slot.querySelector("[data-passport]").addEventListener("click", openPassport);

    // Secret: 7 logo clicks
    const logo = slot.querySelector("[data-logo]");
    let taps = 0, tapTimer;
    logo.addEventListener("click", e => {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { taps = 0; }, 1500);
      if (taps < 7 && EXP_ID === null) e.preventDefault(); // on home, don't reload while tapping
      if (taps >= 2 && taps < 7) logo.querySelector(".lab-logo-mark").style.transform = `rotate(${taps * 51}deg)`;
      if (taps >= 7) {
        e.preventDefault();
        taps = 0;
        logo.querySelector(".lab-logo-mark").style.transform = "";
        unlock("logo-tapper");
      }
    });
    updateBadge();
  }
  function updateBadge() {
    const el = document.querySelector("[data-ach-count]");
    if (el) el.textContent = Object.keys(unlocked()).length;
  }

  /* ---------- Passport ---------- */
  function openPassport() {
    sound("pop");
    const got = unlocked();
    const v = visited();
    const seen = EXPS.filter(e => v[e.id]).length;
    const gotN = ACHS.filter(a => got[a.id]).length;
    const pct = Math.round((gotN / Math.max(ACHS.length, 1)) * 100);
    const back = document.createElement("div");
    back.className = "modal-backdrop";
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Laboratory Passport">
        <div class="modal-head">
          <div><span class="eyebrow"><span class="dot"></span>Laboratory passport</span><h2>Visitor record</h2></div>
          <button class="icon-btn" data-close aria-label="Close">✕</button>
        </div>
        <div class="pp-stats">
          <div class="pp-stat"><b>${seen}/${EXPS.length}</b><small>Experiments</small></div>
          <div class="pp-stat"><b>${gotN}/${ACHS.length}</b><small>Achievements</small></div>
          <div class="pp-stat"><b>${store.get("button.count", 0)}</b><small>Button presses</small></div>
        </div>
        <div class="pp-bar"><i style="width:${pct}%"></i></div>
        <div class="ach-list">
          ${ACHS.map(a => {
            const has = !!got[a.id];
            const hide = a.secret && !has;
            return `<div class="ach ${has ? "got" : "locked"}">
              <div class="a-icon">${hide ? "🔒" : a.icon}</div>
              <div><strong>${hide ? "Classified" : esc(a.title)}</strong><span>${hide ? "This achievement is a secret." : esc(a.desc)}</span></div>
            </div>`;
          }).join("")}
        </div>
        <button class="pp-reset" data-reset>Wipe all Lab data from this browser</button>
      </div>`;
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = e => { if (e.key === "Escape") close(); };
    back.addEventListener("click", e => { if (e.target === back || e.target.closest("[data-close]")) close(); });
    back.querySelector("[data-reset]").addEventListener("click", () => {
      if (confirm("Erase every achievement, score and button press from this browser?")) { store.clearAll(); location.reload(); }
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(back);
  }

  /* ---------- Experiment hero + pager ---------- */
  const current = EXP_ID ? EXPS.find(e => e.id === EXP_ID) || null : null;
  function renderExperimentChrome() {
    if (!current) return;
    document.documentElement.style.setProperty("--exp", current.accent);
    document.title = `${current.title} — Animesh Kherwar's Lab`;
    const hero = document.querySelector("[data-lab-hero]");
    if (hero) {
      hero.className = "exp-hero wrap";
      hero.innerHTML = `
        <a class="exp-back" href="${ROOT}">← All experiments</a>
        <p class="exp-kicker">Experiment ${esc(current.id)}${current.device === "desktop" ? " · Desktop only" : ""}</p>
        <h1>${esc(current.title)}</h1>
        <p>${esc(current.tagline)}</p>`;
    }
    const pager = document.querySelector("[data-lab-pager]");
    if (pager) {
      const i = EXPS.indexOf(current);
      const prev = EXPS[(i - 1 + EXPS.length) % EXPS.length];
      const next = EXPS[(i + 1) % EXPS.length];
      pager.className = "exp-pager wrap";
      pager.innerHTML = `
        <a href="${expUrl(prev)}"><small>← Previous · ${prev.id}</small><strong>${prev.icon} ${esc(prev.title)}</strong></a>
        <a class="next" href="${expUrl(next)}"><small>Next · ${next.id} →</small><strong>${esc(next.title)} ${next.icon}</strong></a>`;
    }
    markVisit(current.id);
  }

  /* ---------- Home grid ---------- */
  function renderHome() {
    const grid = document.querySelector("[data-lab-grid]");
    if (!grid) return;
    const v = visited();
    grid.innerHTML = EXPS.map((e, i) => `
      <a class="card reveal" href="${expUrl(e)}" style="--c:${e.accent}; animation-delay:${i * 60}ms">
        <div class="card-top">
          <span class="card-icon">${e.icon}</span>
          ${v[e.id] ? `<span class="badge seen">Visited</span>` : `<span class="badge new">New</span>`}
        </div>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.blurb)}</p>
        <div class="card-foot">
          <span>EXP ${esc(e.id)}${e.device === "desktop" ? " · 🖥 Desktop" : ""}</span>
          <span class="go">Launch ↗</span>
        </div>
      </a>`).join("") + `
      <div class="card locked reveal" style="--c:#888; animation-delay:${EXPS.length * 60}ms">
        <div class="card-icon" style="margin:0 auto">🔒</div>
        <h3>Experiment ${String(EXPS.length + 1).padStart(3, "0")}</h3>
        <p>Currently under construction. Or containment.</p>
      </div>`;
    grid.addEventListener("pointermove", e => {
      const card = e.target.closest(".card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
    const count = document.querySelector("[data-exp-count]");
    if (count) count.textContent = EXPS.length;
    const dodgy = document.querySelector("[data-dodgy-count]");
    if (dodgy) dodgy.textContent = Math.max(1, Math.round(EXPS.length / 4));
    const achCount = document.querySelector("[data-ach-total]");
    if (achCount) achCount.textContent = ACHS.length;
    setTimeout(() => unlock("welcome"), 900);
  }

  /* ---------- Konami ---------- */
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kIdx = 0;
  document.addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kIdx === KONAMI.length) {
      kIdx = 0;
      document.body.classList.add("shake");
      setTimeout(() => document.body.classList.remove("shake"), 600);
      unlock("konami");
    }
  });

  /* ---------- Public API ---------- */
  window.LAB = { store, unlock, toast, sound, isTouch, rand, pick, sleep, esc, experiment: current, experiments: EXPS, root: ROOT };

  renderHeader();
  renderExperimentChrome();
  renderHome();

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
