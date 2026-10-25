/* Experiment 007 — Laboratory OS */
(function () {
  "use strict";
  const { store, unlock, sound, sleep, esc, experiments, root, isTouch } = window.LAB;

  const os = document.getElementById("os");
  const desk = document.getElementById("desk");
  const tasks = document.getElementById("tasks");
  const startBtn = document.getElementById("start");
  const startMenu = document.getElementById("startmenu");
  const crash = document.getElementById("crash");
  const boot = document.getElementById("boot");
  const bootTime = Date.now();

  const ICONS = [
    { id: "experiments", g: "🧪", label: "Experiments" },
    { id: "notes", g: "📄", label: "Notes.txt" },
    { id: "important", g: "📁", label: "Definitely Important" },
    { id: "terminal", g: "💻", label: "Terminal" },
    { id: "about", g: "ℹ️", label: "About This Lab" },
    { id: "trash", g: "🗑️", label: "Trash" },
    { id: "donotopen", g: "⛔", label: "DO NOT OPEN" }
  ];

  /* ---------- Desktop icons ---------- */
  desk.innerHTML = ICONS.map(i => `<div class="ico" data-id="${i.id}" tabindex="0"><div class="g">${i.g}</div><span>${i.label}</span></div>`).join("");
  desk.addEventListener("click", e => {
    const ico = e.target.closest(".ico");
    desk.querySelectorAll(".ico").forEach(x => x.classList.toggle("sel", x === ico));
    if (ico && isTouch) open(ico.dataset.id);
  });
  desk.addEventListener("dblclick", e => { const ico = e.target.closest(".ico"); if (ico) open(ico.dataset.id); });
  desk.addEventListener("keydown", e => { const ico = e.target.closest(".ico"); if (ico && e.key === "Enter") open(ico.dataset.id); });

  /* ---------- Window manager ---------- */
  const wins = new Map();
  let z = 20, offset = 0;

  function createWin(id, title, html, { w = 420, h = 320 } = {}) {
    if (wins.has(id)) { const ex = wins.get(id); ex.el.classList.remove("min"); focus(id); return ex; }
    const bounds = os.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "win";
    const ww = Math.min(w, bounds.width - 20), hh = Math.min(h, bounds.height - 80);
    offset = (offset + 28) % 140;
    el.style.width = ww + "px"; el.style.height = hh + "px";
    el.style.left = Math.max(8, (bounds.width - ww) / 2 - 70 + offset) + "px";
    el.style.top = Math.max(8, (bounds.height - 52 - hh) / 2 - 40 + offset) + "px";
    el.innerHTML = `
      <div class="wbar">
        <div class="dots"><button class="c" aria-label="Close"></button><button class="m" aria-label="Minimise"></button><button class="x" aria-label="Maximise"></button></div>
        <div class="wtitle">${esc(title)}</div>
      </div>
      <div class="wbody">${html}</div>`;
    os.appendChild(el);
    const task = document.createElement("button");
    task.className = "task";
    task.textContent = title;
    tasks.appendChild(task);
    const rec = { id, el, task, body: el.querySelector(".wbody") };
    wins.set(id, rec);

    el.addEventListener("pointerdown", () => focus(id));
    el.querySelector(".c").addEventListener("click", e => { e.stopPropagation(); close(id); });
    el.querySelector(".m").addEventListener("click", e => { e.stopPropagation(); el.classList.add("min"); task.classList.remove("active"); });
    el.querySelector(".x").addEventListener("click", e => { e.stopPropagation(); el.classList.toggle("max"); });
    el.querySelector(".wbar").addEventListener("dblclick", () => el.classList.toggle("max"));
    task.addEventListener("click", () => {
      if (el.classList.contains("min")) { el.classList.remove("min"); focus(id); }
      else if (task.classList.contains("active")) { el.classList.add("min"); task.classList.remove("active"); }
      else focus(id);
    });
    makeDraggable(el);
    focus(id);
    sound("pop");
    return rec;
  }
  function focus(id) {
    wins.forEach(w => { w.el.classList.remove("focus"); w.task.classList.remove("active"); });
    const w = wins.get(id);
    if (!w) return;
    w.el.style.zIndex = ++z;
    w.el.classList.add("focus"); w.task.classList.add("active");
  }
  function close(id) {
    const w = wins.get(id);
    if (!w) return;
    w.el.remove(); w.task.remove(); wins.delete(id);
  }
  function closeAll() { [...wins.keys()].forEach(close); }

  function makeDraggable(el) {
    const bar = el.querySelector(".wbar");
    let sx, sy, ox, oy, dragging = false;
    bar.addEventListener("pointerdown", e => {
      if (e.target.closest("button") || el.classList.contains("max") || os.clientWidth <= 700) return;
      dragging = true; sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop;
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", e => {
      if (!dragging) return;
      const maxL = os.clientWidth - 80, maxT = os.clientHeight - 52 - 40;
      el.style.left = Math.min(maxL, Math.max(-el.offsetWidth + 80, ox + e.clientX - sx)) + "px";
      el.style.top = Math.min(maxT, Math.max(0, oy + e.clientY - sy)) + "px";
    });
    bar.addEventListener("pointerup", () => { dragging = false; });
  }

  /* ---------- Apps ---------- */
  const APPS = {
    experiments() {
      createWin("experiments", "Experiments", `<div class="row-list">${experiments.map(e =>
        `<a class="row" href="${root}experiments/${e.slug}/"><span class="g">${e.icon}</span><span><b>${esc(e.title)}</b><br><small class="muted">EXP ${e.id}</small></span></a>`).join("")}</div>`,
        { w: 380, h: 420 });
    },
    notes() {
      const w = createWin("notes", "Notes.txt — saved automatically", `<textarea spellcheck="false" placeholder="Type something. It stays in this browser."></textarea>`, { w: 420, h: 300 });
      const ta = w.body.querySelector("textarea");
      ta.value = store.get("os.notes", "TODO:\n- be productive\n- (see above)\n");
      ta.addEventListener("input", () => store.set("os.notes", ta.value));
    },
    about() {
      const up = Math.floor((Date.now() - bootTime) / 1000);
      createWin("about", "About This Lab", `
        <div class="about">
          <div style="font-size:40px">🧪</div>
          <div style="font-size:20px;font-weight:600;letter-spacing:-.02em">Laboratory OS</div>
          <div class="muted">Version 0.0.1 (Mostly Stable)</div>
          <dl>
            <dt>OWNER</dt><dd>Animesh Kherwar</dd>
            <dt>PROCESSOR</dt><dd>1× Brain, overclocked on chai</dd>
            <dt>MEMORY</dt><dd>Emotionally insufficient</dd>
            <dt>STORAGE</dt><dd>98% full of unopened tabs</dd>
            <dt>SESSION UPTIME</dt><dd>${up} seconds of uninterrupted procrastination</dd>
            <dt>WARRANTY</dt><dd>Expired before purchase</dd>
          </dl>
        </div>`, { w: 360, h: 440 });
    },
    trash() {
      const files = [
        ["📄", "my_motivation.docx", "File is empty. It was empty when it was deleted, too."],
        ["📊", "budget_FINAL_real.xlsx", "This file is corrupted. Much like the budget."],
        ["🗒️", "new_year_resolutions_2019-2026.txt", "Contents identical every year. Restoring would be pointless."],
        ["🖼️", "gym_membership.png", "Last opened: never."],
        ["🎵", "mixtape_draft.mp3", "Too powerful to restore. For everyone's safety."]
      ];
      const w = createWin("trash", "Trash", `<div class="row-list">${files.map((f, i) =>
        `<div class="row" data-i="${i}"><span class="g">${f[0]}</span><span>${f[1]}</span></div>`).join("")}</div><p class="muted" id="trashMsg" style="margin:14px 4px 0;min-height:22px"></p>`, { w: 400, h: 340 });
      w.body.addEventListener("click", e => {
        const r = e.target.closest(".row");
        if (r) { w.body.querySelector("#trashMsg").textContent = files[+r.dataset.i][2]; sound("error"); }
      });
    },
    important() {
      const LEVELS = [
        { name: "Definitely Important", next: "Very Important", file: ["📄", "readme.txt", "Read me? I'd rather not."] },
        { name: "Very Important", next: "Extremely Important", file: ["🔑", "passwords.txt", "Contents: ********. All of them. Every single one."] },
        { name: "Extremely Important", next: "Final", file: ["📊", "Q3_plan.pptx", "37 slides. 36 of them say 'TBD'."] },
        { name: "Final", next: "Final_v2", file: ["📝", "notes_old_DONT_USE.docx", "You used it."] },
        { name: "Final_v2", next: "FINAL_FINAL", file: ["🧾", "invoice(1)(1)(2).pdf", "Duplicate of a duplicate of a duplicate."] },
        { name: "FINAL_FINAL", next: "FINAL_FINAL_actually_final", file: ["🗂️", "backup_of_backup.zip", "0 bytes. Which explains a lot."] },
        { name: "FINAL_FINAL_actually_final", next: null, file: null }
      ];
      const w = createWin("important", "Definitely Important", "", { w: 440, h: 360 });
      let level = 0;
      function render() {
        const L = LEVELS[level];
        const path = LEVELS.slice(0, level + 1).map(x => x.name).join(" / ");
        w.el.querySelector(".wtitle").textContent = L.name;
        if (!L.next) {
          w.body.innerHTML = `<div class="crumbs">/ ${esc(path)}</div><div class="dlg"><div class="big">🕳️</div><p>There's nothing here.<br>There never was.</p><div class="btns"><button class="btn sm ghost" data-back>← Go back up</button></div></div>`;
          unlock("final-final");
        } else {
          w.body.innerHTML = `<div class="crumbs">/ ${esc(path)}</div><div class="row-list">
            ${level > 0 ? `<div class="row" data-back><span class="g">↩︎</span><span>..</span></div>` : ""}
            <div class="row" data-next><span class="g">📁</span><span>${esc(L.next)}</span></div>
            <div class="row" data-file><span class="g">${L.file[0]}</span><span>${esc(L.file[1])}</span></div>
          </div><p class="muted" data-msg style="margin:14px 4px 0;min-height:22px"></p>`;
        }
      }
      w.body.addEventListener("click", e => {
        if (e.target.closest("[data-next]")) { level++; sound("click"); render(); }
        else if (e.target.closest("[data-back]")) { level = Math.max(0, level - 1); render(); }
        else if (e.target.closest("[data-file]")) { w.body.querySelector("[data-msg]").textContent = LEVELS[level].file[2]; sound("error"); }
      });
      render();
    },
    terminal() {
      const w = createWin("terminal", "Terminal", `<div class="term"><div data-out>Laboratory OS shell. Type <b>help</b>.</div><div>animesh@lab:~$ <input data-in autocomplete="off" spellcheck="false" aria-label="Terminal input"></div></div>`, { w: 480, h: 320 });
      const outEl = w.body.querySelector("[data-out]");
      const inp = w.body.querySelector("[data-in]");
      const CMDS = {
        help: "Commands: help, whoami, ls, date, coffee, sudo, clear, exit",
        whoami: "A visitor. Possibly procrastinating. Definitely curious.",
        ls: "experiments/  notes.txt  definitely_important/  DO_NOT_OPEN/  regrets.log",
        date: () => new Date().toString(),
        coffee: "Brewing... Error 418: I'm a teapot.",
        exit: "There is no exit. Only other tabs."
      };
      w.el.addEventListener("click", () => inp.focus());
      inp.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        const raw = inp.value.trim(); inp.value = "";
        const cmd = raw.split(/\s+/)[0].toLowerCase();
        let res;
        if (!raw) return;
        if (cmd === "clear") { outEl.innerHTML = ""; return; }
        if (cmd === "sudo") res = raw.includes("rm") ? "Permission denied. Also, rude." : "You are not in the sudoers file. This incident will be reported to Animesh.";
        else if (cmd === "rm") res = "Nice try.";
        else if (CMDS[cmd]) res = typeof CMDS[cmd] === "function" ? CMDS[cmd]() : CMDS[cmd];
        else res = `${cmd}: command not found. Neither is motivation.`;
        outEl.innerHTML += `<div>animesh@lab:~$ ${esc(raw)}</div><div>${esc(res)}</div>`;
        w.body.scrollTop = w.body.scrollHeight;
      });
      setTimeout(() => inp.focus(), 50);
    },
    donotopen() {
      const steps = [
        ["⚠️", "This folder is labelled DO NOT OPEN.", "Open anyway"],
        ["🛑", "Are you sure? Like, actually sure?", "Yes, I'm sure"],
        ["☢️", "Final warning. The Lab cannot be held responsible for what happens next.", "I accept the consequences"]
      ];
      const w = createWin("donotopen", "DO NOT OPEN", "", { w: 380, h: 280 });
      let i = 0;
      function render() {
        const [g, t, b] = steps[i];
        w.body.innerHTML = `<div class="dlg"><div class="big">${g}</div><p>${t}</p><div class="btns"><button class="btn sm ghost" data-no>Never mind</button><button class="btn sm accent" data-yes>${b}</button></div></div>`;
      }
      w.body.addEventListener("click", e => {
        if (e.target.closest("[data-no]")) { close("donotopen"); return; }
        if (e.target.closest("[data-yes]")) {
          sound("error");
          i++;
          if (i < steps.length) render(); else doCrash();
        }
      });
      render();
    }
  };

  function open(id) {
    startMenu.classList.remove("show"); startBtn.classList.remove("on");
    if (wins.has(id)) { wins.get(id).el.classList.remove("min"); focus(id); return; }
    if (APPS[id]) APPS[id]();
  }

  /* ---------- System ---------- */
  async function doCrash() {
    closeAll();
    crash.classList.add("show");
    sound("thud");
    const pct = document.getElementById("crashPct");
    for (let p = 0; p <= 100; p += Math.floor(Math.random() * 9) + 3) { pct.textContent = Math.min(p, 100); await sleep(140); }
    pct.textContent = 100;
    await sleep(700);
    crash.classList.remove("show");
    unlock("do-not-open");
    await reboot();
  }
  async function reboot() {
    closeAll();
    boot.classList.add("show");
    await sleep(2200);
    boot.classList.remove("show");
  }
  function dialog(id, g, text) {
    const w = createWin(id, "Laboratory OS", `<div class="dlg"><div class="big">${g}</div><p>${text}</p><div class="btns"><button class="btn sm accent" data-ok>OK</button></div></div>`, { w: 360, h: 260 });
    w.body.querySelector("[data-ok]").addEventListener("click", () => close(id));
  }

  startBtn.addEventListener("click", e => { e.stopPropagation(); startMenu.classList.toggle("show"); startBtn.classList.toggle("on"); sound("click"); });
  startMenu.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.open) open(b.dataset.open);
    if (b.dataset.sys === "shutdown") { open(); dialog("shutdown", "⏻", "You can't shut down a website.<br>But I admire the ambition."); }
    if (b.dataset.sys === "restart") { open(); reboot(); }
  });
  os.addEventListener("click", e => { if (!e.target.closest("#startmenu") && !e.target.closest("#start")) { startMenu.classList.remove("show"); startBtn.classList.remove("on"); } });

  function tick() {
    const d = new Date();
    document.getElementById("clock").innerHTML =
      `${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<br><span class="d">${d.toLocaleDateString([], { day: "2-digit", month: "short" })}</span>`;
  }
  tick(); setInterval(tick, 15000);

  // Welcome window
  setTimeout(() => dialog("welcome", "👋", isTouch ? "Welcome to Laboratory OS.<br>Tap an icon to open it." : "Welcome to Laboratory OS.<br>Double-click an icon to open it. Windows can be dragged."), 400);
})();
