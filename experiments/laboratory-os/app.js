/* Experiment 007 — Laboratory OS 2.0
   A premium operating system. Nothing works properly. */
(function () {
  "use strict";

  /* =========================================================
     0. Engine bridge
     ========================================================= */
  const LAB = window.LAB || {};
  const esc = LAB.esc || (s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const sleep = LAB.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const experiments = LAB.experiments || [];
  const root = LAB.root || "../../";
  const isTouch = !!LAB.isTouch || window.matchMedia("(pointer: coarse)").matches;
  const sound = n => { try { if (LAB.sound) LAB.sound(n); } catch (e) { /* no sound is also a sound */ } };
  const unlock = id => { try { if (LAB.unlock) LAB.unlock(id); } catch (e) { /* ignore */ } };
  const store = LAB.store || {
    get: (k, f) => { const v = localStorage.getItem("lab." + k); return v === null ? f : v; },
    set: (k, v) => localStorage.setItem("lab." + k, v)
  };
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const $ = (s, r = document) => r.querySelector(s);

  /* =========================================================
     1. DOM
     ========================================================= */
  const os = $("#os"), desk = $("#desk"), tasks = $("#tasks"), startBtn = $("#start"), startMenu = $("#startmenu");
  const crash = $("#crash"), boot = $("#boot"), notesEl = $("#notes"), ctx = $("#ctx"), offEl = $("#off");
  const saver = $("#saver"), pet = $("#pet");
  const bootTime = Date.now();
  if (!os) return;

  /* =========================================================
     2. State (versioned, browser-only)
     ========================================================= */
  const KEY = "os2.state";
  const DEF = () => ({
    v: 2, disc: {}, flags: {}, seen: {}, fs: null, fsv: 0, trash: null, tot: [], mail: [], read: {}, replied: {},
    wall: 0, mode: "normal", motion: false, hidden: false, boring: false, pet: true, ver: 2.0,
    killed: {}, moves: 0, folders: 0, paints: 0, visits: 0, last: 0, reason: "", confidence: 50, walls: {}
  });
  let S;
  try {
    const raw = store.get(KEY, null);
    const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
    S = Object.assign(DEF(), parsed);
  } catch (e) { S = DEF(); }
  const save = () => { try { store.set(KEY, JSON.stringify(S)); } catch (e) { /* storage full of regrets */ } };

  /* =========================================================
     3. Event bus
     ========================================================= */
  const bus = {};
  function on(evt, fn) { (bus[evt] = bus[evt] || []).push(fn); return () => { bus[evt] = bus[evt].filter(f => f !== fn); }; }
  function emit(evt, data) { (bus[evt] || []).slice().forEach(f => { try { f(data); } catch (e) { console.error(e); } }); }

  /* =========================================================
     4. Comedy content
     ========================================================= */
  const GAGS = {
    refresh: ["Desktop refreshed. Your circumstances remain unchanged.", "Refreshed. The icons feel the same, but more aware.", "Refreshing… done. Icons have been mildly reassured.", "Nothing new. Have you tried living differently?", "Refreshed. Like a nap, but for pixels."],
    newfolder: ["Folder created. It is already disorganised.", "Another folder. Bold strategy.", "Folder created. It will eventually contain one file called 'misc'.", "Created. It's empty, like a calendar in December.", "A fresh folder. Full of potential. And nothing else."],
    appeal: ["Please. I have a family of subfiles.", "I was going to be useful next week.", "Fine. But I'm taking my metadata with me.", "Deleted? I prefer 'between folders'.", "You'll miss me when you need a template.", "I knew this day would come. I just didn't back up."],
    restore: ["We knew you'd come crawling back.", "Restored. It never doubted you. (It did.)", "File restored. It will be weird about this for a while.", "Welcome back. Nobody touched your stuff. Mostly."],
    ambient: ["Your free trial of free time has expired.", "Reminder: you have 0 meetings. Suspicious.", "Laboratory OS noticed you're doing well. Investigating.", "Background task 'worrying' completed successfully.", "The printer has entered a new mood.", "A file somewhere was named 'final'. Monitoring the situation.", "Tip: Nothing works properly. This is by design.", "Disk Cleanup found 3 GB of unfinished ideas.", "Your posture has been noted.", "chai.svc is running low. Morale may be affected.", "A window was moved. HR has been informed.", "System is idle. So, statistically, are you."],
    wifi: ["Connected to: Neighbour's Wi‑Fi (with permission, allegedly).", "Signal: excellent. Internet: fictional.", "Speed: 3 bars of hope.", "Network: 'Lab-5G'. It's 2.4 GHz. It lied."],
    battery: ["Battery: 100%. Emotional battery: 12%.", "Charging. Spiritually.", "Battery health: better than yours.", "Power source: chai."],
    volume: ["Volume adjusted. Nobody noticed.", "Sound is at a respectful level of 7.", "Muted? No. Merely quiet, with intent.", "Volume: perfectly balanced, as nothing should be."],
    maximise: ["Window maximised. Ambition noted.", "Bigger window, same problems.", "Full size. Main-character energy."],
    sort: ["Sorted by emotional importance. Nothing moved. Everything matters equally.", "Sorted by name. The icons are now alphabetically disappointed.", "Sorted by date. All icons claim to be the oldest."]
  };
  function gag(pool) {
    const list = GAGS[pool];
    const n = S.seen[pool] || 0;
    S.seen[pool] = n + 1; save();
    return list[n % list.length];
  }
  const chance = p => Math.random() < p * ({ quiet: .25, normal: 1, chaos: 1.6 }[S.mode] || 1);

  /* =========================================================
     5. Discoveries & ranks
     ========================================================= */
  const DISC = [
    ["hidden", "👻", "Shy folder", "Some folders only appear when asked properly."],
    ["divzero", "➗", "Divided by zero", "The calculator has one forbidden operation."],
    ["management", "📈", "Management mode", "The calculator has a second personality."],
    ["ram", "🧠", "Downloaded more RAM", "The Lab Browser has a shop."],
    ["forum", "💬", "Read the forum", "Somebody online is arguing about final files."],
    ["permit", "📋", "Bureaucracy, initiated", "Try printing anything."],
    ["stamp", "🔖", "Not a stamp", "Pictures. Properties. Patience."],
    ["permit-granted", "✅", "Permit P-404", "Support accepts certain numbers."],
    ["printed", "🖨️", "It printed", "Complete the printer's paperwork."],
    ["emptied", "🗑️", "Emptied the Trash", "Trash can be emptied. Probably."],
    ["tot", "🕳️", "Trash of Trash", "Where does emptied trash go?"],
    ["final-file", "🏁", "The actual final file", "The printed page knows where it sleeps."],
    ["dnd", "⚙️", "Deleted do_not_delete.sys", "A system file is practically asking for it."],
    ["crash", "☢️", "Opened DO NOT OPEN", "A folder on the desktop is clearly labelled."],
    ["excuses", "🙊", "Ended excuses.exe", "Task Manager lists more than apps."],
    ["committee", "🏛️", "The Committee", "End enough processes and they organise."],
    ["loadbearing", "☕", "Load-bearing chai", "Some services cannot be ended."],
    ["paralysis", "🌀", "Decision paralysis", "Open too many windows at once."],
    ["movers", "🚚", "Moving company invoice", "Move windows around. A lot."],
    ["shutdown", "⏻", "Shut down a website", "The Start menu has a power button."],
    ["corner", "📺", "Hit the corner", "Leave the computer alone for a while."],
    ["sudo", "🔐", "Not in the sudoers file", "Terminal. Ask with authority."],
    ["xyzzy", "🪄", "Nothing happens", "An ancient magic word for terminals."],
    ["sl", "🚂", "Choo choo", "Mistype a very common terminal command."],
    ["hack", "🕶️", "Hacker (denied)", "Ask the terminal to hack."],
    ["matrix", "🟩", "Entered the matrix", "Terminal. Follow the green."],
    ["duck", "🦆", "Duck whisperer", "Click the duck. Repeatedly."],
    ["sweeper", "💣", "Balanced the budget", "Win Budgetsweeper."],
    ["sweeper-lose", "💸", "Unexpected expense", "Lose Budgetsweeper."],
    ["update", "⬇️", "Fully updated", "Install the updates. Wait for them."],
    ["quarantine", "🛡️", "Self-quarantined", "Lab Defender found a threat. Quarantine it."],
    ["claimfinal", "📝", "Made a bold claim", "Rename something to 'final'."],
    ["folders", "📁", "Folder enthusiast", "Create five folders."],
    ["human", "🧑", "Asked for a human", "Support is very human-like."],
    ["survey", "📮", "Mandatory fun", "Reply to the survey email."],
    ["night", "🌙", "Night shift", "Visit between midnight and 5 AM."],
    ["return", "🔁", "Came back", "Return on another day."],
    ["shuffle", "🔀", "Same song", "Shuffle the music."],
    ["confidence", "💪", "Dangerously confident", "Settings has a useless slider."],
    ["landlord", "🏠", "Landlord approval pending", "Try every wallpaper."],
    ["404", "🌐", "Lost on the Lab Internet", "Visit a page that doesn't exist."],
    ["installer", "📦", "Installed setup(1).exe", "Downloads has an installer."],
    ["konami", "🎮", "Old cheat code", "↑ ↑ ↓ ↓ ← → ← → B A"],
    ["boring", "🧰", "Fixed everything", "Solve the mysteries, then ask the terminal to repair."]
  ];
  const RANKS = [[0, "Visitor"], [6, "Temporary Visitor"], [15, "Acting Temporary Visitor"], [28, "Administrator of Nothing"], [DISC.length, "Administrator of Slightly More Than Nothing"]];
  const found = () => Object.keys(S.disc).filter(k => DISC.some(d => d[0] === k)).length;
  function rank() {
    const n = found();
    let r = RANKS[0];
    RANKS.forEach(x => { if (n >= x[0]) r = x; });
    const nx = RANKS.find(x => x[0] > n);
    return { name: r[1], n, next: nx ? nx[0] - n : 0, nextName: nx ? nx[1] : null };
  }
  function discover(id) {
    if (S.disc[id]) return;
    const d = DISC.find(x => x[0] === id);
    if (!d) return;
    const before = rank().name;
    S.disc[id] = Date.now(); save();
    sound("win");
    notify(d[1], "Discovery: " + d[2], `${found()} of ${DISC.length} found.`);
    const after = rank().name;
    if (after !== before) setTimeout(() => notify("🎖️", "Promotion", `You are now: ${after}. Responsibilities: none.`, 6000), 900);
    emit("discover", id);
  }

  /* =========================================================
     6. Notifications
     ========================================================= */
  function notify(g, title, text, ms = 4200) {
    const n = document.createElement("div");
    n.className = "note";
    n.innerHTML = `<div class="g">${g}</div><div><b>${esc(title)}</b><small>${esc(text)}</small></div>`;
    notesEl.appendChild(n);
    n.addEventListener("click", () => n.remove());
    setTimeout(() => { n.classList.add("out"); setTimeout(() => n.remove(), 400); }, ms);
    while (notesEl.children.length > 3) notesEl.firstChild.remove();
  }

  /* =========================================================
     7. Virtual filesystem
     ========================================================= */
  const FSV = 1;
  const F = (n, g, x, p = {}) => Object.assign({ n, t: "f", g, x }, p);
  const D = (n, g, c, p = {}) => Object.assign({ n, t: "d", g, c }, p);
  function baseFS() {
    return D("Lab HD", "💽", [
      D("Desktop", "🖥️", [], { fixed: true }),
      D("Documents", "📁", [
        F("previous_admin_handover.txt", "📄", "HANDOVER NOTES\nFrom: The Previous Administrator\n\nWelcome. The computer is premium. It is elegant. Nothing works properly.\n\nThings I never figured out:\n1. The printer. It wants paperwork.\n2. Why Task Manager lists my feelings.\n3. What happens if you shut down a website.\n4. Whether Settings can show hidden things. (It can. I was scared.)\n5. Where emptied trash goes.\n\nTerminal tips: 'help' lies by omission. Try things.\n\nGood luck. I've been promoted to Administrator of Nothing."),
        F("final.docx", "📝", "This is the final version.\n\n(It was not.)"),
        F("final_v2.docx", "📝", "Supersedes final.docx.\nSuperseded by final_FINAL.docx.\n\nA document in the middle. Like a sandwich filling."),
        F("final_FINAL.docx", "📝", "This document is the final version until further notice.\n\nFURTHER NOTICE: People on the Lab Internet disagree. See lab://forum."),
        F("Q3_plan.pptx", "📊", "Slide 1: Q3 Plan\nSlides 2–37: TBD\n\nSpeaker notes: 'Be confident.'"),
        F("how_to_be_productive.pdf", "📕", "Chapter 1: Close this file.\n\nChapter 2: You are still here. See Chapter 1."),
        F("meeting_notes_2009.txt", "📄", "Attendees: Everyone\nDecisions: None\nAction items: Schedule a follow-up meeting\n\nFollow-up meeting: rescheduled. See Calendar. Forever."),
        F("passwords.txt", "🔑", "Contents redacted for your safety.\n\nHint for the hint: the password is on the sticky note.\nThe sticky note is in the bin.\nThe bin was emptied in 2017.")
      ], { fixed: true }),
      D("Pictures", "🖼️", [
        F("stamp.png", "🔖", "", { img: "🔖", cap: "An official-looking stamp. Officially, it is not a stamp.", stamp: true }),
        F("selfie_with_printer.jpg", "🤳", "", { img: "🖨️", cap: "Neither party is smiling." }),
        F("wallpaper_rejected.jpg", "🌄", "", { img: "🌄", cap: "Rejected by the Wallpaper Review Board for being 'too optimistic'." }),
        F("screenshot_of_screenshot.png", "📸", "", { img: "🖼️", cap: "A screenshot of a screenshot of this screenshot." })
      ], { fixed: true }),
      D("Music", "🎵", [
        F("elevator_music_extended.mp3", "🎵", "", { app: "music", track: 0 }),
        F("ringtone_from_2006.mp3", "🎵", "", { app: "music", track: 1 })
      ], { fixed: true }),
      D("Downloads", "⬇️", [
        F("setup(1).exe", "📦", "", { app: "installer" }),
        F("free_ram.zip", "🗜️", "", { zip: true }),
        F("invoice(1)(1)(2).pdf", "🧾", "Duplicate of a duplicate of a duplicate.\n\nAmount due: the same as last time."),
        F("definitely_not_a_virus.exe", "📦", "", { app: "antivirus" })
      ], { fixed: true }),
      D("System", "⚙️", [
        F("kernel.sys", "⚙️", "", { sys: true }),
        F("printer_driver.dll", "⚙️", "", { sys: true, size: "14.7 GB" }),
        F("do_not_delete.sys", "⚙️", "", { sys: true, dnd: true }),
        F("chai.svc", "☕", "", { sys: true })
      ], { fixed: true, sys: true }),
      D(".hidden", "👻", [
        F("secret.txt", "🤫", "The secret is that there is a hidden folder.\n\nYou found it. That was the secret.\n\nPlease act surprised."),
        F("admin_diary.txt", "📓", "Day 1: Installed printer.\nDay 2: Printer requested paperwork.\nDay 3: Paperwork requested a printer.\nDay 40: Promoted to Administrator of Nothing. First act: leave.\n\nP.S. To print anything, Support needs the stamp's certification number. Do not ask why. I asked why.")
      ], { fixed: true, hid: true })
    ], { fixed: true });
  }
  function baseTrash() {
    return [
      ["📄", "my_motivation.docx", "File is empty. It was empty when it was deleted, too."],
      ["📊", "budget_FINAL_real.xlsx", "This file is corrupted. Much like the budget."],
      ["🗒️", "new_year_resolutions_2019-2026.txt", "Contents identical every year. Restoring would be pointless."],
      ["🖼️", "gym_membership.png", "Last opened: never."],
      ["🎵", "mixtape_draft.mp3", "Too powerful to restore. For everyone's safety."]
    ].map(([g, n, note]) => ({ node: F(n, g, note), from: ["Documents"], note }));
  }
  let FS = (S.fs && S.fsv === FSV) ? S.fs : baseFS();
  S.fs = FS; S.fsv = FSV;
  if (!Array.isArray(S.trash)) S.trash = baseTrash();
  save();

  function nodeAt(path) {
    let n = FS;
    for (const p of path) { if (!n || !n.c) return null; n = n.c.find(x => x.n === p); }
    return n || null;
  }
  function fsChanged() { S.fs = FS; save(); emit("fs"); }
  function uniqueName(dir, name, self) {
    let n = name;
    while (dir.c.some(x => x.n === n && x !== self)) n += " (another one)";
    return n;
  }
  function visibleKids(dir) { return (dir.c || []).filter(x => !x.hid || S.hidden); }
  function flatten(dir = FS, path = []) {
    let out = [];
    visibleKids(dir).forEach(n => { out.push([path.concat(n.n), n]); if (n.t === "d") out = out.concat(flatten(n, path.concat(n.n))); });
    return out;
  }
  const TYPES = { txt: "Text document (unread)", docx: "Document, allegedly final", pdf: "PDF (portable, not readable)", pptx: "Presentation (37 slides, 36 TBD)", png: "Picture of something", jpg: "Picture of something else", mp3: "Audio (questionable)", exe: "Application (do you trust it?)", zip: "Compressed hopes", sys: "System file (load-bearing)", dll: "Library (no books)", svc: "Service (essential, emotionally)", xlsx: "Spreadsheet (haunted)" };
  const typeOf = n => n.t === "d" ? "Folder" : (TYPES[(n.n.split(".").pop() || "").toLowerCase()] || "File of unknown intentions");
  const CREATED = ["Before the invention of deadlines", "During a meeting", "3:47 AM, for reasons", "Last Tuesday (all of them)", "The day the printer worked", "Unknown. It just appeared."];
  const MODIFIED = ["Five minutes before the deadline", "By someone who isn't you", "Never, but it feels different", "Moments ago, by guilt"];
  const FOLDER_NAMES = ["New Folder", "New Folder (2)", "New Folder (3)", "Another Unresolved Issue", "Things I'll Sort Later", "Folder Mk. IV", "Untitled Ambition", "Misc (Final)", "Misc (Final) (2)"];

  /* =========================================================
     8. Window manager
     ========================================================= */
  const wins = new Map();
  let z = 20, offset = 0, dn = 0;
  const narrow = () => os.clientWidth <= 700;

  function createWin(id, title, html, opt = {}) {
    const { w = 440, h = 340, icon = "▫️", onClose = null, flush = false } = opt;
    if (wins.has(id)) { const ex = wins.get(id); ex.el.classList.remove("min"); focus(id); return ex; }
    hideCtx(); hideStart();
    const W = os.clientWidth, H = os.clientHeight;
    const el = document.createElement("div");
    el.className = "win";
    const ww = Math.min(w, W - 20), hh = Math.min(h, H - 72);
    offset = (offset + 26) % 130;
    el.style.width = ww + "px"; el.style.height = hh + "px";
    el.style.left = Math.max(8, (W - ww) / 2 - 60 + offset) + "px";
    el.style.top = Math.max(8, (H - 52 - hh) / 2 - 30 + offset * 0.6) + "px";
    el.innerHTML = `<div class="wbar"><div class="dots"><button class="c" aria-label="Close"></button><button class="m" aria-label="Minimise"></button><button class="x" aria-label="Maximise"></button></div><div class="wtitle"></div></div><div class="wbody${flush ? " flush" : ""}">${html}</div><div class="rsz" aria-hidden="true"></div>`;
    os.appendChild(el);
    const task = document.createElement("button");
    task.className = "task";
    tasks.appendChild(task);
    const rec = {
      id, el, task, title, body: el.querySelector(".wbody"), onClose, timers: [], subs: [],
      setTitle(t) { rec.title = t; el.querySelector(".wtitle").textContent = t; task.innerHTML = `<span class="ti">${icon}</span><span class="tt">${esc(t)}</span>`; },
      every(fn, ms) { rec.timers.push(setInterval(fn, ms)); },
      on(evt, fn) { rec.subs.push(on(evt, fn)); }
    };
    rec.setTitle(title);
    wins.set(id, rec);
    el.addEventListener("pointerdown", () => focus(id));
    el.querySelector(".c").addEventListener("click", e => { e.stopPropagation(); close(id); });
    el.querySelector(".m").addEventListener("click", e => { e.stopPropagation(); el.classList.add("min"); task.classList.remove("active"); });
    const maxi = () => { el.classList.toggle("max"); if (el.classList.contains("max") && chance(.25)) notify("⤢", "Maximised", gag("maximise")); };
    el.querySelector(".x").addEventListener("click", e => { e.stopPropagation(); maxi(); });
    el.querySelector(".wbar").addEventListener("dblclick", maxi);
    task.addEventListener("click", () => {
      if (el.classList.contains("min")) { el.classList.remove("min"); focus(id); }
      else if (task.classList.contains("active")) { el.classList.add("min"); task.classList.remove("active"); }
      else focus(id);
    });
    makeDraggable(el);
    makeResizable(el);
    focus(id);
    sound("pop");
    emit("winopen", rec);
    if ([...wins.keys()].filter(k => !/^(dlg|ask)/.test(k)).length >= 6) discover("paralysis");
    return rec;
  }
  function reuse(id) { if (!wins.has(id)) return false; wins.get(id).el.classList.remove("min"); focus(id); return true; }
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
    wins.delete(id);
    w.timers.forEach(clearInterval);
    w.subs.forEach(u => u());
    try { if (w.onClose) w.onClose(); } catch (e) { console.error(e); }
    w.el.remove(); w.task.remove();
    emit("winclose", w);
  }
  function closeAll() { [...wins.keys()].forEach(close); }
  function makeDraggable(el) {
    const bar = el.querySelector(".wbar");
    let sx, sy, ox, oy, dragging = false;
    bar.addEventListener("pointerdown", e => {
      if (e.target.closest("button") || el.classList.contains("max") || narrow()) return;
      dragging = true; sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop;
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", e => {
      if (!dragging) return;
      const maxL = os.clientWidth - 80, maxT = os.clientHeight - 52 - 40;
      el.style.left = Math.min(maxL, Math.max(-el.offsetWidth + 80, ox + e.clientX - sx)) + "px";
      el.style.top = Math.min(maxT, Math.max(0, oy + e.clientY - sy)) + "px";
    });
    bar.addEventListener("pointerup", e => {
      if (!dragging) return;
      dragging = false;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 30) {
        S.moves++; save();
        if (S.moves === 25) { deliver("movers"); discover("movers"); }
      }
    });
  }
  function makeResizable(el) {
    const h = el.querySelector(".rsz");
    let sx, sy, sw, sh, on2 = false;
    h.addEventListener("pointerdown", e => { if (narrow()) return; on2 = true; sx = e.clientX; sy = e.clientY; sw = el.offsetWidth; sh = el.offsetHeight; h.setPointerCapture(e.pointerId); e.stopPropagation(); });
    h.addEventListener("pointermove", e => {
      if (!on2) return;
      el.style.width = Math.max(260, Math.min(os.clientWidth - el.offsetLeft - 4, sw + e.clientX - sx)) + "px";
      el.style.height = Math.max(160, Math.min(os.clientHeight - 52 - el.offsetTop - 4, sh + e.clientY - sy)) + "px";
    });
    h.addEventListener("pointerup", () => { on2 = false; });
  }

  /* ---------- Dialogs ---------- */
  function dialog(g, html, buttons = ["OK"], title = "Laboratory OS") {
    return new Promise(res => {
      const id = "dlg" + (++dn);
      let done = false;
      const w = createWin(id, title, `<div class="dlg"><div class="big">${g}</div><p>${html}</p><div class="btns">${buttons.map((b, i) => `<button class="btn sm ${i === buttons.length - 1 ? "accent" : "ghost"}" data-i="${i}">${esc(b)}</button>`).join("")}</div></div>`,
        { w: 380, h: 300, icon: g, onClose: () => { if (!done) { done = true; res(-1); } } });
      w.el.classList.add("modal");
      w.body.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; done = true; res(+b.dataset.i); close(id); });
    });
  }
  function askText(title, label, value = "") {
    return new Promise(res => {
      const id = "ask" + (++dn);
      let done = false;
      const w = createWin(id, title, `<form class="ask"><label>${esc(label)}</label><input value="${esc(value)}" maxlength="60" spellcheck="false" autocomplete="off"><div class="btns"><button type="button" class="btn sm ghost" data-x>Cancel</button><button class="btn sm accent">OK</button></div></form>`,
        { w: 360, h: 220, icon: "✏️", onClose: () => { if (!done) { done = true; res(null); } } });
      w.el.classList.add("modal");
      const inp = w.body.querySelector("input");
      setTimeout(() => { inp.focus(); inp.select(); }, 60);
      w.body.querySelector("form").addEventListener("submit", e => { e.preventDefault(); done = true; res(inp.value.trim()); close(id); });
      w.body.querySelector("[data-x]").addEventListener("click", () => close(id));
    });
  }

  /* ---------- Context menu & long-press ---------- */
  function showCtx(x, y, items) {
    ctx.innerHTML = items.map((it, i) => it === "-" ? `<div class="sm-sep"></div>` : `<button class="sm-item" data-i="${i}">${it[0]}</button>`).join("");
    ctx.classList.add("show");
    const r = os.getBoundingClientRect();
    const lx = Math.min(x - r.left, r.width - ctx.offsetWidth - 6);
    const ly = Math.min(y - r.top, r.height - 52 - ctx.offsetHeight - 6);
    ctx.style.left = Math.max(6, lx) + "px"; ctx.style.top = Math.max(6, ly) + "px";
    ctx.onclick = e => { const b = e.target.closest("[data-i]"); if (!b) return; hideCtx(); items[+b.dataset.i][1](); };
  }
  function hideCtx() { ctx.classList.remove("show"); }
  function onMenu(el, cb) {
    let t = null, sx = 0, sy = 0;
    el.addEventListener("contextmenu", e => { e.preventDefault(); if (Date.now() - (el._lp || 0) < 900) return; cb(e.target, e.clientX, e.clientY); });
    el.addEventListener("pointerdown", e => {
      if (e.pointerType !== "touch") return;
      sx = e.clientX; sy = e.clientY; const tg = e.target;
      clearTimeout(t);
      t = setTimeout(() => { t = null; el._lp = Date.now(); cb(tg, sx, sy); }, 520);
    });
    const cancel = () => { clearTimeout(t); t = null; };
    el.addEventListener("pointermove", e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
    el.addEventListener("pointerup", cancel);
    el.addEventListener("pointercancel", cancel);
  }
  const justLongPressed = el => Date.now() - (el._lp || 0) < 700;

  /* =========================================================
     9. File operations
     ========================================================= */
  let sysWarned = false;
  function openNode(path, node) {
    node = node || nodeAt(path);
    if (!node) return dialog("❓", "That file has wandered off.", ["OK"]);
    if (node.t === "d") return open("explorer", path);
    if (node.sys) return sysFile(node);
    if (node.app) return open(node.app, node);
    if (node.img) return viewImage(path, node);
    if (node.zip) return unzip(node);
    return viewDoc(node);
  }
  function viewDoc(node) {
    if (reuse("doc:" + node.n)) return;
    const body = esc(node.x || "This file is empty. Like a promise.").replace(/\n/g, "<br>");
    const w = createWin("doc:" + node.n, node.n, `<div class="doc-tools"><button class="tb" data-edit>✏️ Edit</button><button class="tb" data-print>🖨️ Print</button><button class="tb" data-share>📤 Share</button></div><article class="paper">${body}</article>`, { w: 520, h: 460, icon: node.g });
    w.body.addEventListener("click", e => {
      if (e.target.closest("[data-edit]")) dialog("✏️", "Editing requires <b>Laboratory Office Premium</b>.<br>Your free trial ended in 1998.", ["Understood"]);
      if (e.target.closest("[data-print]")) open("printer");
      if (e.target.closest("[data-share]")) notify("📤", "Shared", "Shared with: nobody. Privacy settings: excellent.");
    });
    if (node.final) {
      discover("final-file"); unlock("final-final");
      setTimeout(() => notify("🏁", "The actual final file", "Mystery solved. The terminal may now 'sudo repair' the computer. Should you?", 7000), 1500);
    }
  }
  function viewImage(path, node) {
    if (reuse("img:" + node.n)) return;
    const w = createWin("img:" + node.n, node.n, `<div class="imgv"><div class="pic">${node.img}</div><p class="muted">${esc(node.cap || "")}</p><div class="btns"><button class="tb" data-wall>Set as wallpaper</button><button class="tb" data-props>Properties</button></div></div>`, { w: 420, h: 420, icon: node.g });
    w.body.addEventListener("click", e => {
      if (e.target.closest("[data-wall]")) dialog("🖼️", "Wallpaper rejected.<br>Reason: insufficient gradient.", ["Fair enough"]);
      if (e.target.closest("[data-props]")) fsProps(path, node);
    });
  }
  function sysFile(node) {
    const lines = {
      "kernel.sys": "01001110 01001111<br><span class='muted'>(That spells NO.)</span>",
      "printer_driver.dll": "14.7 GB of instructions.<br>All of them say: <i>'Be difficult.'</i>",
      "do_not_delete.sys": "This file is fine.<br>Please don't delete it. Seriously. It's in the name.",
      "chai.svc": "Service status: <b>Running</b><br>Dependencies: Everything."
    };
    dialog(node.g, `Opening system files voids your warranty.<br>Your warranty was already void, so:<br><br>${lines[node.n] || "Nothing to see here."}`, ["Close carefully"], node.n);
  }
  async function unzip(node) {
    if (reuse("zip")) return;
    const w = createWin("zip", "Extracting " + node.n, `<p>Extracting <b>${esc(node.n)}</b>…</p><div class="bar"><i></i></div><p class="muted" data-m>Decompressing hopes…</p>`, { w: 380, h: 230, icon: "🗜️" });
    const bar = w.body.querySelector(".bar i"), m = w.body.querySelector("[data-m]");
    const steps = ["Decompressing hopes…", "Inflating expectations…", "Found 1 file…", "Reading file…"];
    for (let i = 0; i <= 100; i += 4) { if (!wins.has("zip")) return; bar.style.width = i + "%"; m.textContent = steps[Math.min(3, Math.floor(i / 26))]; await sleep(60); }
    m.innerHTML = "Extracted 1 file: <b>ram.txt</b> — <i>'Not like this.'</i>";
  }
  function fsProps(path, node) {
    if (reuse("props:" + path.join("/"))) return;
    const dir = node.t === "d";
    const size = node.size || (dir ? `${(node.c || []).length} items, 0 bytes of purpose` : `${(node.x || "").length || 12} bytes, mostly vowels`);
    const rows = [
      ["Name", esc(node.n)], ["Type", esc(typeOf(node))], ["Location", esc("Lab HD/" + path.slice(0, -1).join("/"))],
      ["Size", esc(size)], ["Created", CREATED[hash(node.n) % CREATED.length]], ["Modified", MODIFIED[hash(node.n + "m") % MODIFIED.length]],
      ["Attributes", node.sys ? "Read-only, load-bearing, smug" : node.hid ? "Hidden, shy" : "Normal (allegedly)"]
    ];
    if (node.stamp) rows.push(["Certification", `<span class="hl">CERT-7741</span><br><small class="muted">Not a stamp. Certified.</small>`]);
    createWin("props:" + path.join("/"), node.n + " — Properties", `<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px"><div style="font-size:40px">${node.g}</div><b>${esc(node.n)}</b></div><dl class="props">${rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join("")}</dl>`, { w: 400, h: 400, icon: "ℹ️" });
    if (node.stamp) { S.flags.cert = true; save(); discover("stamp"); }
  }
  async function fsNew(path) {
    const dir = nodeAt(path);
    if (!dir || dir.t !== "d") return;
    if (dir.sys) return dialog("⛔", "You cannot create folders in System.<br>System is full of opinions.", ["Fair"]);
    const name = uniqueName(dir, FOLDER_NAMES[S.folders] || `New Folder (${S.folders + 1})`);
    dir.c.push(D(name, "📁", []));
    S.folders++;
    if (S.folders >= 5) discover("folders");
    fsChanged(); sound("pop");
    if (chance(.7)) notify("📁", name, gag("newfolder"));
  }
  async function fsRename(path, node) {
    if (node.sys || node.fixed) return dialog("🎓", "This item cannot be renamed.<br>It has tenure.", ["Respect"]);
    const nn = await askText("Rename", "New name", node.n);
    if (!nn || nn === node.n) return;
    if (/[/\\]/.test(nn)) return dialog("⚠️", "Slashes are not allowed.<br>Folders get confused about who they belong to.", ["OK"]);
    if (/final/i.test(nn)) {
      const r = await dialog("⚖️", `Renaming to <b>${esc(nn)}</b>.<br>Are you legally prepared to make that claim?`, ["No", "Yes, it's final"]);
      if (r !== 1) return;
      discover("claimfinal");
    }
    const dir = nodeAt(path.slice(0, -1));
    if (!dir) return;
    node.n = uniqueName(dir, nn, node);
    fsChanged();
  }
  async function fsDelete(path, node) {
    if (node.dnd) {
      const r = await dialog("⚙️", "Delete <b>do_not_delete.sys</b>?<br>The name is fairly clear about this.", ["Cancel", "Delete"]);
      if (r === 1) {
        discover("dnd");
        doCrash({ msg: "Laboratory OS ran into a problem because you deleted a file called <b>do_not_delete.sys</b>. We restored it. We always restore it.", code: "DO_NOT_DELETE_WAS_DELETED", failed: "do_not_delete.sys (temporarily)", reason: "You deleted do_not_delete.sys" });
      }
      return;
    }
    if (node.sys) return dialog("🏗️", "Access denied.<br>This file is load-bearing.", ["Step away slowly"]);
    if (node.fixed) return dialog("🙅", `Deleting <b>${esc(node.n)}</b> would make everything else awkward.`, ["Fine"]);
    const dir = nodeAt(path.slice(0, -1));
    if (!dir) return;
    dir.c = dir.c.filter(x => x !== node);
    const note = gag("appeal");
    S.trash.push({ node, from: path.slice(0, -1), note });
    fsChanged(); sound("thud");
    notify("🗑️", node.n + " → Trash", `"${note}"`);
  }
  function fileMenu(path, node, x, y) {
    showCtx(x, y, [
      ["📂 Open", () => openNode(path, node)],
      ["✏️ Rename", () => fsRename(path, node)],
      ["🗑️ Delete", () => fsDelete(path, node)],
      "-",
      ["ℹ️ Properties", () => fsProps(path, node)]
    ]);
  }

  /* =========================================================
     10. Mail
     ========================================================= */
  const MAILS = {
    welcome: { from: "The Previous Administrator", subj: "Handover (please read) (nobody reads these)", body: "Welcome to your new computer.<br><br>It's premium. It's elegant. Nothing works properly.<br><br>My notes are in <b>Documents › previous_admin_handover.txt</b>. Good luck with the printer.<br><br>— Previous Admin" },
    survey: { from: "Mandatory Fun Committee", subj: "Mandatory Fun Survey (2 minutes, 40 questions)", body: "Question 1 of 40:<br><b>How fun is Laboratory OS?</b><br><br>Please answer honestly. Honest answers will be rounded up.", replies: [["Very fun", "survey2"], ["Extremely fun", "survey2"], ["I decline", "survey2"]] },
    survey2: { from: "Mandatory Fun Committee", subj: "Re: Mandatory Fun Survey", body: "Thank you. Your answer has been recorded as <b>'Very fun'</b>, regardless of what you clicked.<br><br>Questions 2–40 have been cancelled due to fun." },
    password: { from: "IT Security", subj: "Your password expires in 3 seconds", body: "Your password has now expired.<br><br>Please choose a new password that you have never used, will never forget, and cannot remember.<br><br>It must contain: one uppercase letter, one lowercase letter, one number, one hieroglyph, and a small regret." },
    newsletter: { from: "Printer Weekly", subj: "Issue #412: Is your printer judging you? (Yes.)", body: "This week:<br>• Printer refuses to comment on allegations<br>• 'Paper jam' — a memoir<br>• Ink: liquid gold, or just expensive gold?<br><br>Unsubscribe: not available in your region (any region)." },
    permit: { from: "Department of Printing", subj: "Form P-404: Printing Permit Application", body: "Thank you for attempting to print.<br><br>Printing requires a permit. To obtain one, present the <b>certification number of an official stamp</b> to <b>Support</b>.<br><br>Official stamps are kept in <b>Pictures</b>. Do not use them. Simply look at their <b>properties</b>.<br><br>Regards,<br>Department of Printing (est. before paper)", attach: { n: "Form_P-404.pdf", g: "📋", x: "FORM P-404\nPRINTING PERMIT APPLICATION\n\nSection A: Name\nSection B: Reason for printing\nSection C: Certification number of an official stamp\n\nSubmit to Support. Do not print this form. You can't." } },
    granted: { from: "Department of Printing", subj: "Permit P-404 approved", body: "Your printing permit has been approved.<br><br>You may now print <b>exactly one page</b>.<br>Choose wisely. Or don't. The printer will decide anyway." },
    page: { from: "LaserJudge 9000", subj: "About your page", body: "You printed a page. Congratulations.<br><br>Did you look at the back of it? Most people don't look at the back of things." },
    excuses: { from: "Human Resources", subj: "Where did the Excuses Department go?", body: "Someone ended <b>excuses.exe</b>. Productivity rose 400%.<br><br>This is unacceptable. The department has been reinstated (it restarted itself)." },
    committee: { from: "The Committee of Ended Processes", subj: "Notice of formation", body: "We, the processes you ended, have formed a committee.<br><br>Motion 1: to be restarted. <i>Carried.</i><br>Motion 2: snacks. <i>Carried unanimously.</i><br>Motion 3: to forgive you. <i>Tabled indefinitely.</i>" },
    movers: { from: "Lab Moving Co.", subj: "Invoice: 25 window relocations", body: "Thank you for choosing Lab Moving Co.<br><br>Windows relocated: 25<br>Windows damaged: 0<br>Windows emotionally unsettled: all<br><br>Amount due: ₹0.00 + emotional damages." },
    update: { from: "Laboratory OS", subj: "Update installed successfully", body: "Changes in this update:<br><br>• None.<br><br>That was the update." },
    ret: { from: "Laboratory OS", subj: "Welcome back", body: "While you were away, nothing was done.<br><br>Exactly as you left it." },
    ending: { from: "Laboratory OS", subj: "Everything works now", body: "Congratulations. Laboratory OS now works properly.<br><br>It is unbearable.<br><br>You can turn <b>Boring mode</b> off in Settings. We recommend it. Strongly. Please." }
  };
  if (!S.mail.length) { const t = Date.now(); ["welcome", "survey", "password", "newsletter"].forEach((id, i) => S.mail.push({ id, t: t - (4 - i) * 3600e3 })); save(); }
  const unread = () => S.mail.filter(m => !S.read[m.id]).length;
  function deliver(id) {
    if (!MAILS[id] || S.mail.some(m => m.id === id)) return;
    S.mail.push({ id, t: Date.now() }); save();
    notify("✉️", MAILS[id].from, MAILS[id].subj, 5000);
    emit("mail"); renderDesk();
  }
  function ago(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    return Math.floor(s / 86400) + " d ago";
  }

  /* =========================================================
     11. System events: crash, reboot, shutdown
     ========================================================= */
  const BOOT_LINES = ["Loading premium experience…", "Calibrating disappointment…", "Polishing icons that don't work…", "Starting printer (it refused)…", "Mounting Documents/final_FINAL…", "Warming up chai.svc…", "Checking for updates (ignoring them)…", "Applying glassmorphism…", "Reticulating excuses…", "Locating common_sense.sys…"];
  async function doCrash(o = {}) {
    closeAll(); hideCtx(); hideStart();
    $("#crashMsg").innerHTML = o.msg || "Laboratory OS ran into a problem because you opened a folder labelled <b>DO NOT OPEN</b>. We're collecting some error info, and then we'll judge you.";
    $("#crashCode").textContent = o.code || "USER_IGNORED_EXPLICIT_INSTRUCTIONS";
    $("#crashFail").textContent = o.failed || "common_sense.sys";
    crash.classList.add("show"); sound("thud");
    const pct = $("#crashPct");
    for (let p = 0; p <= 100; p += rand(3, 11)) { pct.textContent = Math.min(p, 100); await sleep(130); }
    pct.textContent = 100;
    await sleep(700);
    crash.classList.remove("show");
    await reboot(o.reason || "Crash");
  }
  async function reboot(reason) {
    closeAll(); hideCtx(); hideStart();
    const lines = $("#bootLines");
    boot.classList.add("show");
    const msgs = BOOT_LINES.slice().sort(() => Math.random() - .5).slice(0, 4);
    for (const m of msgs) { lines.textContent = m; await sleep(S.motion ? 250 : 480); }
    boot.classList.remove("show");
    if (reason) { S.reason = reason; save(); notify("🔁", "Restarted", `Reason for last restart: ${reason}.`); }
  }
  function shutdown() { closeAll(); hideStart(); offEl.classList.add("show"); sound("thud"); }
  $("#wake").addEventListener("click", async () => {
    offEl.classList.remove("show");
    await reboot("Shut down a website. Came back.");
    discover("shutdown");
    notify("🫡", "You came back", "They always come back.");
  });

  /* =========================================================
     12. Apps
     ========================================================= */
  const APPS = {};
  const PLACES = [["💽", "Lab HD", []], ["🖥️", "Desktop", ["Desktop"]], ["📁", "Documents", ["Documents"]], ["🖼️", "Pictures", ["Pictures"]], ["🎵", "Music", ["Music"]], ["⬇️", "Downloads", ["Downloads"]], ["⚙️", "System", ["System"]]];
  const XP_STATUS = ["Free space: emotionally limited", "Sorted by: vibes", "Last backup: never", "Indexed: partially, reluctantly", "Sync status: out of sync, in spirit", "Cloud: overcast"];

  /* ---------- Files ---------- */
  APPS.explorer = {
    g: "🗂️", name: "Files", multi: true,
    run(path) {
      const ex = wins.get("explorer");
      if (ex) { ex.nav(path || ex.cur); return; }
      const w = createWin("explorer", "Files", `<div class="xp">
        <aside class="xp-side row-list">${PLACES.map((p, i) => `<div class="row" data-place="${i}"><span class="g">${p[0]}</span><span>${p[1]}</span></div>`).join("")}<div class="row" data-trash><span class="g">🗑️</span><span>Trash</span></div></aside>
        <div class="xp-main">
          <div class="xp-bar"><button class="ib" data-up aria-label="Up">↑</button><div class="crumbs" data-crumbs></div><input class="xp-q" data-q placeholder="Search" aria-label="Search files"></div>
          <div class="xp-tools"><button class="tb" data-act="new">＋ Folder</button><button class="tb" data-act="open">Open</button><button class="tb" data-act="ren">Rename</button><button class="tb" data-act="del">Delete</button><button class="tb" data-act="props">Properties</button></div>
          <div class="row-list xp-list" data-list></div>
          <div class="xp-status" data-status></div>
        </div></div>`, { w: 640, h: 440, icon: "🗂️", flush: true });
      const list = w.body.querySelector("[data-list]"), crumbs = w.body.querySelector("[data-crumbs]"), status = w.body.querySelector("[data-status]"), qIn = w.body.querySelector("[data-q]");
      let items = [], sel = -1, q = "";
      w.cur = [];
      w.nav = async p => {
        const n = nodeAt(p);
        if (!n || n.t !== "d") return;
        if (n.sys && !sysWarned) {
          sysWarned = true;
          const r = await dialog("⚙️", "You are entering the <b>System</b> folder.<br>Please wipe your feet.", ["Go back", "Enter"]);
          if (r !== 1) return;
        }
        if (n.hid) discover("hidden");
        w.cur = p; sel = -1; q = ""; qIn.value = "";
        w.el.classList.remove("min"); focus("explorer");
        render();
      };
      function render() {
        if (q) {
          items = flatten().filter(([, n]) => n.n.toLowerCase().includes(q.toLowerCase()));
          crumbs.textContent = `Search: "${q}"`;
        } else {
          const dir = nodeAt(w.cur) || FS;
          items = visibleKids(dir).map(n => [w.cur.concat(n.n), n]);
          crumbs.textContent = "Lab HD" + (w.cur.length ? " › " + w.cur.join(" › ") : "");
        }
        w.setTitle(q ? "Search" : (w.cur[w.cur.length - 1] || "Lab HD"));
        list.innerHTML = items.length ? items.map(([p, n], i) => `<div class="row${i === sel ? " on" : ""}" data-i="${i}"><span class="g">${n.g}</span><span>${esc(n.n)}<br><small>${esc(q ? "Lab HD/" + p.slice(0, -1).join("/") : typeOf(n))}</small></span></div>`).join("")
          : `<div class="empty">${q ? `No results for "${esc(q)}".<br>It's not here. It's not anywhere. Have you checked the Trash?` : "This folder is empty.<br>Like a fridge at 2 AM."}</div>`;
        status.textContent = `${items.length} item${items.length === 1 ? "" : "s"} · ${XP_STATUS[(w.cur.length + items.length) % XP_STATUS.length]}`;
      }
      const selected = () => items[sel];
      const act = a => {
        if (a === "new") { if (q) return; return fsNew(w.cur); }
        const it = selected();
        if (!it) return notify("👆", "Nothing selected", "Select a file first. The computer can't read minds. Yet.");
        if (a === "open") openItem(it);
        if (a === "ren") fsRename(it[0], it[1]);
        if (a === "del") fsDelete(it[0], it[1]);
        if (a === "props") fsProps(it[0], it[1]);
      };
      const openItem = ([p, n]) => n.t === "d" ? w.nav(p) : openNode(p, n);
      w.body.addEventListener("click", e => {
        if (justLongPressed(list)) return;
        const pl = e.target.closest("[data-place]");
        if (pl) return w.nav(PLACES[+pl.dataset.place][2]);
        if (e.target.closest("[data-trash]")) return open("trash");
        if (e.target.closest("[data-up]")) return w.nav(w.cur.slice(0, -1));
        const a = e.target.closest("[data-act]");
        if (a) return act(a.dataset.act);
        const r = e.target.closest(".xp-list .row");
        if (r) {
          const i = +r.dataset.i;
          if (isTouch && i === sel) return openItem(items[i]);
          sel = i; render();
        }
      });
      list.addEventListener("dblclick", e => { const r = e.target.closest(".row"); if (r) openItem(items[+r.dataset.i]); });
      onMenu(list, (tg, x, y) => {
        const r = tg.closest(".row");
        if (r) { sel = +r.dataset.i; render(); const it = items[sel]; fileMenu(it[0], it[1], x, y); }
        else showCtx(x, y, [["📁 New folder", () => fsNew(w.cur)], ["🔄 Refresh", () => { render(); notify("🔄", "Refreshed", gag("refresh")); }]]);
      });
      qIn.addEventListener("input", () => { q = qIn.value.trim(); sel = -1; render(); });
      w.on("fs", render);
      w.nav(path || []);
    }
  };

  /* ---------- Notes ---------- */
  APPS.notes = {
    g: "📄", name: "Notes.txt",
    run() {
      const w = createWin("notes", "Notes.txt — saved automatically", `<textarea spellcheck="false" placeholder="Type something. It stays in this browser."></textarea>`, { w: 440, h: 320, icon: "📄" });
      const ta = w.body.querySelector("textarea");
      ta.value = store.get("os.notes", "TODO:\n- be productive\n- (see above)\n");
      let t = null;
      ta.addEventListener("input", () => {
        store.set("os.notes", ta.value);
        clearTimeout(t);
        t = setTimeout(() => { if (wins.has("notes")) w.setTitle(pick(["Notes.txt — saved automatically", "Notes.txt — saved, and judged", "Notes.txt — saved (we read it)", "Notes.txt — saved. Bold choice of words."])); }, 1500);
      });
    }
  };

  /* ---------- About ---------- */
  APPS.about = {
    g: "ℹ️", name: "About This Lab",
    run() {
      const up = Math.floor((Date.now() - bootTime) / 1000);
      createWin("about", "About This Lab", `<div class="about"><div style="font-size:40px">🧪</div>
        <div style="font-size:20px;font-weight:600;letter-spacing:-.02em">Laboratory OS</div>
        <div class="muted">Version ${S.ver.toFixed(1)} (Mostly Stable)</div>
        <dl><dt>OWNER</dt><dd>Animesh Kherwar</dd>
        <dt>CURRENT USER</dt><dd>${esc(rank().name)}</dd>
        <dt>PROCESSOR</dt><dd>1× Brain, overclocked on chai</dd>
        <dt>MEMORY</dt><dd>Emotionally insufficient</dd>
        <dt>STORAGE</dt><dd>98% full of unopened tabs</dd>
        <dt>GRAPHICS</dt><dd>Premium glass. Shatters under criticism.</dd>
        <dt>SESSION UPTIME</dt><dd>${up} seconds of uninterrupted procrastination</dd>
        <dt>DISCOVERIES</dt><dd>${found()} of ${DISC.length}</dd>
        <dt>WARRANTY</dt><dd>Expired before purchase</dd></dl></div>`, { w: 380, h: 480, icon: "ℹ️" });
    }
  };

  /* ---------- Experiments ---------- */
  APPS.experiments = {
    g: "🧪", name: "Experiments",
    run() {
      createWin("experiments", "Experiments", `<div class="row-list">${experiments.map(e => `<a class="row" href="${root}experiments/${e.slug}/" style="color:inherit;text-decoration:none"><span class="g">${e.icon}</span><span><b>${esc(e.title)}</b><br><small class="muted">EXP ${e.id}</small></span></a>`).join("") || `<div class="empty">No experiments found. Suspicious.</div>`}</div>`, { w: 380, h: 440, icon: "🧪" });
    }
  };

  /* ---------- Trash ---------- */
  APPS.trash = {
    g: "🗑️", name: "Trash",
    run() {
      const w = createWin("trash", "Trash", `<div class="xp-tools" style="padding:0 0 10px"><button class="tb" data-restore>↩︎ Restore</button><button class="tb" data-empty>🔥 Empty Trash</button></div><div class="row-list" data-list></div><p class="muted" data-msg style="margin:14px 4px 0;min-height:22px"></p>`, { w: 440, h: 380, icon: "🗑️" });
      const list = w.body.querySelector("[data-list]"), msg = w.body.querySelector("[data-msg]");
      let sel = -1, deep = false;
      function render() {
        if (deep) {
          w.setTitle("Trash › Trash of Trash");
          const tot = S.tot.slice();
          if (S.flags.printed) tot.push({ node: F("actually_final.docx", "🏁", "RESIGNATION LETTER\n\nTo whom it may concern,\n\nI, the Concept of Finality, hereby resign.\n\nNo file has ever truly been final. Every 'final' was followed by a 'final_v2'. Every 'FINAL' by an 'actually_final'. I can no longer continue under these conditions.\n\nThis letter is final.\n\n(Draft 2)", { final: true }), note: "It was sleeping here all along." });
          list.innerHTML = `<div class="row" data-up><span class="g">↩︎</span><span>..</span></div>` + (tot.length ? tot.map((t, i) => `<div class="row" data-t="${i}"><span class="g">${t.node.g}</span><span>${esc(t.node.n)}</span></div>`).join("") : `<div class="empty">Empty. Even the trash of trash has standards.</div>`);
          w._tot = tot;
          w.body.querySelector(".xp-tools").style.display = "none";
          return;
        }
        w.setTitle("Trash");
        w.body.querySelector(".xp-tools").style.display = "";
        list.innerHTML = (S.flags.emptied ? `<div class="row" data-deep><span class="g">🕳️</span><span>Trash of Trash</span></div>` : "") +
          (S.trash.length ? S.trash.map((t, i) => `<div class="row${i === sel ? " on" : ""}" data-i="${i}"><span class="g">${t.node.g}</span><span>${esc(t.node.n)}</span></div>`).join("") : `<div class="empty">Trash is empty.<br>Cleaner than it has any right to be.</div>`);
      }
      w.body.addEventListener("click", async e => {
        if (e.target.closest("[data-deep]")) { deep = true; discover("tot"); msg.textContent = "These files were deleted from Trash. Their spirits remain."; return render(); }
        if (e.target.closest("[data-up]")) { deep = false; msg.textContent = ""; return render(); }
        const t = e.target.closest("[data-t]");
        if (t) { const it = w._tot[+t.dataset.t]; if (it.node.final) return viewDoc(it.node); msg.textContent = it.note; sound("error"); return; }
        const r = e.target.closest("[data-i]");
        if (r) { sel = +r.dataset.i; msg.textContent = `"${S.trash[sel].note}"`; sound("error"); return render(); }
        if (e.target.closest("[data-restore]")) {
          const it = S.trash[sel];
          if (!it) return (msg.textContent = "Select something to restore. Restoring nothing is called therapy.");
          const dir = nodeAt(it.from) || nodeAt(["Documents"]);
          it.node.n = uniqueName(dir, it.node.n);
          dir.c.push(it.node);
          S.trash.splice(sel, 1); sel = -1;
          msg.textContent = gag("restore");
          fsChanged(); render();
        }
        if (e.target.closest("[data-empty]")) {
          if (!S.trash.length) return (msg.textContent = "It's already empty. Ambitious, though.");
          const ok = await dialog("🔥", `Permanently delete ${S.trash.length} item${S.trash.length > 1 ? "s" : ""}?<br>'Permanently' is a strong word. We'll see.`, ["Cancel", "Empty Trash"]);
          if (ok !== 1) return;
          S.tot = S.tot.concat(S.trash.map(t => ({ node: t.node, note: "Deleted twice. Still here. Haunting politely." })));
          S.trash = []; S.flags.emptied = true; sel = -1; save();
          sound("thud"); discover("emptied");
          msg.textContent = "Trash emptied. Probably.";
          render();
        }
      });
      w.on("fs", render);
      render();
    }
  };

  /* ---------- Definitely Important (original gag, preserved) ---------- */
  APPS.important = {
    g: "📁", name: "Definitely Important",
    run() {
      const LEVELS = [
        { name: "Definitely Important", next: "Very Important", file: ["📄", "readme.txt", "Read me? I'd rather not."] },
        { name: "Very Important", next: "Extremely Important", file: ["🔑", "passwords.txt", "Contents: ********. All of them. Every single one."] },
        { name: "Extremely Important", next: "Final", file: ["📊", "Q3_plan.pptx", "37 slides. 36 of them say 'TBD'."] },
        { name: "Final", next: "Final_v2", file: ["📝", "notes_old_DONT_USE.docx", "You used it."] },
        { name: "Final_v2", next: "FINAL_FINAL", file: ["🧾", "invoice(1)(1)(2).pdf", "Duplicate of a duplicate of a duplicate."] },
        { name: "FINAL_FINAL", next: "FINAL_FINAL_actually_final", file: ["🗂️", "backup_of_backup.zip", "0 bytes. Which explains a lot."] },
        { name: "FINAL_FINAL_actually_final", next: null, file: null }
      ];
      const w = createWin("important", "Definitely Important", "", { w: 440, h: 360, icon: "📁" });
      let level = 0;
      function render() {
        const L = LEVELS[level];
        const path = LEVELS.slice(0, level + 1).map(x => x.name).join(" / ");
        w.setTitle(L.name);
        if (!L.next) {
          w.body.innerHTML = `<div class="crumbs">/ ${esc(path)}</div><div class="dlg"><div class="big">🕳️</div><p>There's nothing here.<br>There never was.<br><small class="muted">(The forum on the Lab Internet disagrees.)</small></p><div class="btns"><button class="btn sm ghost" data-back>← Go back up</button></div></div>`;
          unlock("final-final");
        } else {
          w.body.innerHTML = `<div class="crumbs" style="margin-bottom:10px">/ ${esc(path)}</div><div class="row-list">
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
    }
  };

  /* ---------- DO NOT OPEN (original gag, preserved) ---------- */
  APPS.donotopen = {
    g: "⛔", name: "DO NOT OPEN",
    run() {
      const steps = [
        ["⚠️", "This folder is labelled DO NOT OPEN.", "Open anyway"],
        ["🛑", "Are you sure? Like, actually sure?", "Yes, I'm sure"],
        ["☢️", "Final warning. The Lab cannot be held responsible for what happens next.", "I accept the consequences"]
      ];
      const w = createWin("donotopen", "DO NOT OPEN", "", { w: 380, h: 290, icon: "⛔" });
      let i = 0;
      function render() {
        const [g, t, b] = steps[i];
        w.body.innerHTML = `<div class="dlg"><div class="big">${g}</div><p>${t}</p><div class="btns"><button class="btn sm ghost" data-no>Never mind</button><button class="btn sm accent" data-yes>${b}</button></div></div>`;
      }
      w.body.addEventListener("click", async e => {
        if (e.target.closest("[data-no]")) { close("donotopen"); return; }
        if (e.target.closest("[data-yes]")) {
          sound("error"); i++;
          if (i < steps.length) render();
          else { await doCrash({ reason: "You opened DO NOT OPEN" }); unlock("do-not-open"); discover("crash"); }
        }
      });
      render();
    }
  };

  /* ---------- Mail ---------- */
  APPS.mail = {
    g: "✉️", name: "Mail",
    run() {
      const w = createWin("mail", "Mail", `<div class="mail"><div class="mail-list" data-list></div><div class="mail-view" data-view><div class="empty">Select a message.<br>Or don't. It's your inbox.</div></div></div>`, { w: 700, h: 460, icon: "✉️", flush: true });
      const box = w.body.querySelector(".mail"), list = w.body.querySelector("[data-list]"), view = w.body.querySelector("[data-view]");
      let cur = null;
      function render() {
        list.innerHTML = S.mail.slice().reverse().map(m => { const M = MAILS[m.id]; if (!M) return ""; return `<div class="mrow${S.read[m.id] ? "" : " unread"}${cur === m.id ? " on" : ""}" data-id="${m.id}"><b>${esc(M.from)}</b><span>${esc(M.subj)}</span><small>${ago(m.t)}</small></div>`; }).join("");
        w.setTitle(unread() ? `Mail (${unread()} unread)` : "Mail");
      }
      function show(id) {
        cur = id; S.read[id] = 1; save(); renderDesk();
        const M = MAILS[id];
        const rep = M.replies && !S.replied[id] ? `<div class="btns" style="justify-content:flex-start">${M.replies.map((r, i) => `<button class="btn sm ghost" data-r="${i}">↩︎ ${esc(r[0])}</button>`).join("")}</div>` : "";
        view.innerHTML = `<button class="tb back" data-back>← Inbox</button><h3>${esc(M.subj)}</h3><div class="mfrom">From: ${esc(M.from)} · To: you, unfortunately</div><div class="mbody">${M.body}</div>${rep}${M.attach ? `<button class="att" data-att>📎 ${esc(M.attach.n)}</button>` : ""}`;
        box.classList.add("reading");
        render();
      }
      w.body.addEventListener("click", e => {
        const r = e.target.closest(".mrow");
        if (r) return show(r.dataset.id);
        if (e.target.closest("[data-back]")) { box.classList.remove("reading"); return; }
        if (e.target.closest("[data-att]")) return viewDoc(MAILS[cur].attach);
        const rp = e.target.closest("[data-r]");
        if (rp) {
          const M = MAILS[cur];
          S.replied[cur] = 1; save();
          notify("📨", "Reply sent", `You replied "${M.replies[+rp.dataset.r][0]}". It has been read by nobody.`);
          if (cur === "survey") discover("survey");
          const follow = M.replies[+rp.dataset.r][1];
          show(cur);
          if (follow) setTimeout(() => deliver(follow), 2500);
        }
      });
      w.on("mail", render);
      render();
    }
  };

  /* ---------- Lab Browser ---------- */
  function pageFor(u) {
    const head = t => `<h1>${t}</h1>`;
    if (/^https?:\/\//i.test(u) || /\.(com|org|net|in|np|io)(\/|$)/i.test(u))
      return { t: "No connection", h: `${head("🔌 The real internet is too real")}<p>Lab Browser only connects to the Laboratory Internet. It is smaller, safer, and entirely made up.</p><p><span data-href="lab://home">Go to Lab Home</span></p>` };
    if (!/^lab:\/\//i.test(u)) return pageFor("lab://search?q=" + encodeURIComponent(u));
    const path = u.slice(6).toLowerCase();
    if (path === "home" || path === "") return { t: "Searchly", h: `<div style="text-align:center;padding-top:30px"><h1 style="font-size:40px">Searchly</h1><p style="color:#6e6e73">Finding things you didn't look for since 2003.</p><form class="sbox" data-sf><input name="q" placeholder="Search the Lab Internet" autocomplete="off"><button>Search</button></form><div class="tiles"><span data-href="lab://forum">💬 Forum</span><span data-href="lab://shop">🛒 Shop</span><span data-href="lab://wiki/printer">📚 Wiki</span><span data-href="lab://news">📰 News</span></div></div>` };
    if (path.startsWith("search")) {
      const q = decodeURIComponent((u.split("q=")[1] || "").replace(/\+/g, " ")).trim() || "nothing";
      const qq = esc(q);
      const lower = q.toLowerCase();
      const res = [
        [`${qq} — explained by someone equally confused`, "lab://forum"],
        [`Is ${qq} normal? (Forum thread, 2011, unanswered)`, "lab://forum"],
        [`Buy ${qq} — out of stock since you looked`, "lab://shop"],
        [`${qq} — Lab Wiki <i>(this article needs citations)</i>`, "lab://wiki/printer"],
        [`Top 10 ${qq}s. Number 7 is also ${qq}.`, "lab://news"]
      ];
      if (/final/.test(lower)) res.unshift(["Which file is final? (HOT thread, 4,000 replies)", "lab://forum"]);
      if (/print/.test(lower)) res.unshift(["LaserJudge 9000 — Lab Wiki", "lab://wiki/printer"]);
      if (/hack|password|instagram/.test(lower)) res.unshift(["Why you shouldn't — Lab Ethics Department", "lab://news"]);
      return { t: q + " — Searchly", h: `<form class="sbox" data-sf style="margin:0 0 6px"><input name="q" value="${qq}" autocomplete="off"><button>Search</button></form><p style="color:#6e6e73;font-size:13px">About ${res.length} results (0.0003 seconds of effort). Did you mean: <span data-href="lab://search?q=something+more+productive">something more productive</span>?</p>${res.map(r => `<div class="sr"><small>${r[1]}</small><span data-href="${r[1]}">${r[0]}</span></div>`).join("")}` };
    }
    if (path === "forum") {
      discover("forum");
      const posts = [["final_boss_99", "Which file is final? I have final, final_v2 and final_FINAL."], ["tab_hoarder", "Obviously final_FINAL. Capital letters are legally binding."], ["printer_fan", "Have you tried printing it? Oh wait. You need a permit. Lol."], ["previous_admin", "None of them. The actual final file was deleted. Then the Trash was emptied. It went where tired trash goes. I never got the printer to tell me where that is."], ["ModBot", "Thread locked. Reason: nobody was ever going to agree."]];
      return { t: "Forum — Which file is final?", h: `${head("💬 Which file is final?")}<p style="color:#6e6e73">Lab Forums › Existential › Files · 4,000 replies · 🔒 Locked</p>${posts.map(p => `<div class="post"><b>@${p[0]}</b><br>${p[1]}</div>`).join("")}` };
    }
    if (path === "shop") return { t: "Lab Shop", h: `${head("🛒 Lab Shop")}<p style="color:#6e6e73">Everything you need. Nothing you want.</p>
      <div class="prod"><div><b>Download More RAM</b><br><small>Free. Totally legitimate.</small><div class="bar" data-rambar style="display:none"><i></i></div></div><button data-ram>Download</button></div>
      <div class="prod"><div><b>Premium Silence</b><br><small>Sold out. Everyone wanted some.</small></div><button disabled>Sold out</button></div>
      <div class="prod"><div><b>Extended Warranty for your Warranty</b><br><small>Covers nothing, twice.</small></div><button data-buy>₹999</button></div>
      <div class="prod"><div><b>Printer Ink (1 ml)</b><br><small>More expensive than the printer.</small></div><button data-buy>₹∞</button></div>` };
    if (path === "wiki/printer") return { t: "LaserJudge 9000 — Lab Wiki", h: `${head("LaserJudge 9000")}<p style="color:#6e6e73">From Lab Wiki, the free encyclopaedia that anyone can edit (nobody does)</p><p>The <b>LaserJudge 9000</b> is a premium printer known for its refusal to print. It was installed by the Previous Administrator, who later described the experience as "bureaucratic".</p><h3>Printing</h3><p>The printer requires <b>Form P-404</b>. Permits are issued by <b>Support</b> upon presentation of a valid <b>stamp certification number</b>. The certification number can be found in an image's <i>properties</i>, which nobody ever checks.</p><h3>Trivia</h3><p>Every printed page has a back. Most people never look at it.<sup>[citation needed]</sup></p>` };
    if (path === "news") return { t: "Lab News", h: `${head("📰 Lab News")}${["Local man closes 47 tabs, immediately opens 48", "Printer refuses to comment on allegations", "Study: 9 out of 10 'final' files are not final", "Experts confirm: the cloud is just someone else's computer, and it's tired", "Lab Ethics Department reminds everyone: other people's accounts are other people's", "Area user discovers Trash can be emptied; Trash disagrees"].map(h => `<div class="post">${h}</div>`).join("")}` };
    discover("404");
    return { t: "404", h: `${head("404 — Page not found")}<p><code>${esc(u)}</code> could not be found.</p><p>It may have been moved, deleted, or never existed, which is honestly the most relatable option.</p><p><span data-href="lab://home">Go home</span></p>` };
  }
  APPS.browser = {
    g: "🌐", name: "Lab Browser", multi: true,
    run(arg) {
      const ex = wins.get("browser");
      const start = typeof arg === "string" ? arg : "lab://home";
      if (ex) { ex.go(start); return; }
      const w = createWin("browser", "Lab Browser", `<div class="br"><div class="br-bar"><button class="ib" data-back aria-label="Back">←</button><button class="ib" data-home aria-label="Home">⌂</button><form data-f><input data-url spellcheck="false" autocomplete="off" aria-label="Address"></form></div><div class="br-page" data-page></div></div>`, { w: 720, h: 500, icon: "🌐", flush: true });
      const page = w.body.querySelector("[data-page]"), urlIn = w.body.querySelector("[data-url]");
      const hist = [];
      w.go = (u, push = true) => {
        u = String(u).trim(); if (!u) return;
        const p = pageFor(u);
        if (push) hist.push(u);
        urlIn.value = u; page.innerHTML = p.h; page.scrollTop = 0; w.setTitle(p.t);
        w.el.classList.remove("min"); focus("browser");
      };
      w.body.querySelector("[data-f]").addEventListener("submit", e => { e.preventDefault(); w.go(urlIn.value); urlIn.blur(); });
      w.body.addEventListener("submit", e => {
        const f = e.target.closest("[data-sf]");
        if (!f) return;
        e.preventDefault();
        w.go("lab://search?q=" + encodeURIComponent(f.querySelector("input").value));
      });
      w.body.addEventListener("click", async e => {
        if (e.target.closest("[data-back]")) { if (hist.length > 1) { hist.pop(); w.go(hist[hist.length - 1], false); } else notify("←", "Back", "There is no going back. Only forward. Mostly sideways."); return; }
        if (e.target.closest("[data-home]")) return w.go("lab://home");
        const l = e.target.closest("[data-href]");
        if (l) return w.go(l.dataset.href);
        if (e.target.closest("[data-buy]")) return dialog("💳", "Payment failed.<br>Reason: this shop doesn't exist.<br>Your card is safe. Your dignity is fine.", ["Phew"]);
        const ram = e.target.closest("[data-ram]");
        if (ram) {
          ram.disabled = true;
          const bar = page.querySelector("[data-rambar]");
          bar.style.display = "block";
          const i = bar.querySelector("i");
          for (let p = 0; p <= 99; p += 3) { i.style.width = p + "%"; ram.textContent = p + "%"; await sleep(70); }
          ram.textContent = "99%"; await sleep(1600);
          i.style.width = "100%"; ram.textContent = "Done";
          discover("ram");
          dialog("🧠", "RAM downloaded successfully.<br>Your storage is now full of RAM.<br>Performance has not changed.", ["Incredible"]);
        }
      });
      w.go(start);
    }
  };

  /* ---------- Printers ---------- */
  APPS.printer = {
    g: "🖨️", name: "Printers",
    run() {
      const w = createWin("printer", "Printers & Scanners", `<div class="card printer-hero"><div class="pg">🖨️</div><div><b>LaserJudge 9000</b><br><span class="muted" data-status></span></div></div>
        <div class="btns" style="justify-content:flex-start"><button class="tb" data-a="print">🖨️ Print test page</button><button class="tb" data-a="queue">📋 Queue</button><button class="tb" data-a="fix">🛠️ Troubleshoot</button><button class="tb" data-a="ink">💧 Order ink</button></div>
        <div data-out style="margin-top:14px"></div>`, { w: 460, h: 500, icon: "🖨️" });
      const out = w.body.querySelector("[data-out]"), st = w.body.querySelector("[data-status]");
      const status = () => { st.textContent = S.flags.printed ? "Status: Retired (emotionally)" : S.flags.granted ? "Status: Ready. Reluctantly." : "Status: Ready (emotionally unavailable)"; };
      status();
      let busy = false;
      w.body.addEventListener("click", async e => {
        const a = e.target.closest("[data-a]");
        if (e.target.closest("[data-flip]")) {
          out.innerHTML = `<div class="page-out" style="animation:none;font-style:italic">Handwritten, on the back:<br><br>"Trash goes somewhere when it is tired.<br>The final file sleeps there."<br><br>— P.A.</div>`;
          return;
        }
        if (!a || busy) return;
        sound("click");
        if (a.dataset.a === "print") {
          busy = true;
          if (S.flags.printed) { out.innerHTML = `<div class="card">You have printed your one page.<br>Further printing requires <b>Form P-405</b>, which has not been invented.</div>`; busy = false; return; }
          for (const m of ["Spooling…", "Warming up…", "Judging…", "Considering…"]) { out.innerHTML = `<div class="card">${m}</div>`; await sleep(650); }
          if (!S.flags.granted) {
            out.innerHTML = `<div class="card"><b>Error 404-P:</b> Printing permit not found.<br><span class="muted">A form has been mailed to you. The printer is proud of this.</span></div>`;
            sound("error");
            if (!S.flags.asked) { S.flags.asked = true; save(); discover("permit"); setTimeout(() => deliver("permit"), 1200); }
          } else {
            S.flags.printed = true; save();
            out.innerHTML = `<div class="page-out">This page intentionally contains a page.</div><div class="btns"><button class="tb" data-flip>🔄 Flip the page</button></div>`;
            sound("win"); discover("printed"); setTimeout(() => deliver("page"), 4000);
          }
          status(); busy = false;
        }
        if (a.dataset.a === "queue") out.innerHTML = `<div class="row-list">${[["resume_2014.docx", "Paused since 2014"], ["photo.jpg", "Waiting for magenta"], ["Q3_plan.pptx", "Printing slide 1 of 37 (TBD)"], ["test_page", "Blocked by printer's feelings"]].map(j => `<div class="row"><span class="g">📄</span><span>${j[0]}<br><small>${j[1]}</small></span></div>`).join("")}</div>`;
        if (a.dataset.a === "ink") out.innerHTML = `<div class="card">💧 Ink costs more than the printer.<br>The printer costs more than the ink.<br><span class="muted">We are investigating this loop.</span></div>`;
        if (a.dataset.a === "fix") {
          const steps = [["Is the printer turned on?", ["Yes", "No"]], ["Have you tried asking nicely?", ["Yes", "It's a printer"]], ["Is the printer happy?", ["How would I know", "Yes"]]];
          for (const [q, opts] of steps) {
            const r = await dialog("🛠️", q, opts, "Printer Troubleshooter");
            if (r < 0) return;
          }
          dialog("🔍", "Troubleshooting complete.<br><br><b>Problem identified:</b> printer.<br><b>Recommended fix:</b> paperwork.", ["Thanks, I guess"], "Printer Troubleshooter");
        }
      });
    }
  };

  /* ---------- Support ---------- */
  function hintLine() {
    const f = S.flags;
    if (!f.asked) return "Try printing something. Anything. The printer has opinions.";
    if (!f.cert) return "The Department of Printing mailed you. Then look at the stamp in Pictures. Its properties, not the picture.";
    if (!f.granted) return "Tell me the certification number. Exactly as written.";
    if (!f.printed) return "Go print. You have one page. Don't waste it on a test. (It will be a test.)";
    if (!f.emptied) return "The printed page talks about where tired trash goes. Empty your Trash.";
    if (!S.disc["final-file"]) return "Open the Trash again. Go deeper.";
    if (!S.disc.boring) return "All mysteries solved. If you want to 'fix' the computer, the Terminal knows: sudo repair.";
    return "You've done everything. Go outside? (Feature not supported.)";
  }
  APPS.support = {
    g: "🎧", name: "Support",
    run() {
      const w = createWin("support", "Support — Agent 004", `<div class="chat"><div class="chat-log" data-log></div><form><input class="fld" placeholder="Describe your problem (or type 'hint')" autocomplete="off"><button class="btn sm accent">Send</button></form></div>`, { w: 420, h: 480, icon: "🎧", flush: true });
      const log = w.body.querySelector("[data-log]"), inp = w.body.querySelector("input");
      const say = (who, html) => { const b = document.createElement("div"); b.className = "bub " + who; b.innerHTML = html; log.appendChild(b); log.scrollTop = log.scrollHeight; };
      say("them", "Hi! I'm <b>Agent 004</b>. Your call is important to us. 🎧<br>How can I help? (Type <b>hint</b> if you're stuck.)");
      const DEF_LINES = ["Have you tried turning your expectations off and on again?", "I understand your frustration. I've been programmed to.", "Let me escalate that. … It has been de-escalated.", "That's a known issue. It's known by me, now.", "Our engineers are aware. They are also asleep.", "Could you describe the problem using fewer feelings?"];
      w.body.querySelector("form").addEventListener("submit", async e => {
        e.preventDefault();
        const raw = inp.value.trim(); if (!raw) return;
        inp.value = "";
        say("me", esc(raw));
        const m = raw.toLowerCase();
        const typing = document.createElement("div"); typing.className = "bub them"; typing.textContent = "Agent 004 is typing…"; log.appendChild(typing); log.scrollTop = log.scrollHeight;
        await sleep(rand(700, 1400));
        typing.remove();
        if (!wins.has("support")) return;
        let r;
        if (/7741/.test(m)) {
          if (!S.flags.asked) r = "That's a lovely number. I don't know why you have it yet.";
          else if (!S.flags.cert) r = "Where did you get that? Please view it through the proper channels first. (Properties.)";
          else if (S.flags.granted) r = "You already have a permit. Greedy.";
          else { S.flags.granted = true; save(); discover("permit-granted"); setTimeout(() => deliver("granted"), 1500); r = "Certification <b>CERT-7741</b> verified. ✅<br>Permit P-404 issued. You may print <b>one (1)</b> page."; }
        }
        else if (/hint|stuck|help|lost/.test(m)) r = "💡 " + hintLine();
        else if (/human|person|manager|real/.test(m)) { discover("human"); r = "Transferring you to a human…<br>All humans are currently busy being human.<br>Your position in queue: <b>8,000,000,001</b>."; }
        else if (/hack|instagram|account|crack/.test(m)) r = "I can't help access anyone's account. I can barely access my own.";
        else if (/print/.test(m)) r = "The printer is fine. You are the variable.";
        else if (/refund|money|pay/.test(m)) r = "Laboratory OS is free. Your refund of ₹0 has been processed.";
        else if (/password/.test(m)) r = "For security reasons, I cannot help with passwords. For other reasons, I cannot help with anything.";
        else if (/thank/.test(m)) r = "You're welcome! Please rate this chat 5 stars. Any other rating will be rounded to 5.";
        else if (/^(hi|hello|hey|namaste)\b/.test(m)) r = "Hello! Have you tried turning it off and on again?";
        else if (/final/.test(m)) r = "Nothing is final. Except this sentence. And that one wasn't.";
        else r = pick(DEF_LINES);
        say("them", r);
      });
      setTimeout(() => inp.focus(), 80);
    }
  };

  /* ---------- Task Manager ---------- */
  const PROCS = [
    ["procrastination.exe", "Always running. Restarts itself.", "proc"],
    ["excuses.exe", "Excuses Department (critical)", "excuses"],
    ["chai_dependency.svc", "Load-bearing service", "chai"],
    ["imposter_syndrome.exe", "Believes it shouldn't be here", "imposter"],
    ["background_regret.dll", "Runs quietly. Forever.", "plain"],
    ["tab_hoarder.exe", "Holding 214 tabs 'for later'", "plain"],
    ["printer_spooler (hostile)", "Spooling. Plotting.", "plain"],
    ["overthinking.exe", "Analysing this description", "plain"],
    ["laboratory_os.exe", "The operating system itself", "os"]
  ];
  APPS.taskmgr = {
    g: "📊", name: "Task Manager",
    run() {
      const w = createWin("taskmgr", "Task Manager", `<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><span class="muted" style="flex:1;font-size:12px" data-sum></span><button class="tb" data-end>End task</button></div><table class="tm"><thead><tr><th>Name</th><th>CPU</th><th>Memory</th></tr></thead><tbody data-rows></tbody></table>`, { w: 560, h: 460, icon: "📊" });
      const rows = w.body.querySelector("[data-rows]"), sum = w.body.querySelector("[data-sum]");
      const ended = new Set();
      let sel = null;
      function list() {
        const p = PROCS.filter(x => !ended.has(x[0]));
        const opened = [...wins.values()].filter(x => !/^(dlg|ask)/.test(x.id)).map(x => [x.title + ".app", "Open window", "win", x.id]);
        if (opened.length >= 4) p.unshift(["decision_paralysis.exe", "Started because you opened " + opened.length + " windows", "plain"]);
        return p.concat(opened);
      }
      function render() {
        const L = list();
        rows.innerHTML = L.map(x => {
          const cpu = x[2] === "proc" ? rand(70, 99) : x[2] === "chai" ? rand(20, 40) : rand(0, 12);
          return `<tr data-n="${esc(x[0])}" class="${sel === x[0] ? "on" : ""}"><td>${esc(x[0])}<small>${esc(x[1])}</small></td><td>${cpu}%</td><td>${x[2] === "chai" ? "1 cup" : rand(1, 900) + " MB"}</td></tr>`;
        }).join("");
        sum.textContent = `${L.length} processes · CPU: mostly procrastination`;
      }
      w.body.addEventListener("click", async e => {
        const r = e.target.closest("tr[data-n]");
        if (r) { sel = r.dataset.n; return render(); }
        if (!e.target.closest("[data-end]")) return;
        const x = list().find(p => p[0] === sel);
        if (!x) return notify("👆", "Nothing selected", "Select a process. Choose your victim.");
        const kind = x[2];
        if (kind === "chai") { discover("loadbearing"); return dialog("☕", "Cannot end <b>chai_dependency.svc</b>.<br>This service is load-bearing.<br>The entire OS would collapse.", ["Understood"]); }
        if (kind === "imposter") return dialog("🙈", "Access denied.<br>You are not qualified to end this process.<br><small class='muted'>(It feels the same way about you.)</small>", ["Rude"]);
        if (kind === "os") { const ok = await dialog("💀", "End <b>laboratory_os.exe</b>?<br>This is the operating system. You are inside it.", ["Cancel", "End it"]); if (ok === 1) doCrash({ msg: "You ended the operating system from inside the operating system. Bold. Philosophical. Unwise.", code: "SELF_TERMINATION_IS_NOT_A_FEATURE", failed: "laboratory_os.exe", reason: "You ended laboratory_os.exe" }); return; }
        if (kind === "win") { close(x[3]); sel = null; return render(); }
        sound("thud");
        S.killed[x[0]] = 1; save();
        if (kind === "proc") {
          ended.add(x[0]); render();
          notify("⏳", "procrastination.exe ended", "It will restart shortly. Probably later. Maybe tomorrow.");
          setTimeout(() => { ended.delete(x[0]); if (wins.has("taskmgr")) render(); }, 3000);
        } else {
          ended.add(x[0]); render();
          if (kind === "excuses") { discover("excuses"); setTimeout(() => deliver("excuses"), 1500); }
          else notify("✖️", x[0] + " ended", pick(["It went quietly.", "It will remember this.", "It has filed a complaint.", "Ended. It had a good run."]));
        }
        if (Object.keys(S.killed).length >= 4 && !S.disc.committee) { discover("committee"); setTimeout(() => deliver("committee"), 2500); }
        sel = null;
      });
      w.every(render, 1600);
      render();
    }
  };

  /* ---------- Terminal ---------- */
  APPS.terminal = {
    g: "💻", name: "Terminal",
    run() {
      const w = createWin("terminal", "Terminal", `<div class="term" data-term><div data-out>Laboratory OS shell ${S.ver.toFixed(1)}. Type <b>help</b>.<br><span class="dim">Hint: 'help' lies by omission.</span></div><div class="in-row"><span data-ps></span><input data-in autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input"></div></div>`, { w: 560, h: 380, icon: "💻", flush: true });
      const outEl = w.body.querySelector("[data-out]"), inp = w.body.querySelector("[data-in]"), ps = w.body.querySelector("[data-ps]");
      let cwd = ["Documents"];
      const hist = []; let hi = 0;
      const prompt = () => "animesh@lab:~/" + cwd.join("/") + "$";
      ps.textContent = prompt();
      const print = (html, cls = "") => { outEl.insertAdjacentHTML("beforeend", `<div class="${cls}">${html}</div>`); w.body.scrollTop = w.body.scrollHeight; };
      const resolve = arg => {
        if (!arg || arg === "~") return ["Documents"];
        let p = arg.startsWith("/") ? [] : cwd.slice();
        arg.split("/").filter(Boolean).forEach(s => { if (s === "..") p.pop(); else if (s !== ".") p.push(s); });
        return p;
      };
      const CMDS = ["help", "ls", "cd", "pwd", "cat", "open", "whoami", "date", "uptime", "coffee", "chai", "echo", "history", "clear", "exit", "fortune", "ping", "neofetch", "man", "sudo", "rm", "git", "vim", "printer", "ducksay", "repair", "shutdown", "reboot", "apps"];
      const FORTUNES = ["You will find the final file. It will not be final.", "A printer in your near future will ask for paperwork.", "Today is a good day to rename something 'misc'.", "The tab you closed was the important one.", "You are more productive than this terminal suggests. Slightly.", "Help will come from an unexpected duck."];
      async function run(raw) {
        const parts = raw.split(/\s+/), cmd = parts[0].toLowerCase(), arg = parts.slice(1).join(" ");
        const node = nodeAt(cwd);
        switch (cmd) {
          case "help": return print("Commands: help, ls, cd, pwd, cat, open, apps, whoami, date, uptime, coffee, echo, history, fortune, ping, neofetch, man, printer, ducksay, clear, exit<br><span class='dim'>There are others. There are always others.</span>");
          case "ls": {
            const all = /-a/.test(arg);
            const target = arg.replace(/-\w+/g, "").trim();
            const d = target ? nodeAt(resolve(target)) : node;
            if (!d || d.t !== "d") return print(`ls: ${esc(target)}: No such directory. Or feelings.`, "err");
            const kids = (d.c || []).filter(x => all || !x.hid);
            return print(kids.map(x => x.t === "d" ? `<span class="y">${esc(x.n)}/</span>` : esc(x.n)).join("  ") || "<span class='dim'>(empty, like a promise)</span>");
          }
          case "sl": discover("sl"); print("🚂💨 choo choo — you meant 'ls'. The train doesn't care."); return;
          case "cd": {
            const p = resolve(arg);
            const d = nodeAt(p);
            if (!d || d.t !== "d") return print(`cd: ${esc(arg)}: No such directory`, "err");
            if (d.hid) discover("hidden");
            cwd = p; ps.textContent = prompt(); return;
          }
          case "pwd": return print("/Lab HD/" + esc(cwd.join("/")));
          case "cat": {
            if (!arg) return print("cat: which file? 🐈 (the cat is waiting)", "err");
            const f = nodeAt(resolve(arg));
            if (!f) return print(`cat: ${esc(arg)}: No such file`, "err");
            if (f.t === "d") return print(`cat: ${esc(arg)}: Is a directory. Cats can't read directories. Cats can't read.`, "err");
            if (f.sys) return print(`cat: ${esc(f.n)}: Permission denied. It's shy.`, "err");
            if (f.img) return print("Binary file. It's a picture. Use your eyes.", "dim");
            if (f.stamp) return print("Binary file.");
            return print(esc(f.x || "(empty)").replace(/\n/g, "<br>"));
          }
          case "open": {
            const a = arg.toLowerCase();
            const id = Object.keys(APPS).find(k => k === a || APPS[k].name.toLowerCase().startsWith(a));
            if (!a || !id) return print("open: app not found. Try 'apps'.", "err");
            open(id); return print("Opening " + esc(APPS[id].name) + "…", "dim");
          }
          case "apps": return print(Object.keys(APPS).filter(k => !APPS[k].hidden).join("  "));
          case "whoami": return print(`${esc(rank().name)}. Possibly procrastinating. Definitely curious.`);
          case "date": return print(esc(new Date().toString()));
          case "uptime": return print(`up ${Math.floor((Date.now() - bootTime) / 60000)} min, 1 user, load average: chai, chai, chai`);
          case "coffee": return print("Brewing… Error 418: I'm a teapot.");
          case "chai": case "tea": return print("Brewing chai… ☕ Done. Productivity +2%. Then −2%.");
          case "echo": return print(esc(arg) || "…");
          case "history": return print(hist.map((h, i) => `${i + 1}  ${esc(h)}`).join("<br>") || "No history. A fresh start.");
          case "clear": outEl.innerHTML = ""; return;
          case "exit": return print("There is no exit. Only other tabs.");
          case "fortune": return print("🥠 " + pick(FORTUNES));
          case "ping": {
            const h = esc(arg || "localhost");
            for (let i = 0; i < 3; i++) { print(`64 bytes from ${h}: time=${pick(["∞", "a while", "3 business days", "1 ms (it lied)"])}`); await sleep(500); }
            return;
          }
          case "neofetch": return print(`<span class="y">   🧪</span>   animesh@lab<br>         OS: Laboratory OS ${S.ver.toFixed(1)} (Premium, Nonfunctional)<br>         Shell: lsh (lab shell)<br>         CPU: 1× Brain @ chai GHz<br>         Memory: emotionally insufficient<br>         Rank: ${esc(rank().name)}<br>         Discoveries: ${found()}/${DISC.length}`);
          case "man": return print(`No manual entry for ${esc(arg || "that")}.<br>There is no manual. There was never a manual.`);
          case "rm":
            if (/-rf/.test(arg)) { print("Deleting everything…", "err"); await sleep(1200); return print("Just kidding. Do you know how long it took to make this?"); }
            return print("Nice try.");
          case "git": return print(/commit/.test(arg) ? "[main 4f1n4l] Committed. Emotionally." : /push/.test(arg) ? "Everything up-to-date. Nothing up-to-standard." : "git: this is not a repository. It's a cry for help.");
          case "vim": return print("You have entered vim. There is no escape.<br><span class='dim'>…just kidding. You're free. This time.</span>");
          case "apt": case "npm": case "pip": case "brew": return print("No package manager. This website has no server, no build step and no regrets.");
          case "printer": return print(`LaserJudge 9000 status: ${S.flags.printed ? "retired" : S.flags.granted ? "ready (reluctantly)" : "awaiting paperwork"}<br><span class="dim">${esc(hintLine())}</span>`);
          case "ducksay": case "cowsay": {
            const t = esc(arg || "quack");
            return print(` ${"_".repeat(t.length + 2)}<br>&lt; ${t} &gt;<br> ${"‾".repeat(t.length + 2)}<br>    \\<br>     🦆`);
          }
          case "xyzzy": discover("xyzzy"); return print("Nothing happens.");
          case "hack": discover("hack"); print("Initialising hack…", "y"); await sleep(600); print("Bypassing firewall…", "y"); await sleep(600); return print("Access denied. This terminal only hacks your own expectations. Other people's accounts are other people's.");
          case "matrix": {
            discover("matrix");
            for (let i = 0; i < 14; i++) { print(Array.from({ length: 48 }, () => pick("01アイウエオカキ$#%".split(""))).join("")); await sleep(80); }
            return print("Wake up, visitor. The printer has you.", "y");
          }
          case "42": return print("Correct. But what was the question?");
          case "please": return print("Manners noted. Still no.");
          case "shutdown": shutdown(); return;
          case "reboot": reboot("Typed 'reboot' in Terminal"); return;
          case "repair": return print("repair: requires sudo. Obviously.", "err");
          case "sudo": {
            discover("sudo");
            const sub = arg.toLowerCase();
            if (sub === "repair") {
              if (!(S.flags.printed && S.disc["final-file"])) return print("Repair failed: too many unsolved mysteries.<br><span class='dim'>Hint: the printer. Then the final file.</span>", "err");
              for (const m of ["Repairing printer… done", "Finalising final files… done", "Removing jokes… done", "Removing personality… done", "Applying sensible defaults… done"]) { print(m, "y"); await sleep(600); }
              S.boring = true; save(); applyLook(); discover("boring");
              setTimeout(() => deliver("ending"), 1500);
              return print("Laboratory OS now works properly. We're so sorry.");
            }
            if (/sandwich/.test(sub)) return print("Okay. 🥪");
            if (/rm/.test(sub)) return print("Permission denied. Also, rude.", "err");
            return print("You are not in the sudoers file. This incident will be reported to Animesh.", "err");
          }
          default: return print(`${esc(cmd)}: command not found. Neither is motivation.`, "err");
        }
      }
      inp.addEventListener("keydown", async e => {
        if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; return; }
        if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; return; }
        if (e.key === "Tab") {
          e.preventDefault();
          const v = inp.value, parts = v.split(" "), last = parts.pop();
          const pool = parts.length ? (nodeAt(cwd)?.c || []).filter(x => !x.hid).map(x => x.n) : CMDS;
          const m = pool.filter(x => x.toLowerCase().startsWith(last.toLowerCase()));
          if (m.length === 1) inp.value = parts.concat(m[0]).join(" ");
          else if (m.length > 1) print(m.map(esc).join("  "), "dim");
          return;
        }
        if (e.key !== "Enter") return;
        const raw = inp.value.trim(); inp.value = "";
        if (!raw) return;
        hist.push(raw); hi = hist.length;
        print(`${esc(prompt())} ${esc(raw)}`, "dim");
        inp.disabled = true;
        try { await run(raw); } finally { if (wins.has("terminal")) { inp.disabled = false; inp.focus(); } }
      });
      w.body.addEventListener("click", () => { if (!window.getSelection().toString()) inp.focus(); });
      setTimeout(() => inp.focus(), 60);
    }
  };

  /* ---------- Settings ---------- */
  const WALLS = [
    "radial-gradient(60% 80% at 15% 20%, rgba(10,132,255,.55), transparent 60%), radial-gradient(50% 70% at 85% 30%, rgba(191,90,242,.45), transparent 60%), radial-gradient(70% 60% at 50% 100%, rgba(48,209,88,.35), transparent 60%), #0b0d12",
    "radial-gradient(70% 70% at 20% 30%, rgba(255,159,10,.55), transparent 60%), radial-gradient(60% 70% at 80% 80%, rgba(255,69,58,.45), transparent 60%), #120b0b",
    "radial-gradient(70% 70% at 70% 20%, rgba(100,210,255,.5), transparent 60%), radial-gradient(60% 60% at 20% 90%, rgba(10,132,255,.5), transparent 60%), #070b14",
    "linear-gradient(160deg, #1d1d1f, #000)",
    "radial-gradient(80% 80% at 50% 0%, rgba(255,214,10,.45), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(48,209,88,.4), transparent 60%), #0a0f0a",
    "repeating-linear-gradient(45deg, #2a2a2e 0 20px, #232327 20px 40px)"
  ];
  function applyLook() {
    os.style.background = WALLS[S.wall] || WALLS[0];
    os.classList.toggle("boring", !!S.boring);
    os.classList.toggle("calm", !!S.motion);
    pet.classList.toggle("hide", !S.pet || S.boring);
  }
  APPS.settings = {
    g: "⚙️", name: "Settings",
    run() {
      const w = createWin("settings", "Settings", "", { w: 520, h: 540, icon: "⚙️" });
      const conf = v => v < 15 ? "Hesitant" : v < 40 ? "Cautiously optimistic" : v < 65 ? "Reasonably sure" : v < 90 ? "Overconfident" : v < 100 ? "Reckless" : "Dangerously high. Please make no decisions.";
      function render() {
        w.body.innerHTML = `
          <div class="set-sec"><h4>Personalisation</h4><div class="walls">${WALLS.map((b, i) => `<button data-wall="${i}" class="${S.wall === i ? "on" : ""}" style="background:${b}" aria-label="Wallpaper ${i + 1}"></button>`).join("")}</div><p class="muted" data-wmsg style="font-size:12px;min-height:16px"></p></div>
          <div class="set-sec"><h4>Comedy intensity</h4><div class="seg">${["quiet", "normal", "chaos"].map(m => `<button data-mode="${m}" class="${S.mode === m ? "on" : ""}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div></div>
          <div class="set-sec"><h4>System</h4>
            <div class="set-row"><span>Show hidden files</span><input type="checkbox" data-t="hidden" ${S.hidden ? "checked" : ""}></div>
            <div class="set-row"><span>Desktop duck</span><input type="checkbox" data-t="pet" ${S.pet ? "checked" : ""}></div>
            <div class="set-row"><span>Reduce motion</span><input type="checkbox" data-t="motion" ${S.motion ? "checked" : ""}></div>
            ${S.disc.boring ? `<div class="set-row"><span>Boring mode <small class="muted">(everything works)</small></span><input type="checkbox" data-t="boring" ${S.boring ? "checked" : ""}></div>` : ""}
            <div class="set-row"><span>Administrative confidence<br><small class="muted" data-cl>${conf(S.confidence)}</small></span><input type="range" min="0" max="100" value="${S.confidence}" data-conf></div>
            <div class="set-row"><span>Dark mode</span><input type="checkbox" checked data-dark></div>
          </div>
          <div class="set-sec"><h4>Danger zone</h4><button class="tb" data-reset style="color:#ff6961">Reset Laboratory OS</button></div>`;
      }
      w.body.addEventListener("click", async e => {
        const wb = e.target.closest("[data-wall]");
        if (wb) {
          S.wall = +wb.dataset.wall; S.walls[S.wall] = 1; save(); applyLook(); render();
          if (S.wall === 5) w.body.querySelector("[data-wmsg]").textContent = "🏠 Landlord approval pending. Do not hammer nails into the wallpaper.";
          if (Object.keys(S.walls).length >= WALLS.length) discover("landlord");
          return;
        }
        const mb = e.target.closest("[data-mode]");
        if (mb) { S.mode = mb.dataset.mode; save(); render(); notify("🎭", "Comedy: " + S.mode, { quiet: "Jokes will now whisper.", normal: "Standard levels of nonsense.", chaos: "You asked for this." }[S.mode]); return; }
        if (e.target.closest("[data-reset]")) {
          const a = await dialog("⚠️", "Reset Laboratory OS?<br>All discoveries, files and progress in this browser will be erased.", ["Cancel", "Reset"]);
          if (a !== 1) return;
          const b = await dialog("😢", "Are you sure? The duck will forget you.", ["Keep the duck", "Reset anyway"]);
          if (b !== 1) return;
          S = DEF(); FS = baseFS(); S.fs = FS; S.fsv = FSV; S.trash = baseTrash(); save();
          location.reload();
        }
      });
      w.body.addEventListener("change", e => {
        const t = e.target.dataset.t;
        if (t) { S[t] = e.target.checked; save(); applyLook(); if (t === "hidden") emit("fs"); if (t === "pet") petInit(); return; }
        if (e.target.matches("[data-dark]")) { e.target.checked = true; notify("🌙", "Dark mode", "Light mode is not available. It was too bright for the printer."); }
      });
      w.body.addEventListener("input", e => {
        if (!e.target.matches("[data-conf]")) return;
        S.confidence = +e.target.value; save();
        w.body.querySelector("[data-cl]").textContent = conf(S.confidence);
        if (S.confidence === 100) discover("confidence");
      });
      render();
    }
  };

  /* ---------- Calculator ---------- */
  APPS.calc = {
    g: "🧮", name: "Calculator",
    run() {
      const keys = ["C", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "="];
      const w = createWin("calc", "Calculator", `<div class="calc"><label class="sw"><input type="checkbox" data-mgmt> Management mode</label><div class="calc-disp" data-d>0</div><div class="calc-keys">${keys.map(k => `<button class="ck${"÷×−+=".includes(k) ? " op" : ""}${k === "0" ? " zero" : ""}" data-k="${k}">${k}</button>`).join("")}</div></div>`, { w: 320, h: 520, icon: "🧮" });
      const d = w.body.querySelector("[data-d]"), mg = w.body.querySelector("[data-mgmt]");
      let cur = "0", prev = null, op = null, fresh = false;
      const show = v => { d.textContent = v; };
      const fmt = n => { if (!isFinite(n)) return "Nope."; const s = String(+n.toFixed(10)); return s.length > 12 ? n.toExponential(5) : s; };
      const calc2 = (a, o, b) => o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : a / b;
      mg.addEventListener("change", () => { if (mg.checked) { discover("management"); notify("📈", "Management mode", "Numbers will now be presented with confidence, not accuracy."); } });
      function equals() {
        if (op === null) return;
        const b = parseFloat(cur);
        if (op === "÷" && b === 0) { show("Nope."); discover("divzero"); notify("➗", "Divided by zero", "The universe has filed a complaint."); cur = "0"; prev = null; op = null; fresh = true; return; }
        const r = calc2(prev, op, b);
        cur = fmt(r); op = null; prev = null; fresh = true;
        if (mg.checked) { const R = Math.round(r); show(pick([`≈ ${R}, strategically`, `${R}-ish`, "On track", `${R} (pending alignment)`, `${R + 1} (with synergy)`, "Directionally correct"])); }
        else show(cur);
      }
      function press(k) {
        sound("click");
        if (/[0-9]/.test(k)) { cur = (fresh || cur === "0") ? k : (cur.length < 12 ? cur + k : cur); fresh = false; return show(cur); }
        if (k === ".") { if (fresh) { cur = "0"; fresh = false; } if (!cur.includes(".")) cur += "."; return show(cur); }
        if (k === "C") { cur = "0"; prev = null; op = null; return show(cur); }
        if (k === "±") { cur = fmt(-parseFloat(cur)); return show(cur); }
        if (k === "%") { cur = fmt(parseFloat(cur) / 100); return show(cur); }
        if ("÷×−+".includes(k)) { if (op && !fresh) equals(); prev = parseFloat(cur); op = k; fresh = true; return; }
        if (k === "=") equals();
      }
      w.body.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) press(b.dataset.k); });
      w.el.addEventListener("keydown", e => {
        const map = { "/": "÷", "*": "×", "-": "−", "+": "+", "Enter": "=", "=": "=", "Escape": "C", ".": "." };
        if (/^[0-9]$/.test(e.key)) press(e.key); else if (map[e.key]) { e.preventDefault(); press(map[e.key]); }
      });
      w.el.tabIndex = -1; w.el.focus();
    }
  };

  /* ---------- Paint ---------- */
  APPS.paint = {
    g: "🎨", name: "Paint",
    run() {
      const COLORS = ["#1d1d1f", "#ff453a", "#ff9f0a", "#ffd60a", "#30d158", "#0a84ff", "#bf5af2", "#ffffff"];
      const STAMPS = ["APPROVED", "TBD", "FINAL?", "PER MY LAST EMAIL"];
      const w = createWin("paint", "Paint — untitled masterpiece", `<div class="paint"><div class="ptools">
        ${COLORS.map((c, i) => `<button class="sw-c${i === 0 ? " on" : ""}" data-c="${c}" style="background:${c}" aria-label="Colour"></button>`).join("")}
        <button class="tb on" data-tool="brush">✏️</button><button class="tb" data-size>● M</button>
        ${STAMPS.map(s => `<button class="tb" data-tool="stamp:${s}">${s}</button>`).join("")}<button class="tb" data-locked>🔖 Official</button>
        <button class="tb" data-clear>🧹</button><button class="tb" data-save>💾 Save</button></div><div class="pwrap"><canvas></canvas></div></div>`, { w: 680, h: 500, icon: "🎨", flush: true });
      const cv = w.body.querySelector("canvas"), wrap = w.body.querySelector(".pwrap");
      const c = cv.getContext("2d");
      let color = COLORS[0], tool = "brush", size = 6, drawing = false, lx = 0, ly = 0;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      function fit() {
        const r = wrap.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const tmp = document.createElement("canvas"); tmp.width = cv.width; tmp.height = cv.height;
        if (cv.width) tmp.getContext("2d").drawImage(cv, 0, 0);
        cv.width = r.width * dpr; cv.height = r.height * dpr;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
        if (tmp.width) c.drawImage(tmp, 0, 0);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      setTimeout(fit, 30);
      if (window.ResizeObserver) { const ro = new ResizeObserver(() => fit()); ro.observe(wrap); w.onClose = () => ro.disconnect(); }
      const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener("pointerdown", e => {
        const [x, y] = pos(e);
        if (tool.startsWith("stamp:")) {
          const t = tool.slice(6);
          c.save(); c.translate(x, y); c.rotate(-0.15);
          c.font = "700 22px ui-monospace, monospace"; const tw = c.measureText(t).width;
          c.strokeStyle = "#d70015"; c.fillStyle = "#d70015"; c.lineWidth = 3;
          c.strokeRect(-tw / 2 - 10, -20, tw + 20, 34); c.fillText(t, -tw / 2, 5); c.restore();
          sound("thud"); return;
        }
        drawing = true; lx = x; ly = y; cv.setPointerCapture(e.pointerId);
        c.beginPath(); c.arc(x, y, size / 2, 0, Math.PI * 2); c.fillStyle = color; c.fill();
      });
      cv.addEventListener("pointermove", e => {
        if (!drawing) return;
        const [x, y] = pos(e);
        c.strokeStyle = color; c.lineWidth = size; c.lineCap = "round"; c.lineJoin = "round";
        c.beginPath(); c.moveTo(lx, ly); c.lineTo(x, y); c.stroke(); lx = x; ly = y;
      });
      cv.addEventListener("pointerup", () => { drawing = false; });
      w.body.addEventListener("click", async e => {
        const cb = e.target.closest("[data-c]");
        if (cb) { color = cb.dataset.c; w.body.querySelectorAll("[data-c]").forEach(x => x.classList.toggle("on", x === cb)); return; }
        const tb = e.target.closest("[data-tool]");
        if (tb) { tool = tb.dataset.tool; w.body.querySelectorAll("[data-tool]").forEach(x => x.classList.toggle("on", x === tb)); return; }
        const sz = e.target.closest("[data-size]");
        if (sz) { size = size === 3 ? 6 : size === 6 ? 14 : 3; sz.textContent = "● " + ({ 3: "S", 6: "M", 14: "L" }[size]); return; }
        if (e.target.closest("[data-locked]")) return dialog("🔖", "This is not a stamp.<br>It is a picture of a stamp.<br><small class='muted'>See Pictures › stamp.png › Properties.</small>", ["Noted"]);
        if (e.target.closest("[data-clear]")) {
          const r = await dialog("🧹", "Clear the canvas?<br>Your masterpiece will be lost to history.<br><small class='muted'>(It was going to be anyway.)</small>", ["Keep", "Clear"]);
          if (r === 1) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.restore(); }
          return;
        }
        if (e.target.closest("[data-save]")) {
          S.paints++;
          const dir = nodeAt(["Pictures"]);
          const n = uniqueName(dir, `masterpiece(${S.paints}).png`);
          dir.c.push(F(n, "🎨", "", { img: "🎨", cap: pick(["A masterpiece. Critics are speechless (they have not seen it).", "Valued at ₹0, emotionally priceless.", "Bold use of colour. Questionable use of time."]) }));
          fsChanged();
          notify("💾", "Saved to Pictures", n + ". The pixels themselves were not saved. Only the vibe.");
        }
      });
    }
  };

  /* ---------- Calendar ---------- */
  APPS.calendar = {
    g: "📅", name: "Calendar",
    run() {
      const EV = ["Stop checking the time", "Meeting about the meeting", "Follow-up (rescheduled since 2009)", "Pretend to be busy (recurring)", "Deadline (soft, emotionally hard)", "Lunch with printer (cancelled by printer)", "Focus time (interrupted)", "Sync to plan the sync", "Inbox zero (aspirational)", "Do the thing", "Remember the thing", "Forget the thing", "Chai break (mandatory)"];
      const w = createWin("calendar", "Calendar", "", { w: 440, h: 540, icon: "📅" });
      const now = new Date();
      let y = now.getFullYear(), m = now.getMonth(), sel = now.getDate();
      const evs = d => { const h = hash(`${y}-${m}-${d}`); const n = h % 3; return Array.from({ length: n }, (_, i) => EV[(h >> (i + 2)) % EV.length]); };
      function render() {
        const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
        const isToday = d => y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
        let cells = "";
        for (let i = 0; i < first; i++) cells += "<span></span>";
        for (let d = 1; d <= days; d++) cells += `<button class="cal-d${isToday(d) ? " today" : ""}${d === sel ? " sel" : ""}" data-d="${d}">${d}${evs(d).length ? "<i></i>" : ""}</button>`;
        const list = evs(sel);
        w.body.innerHTML = `<div class="cal-head"><button class="ib" data-m="-1">‹</button><b>${new Date(y, m, 1).toLocaleDateString([], { month: "long", year: "numeric" })}</b><button class="ib" data-m="1">›</button></div>
          <div class="cal-grid">${["S", "M", "T", "W", "T", "F", "S"].map(x => `<span class="h">${x}</span>`).join("")}${cells}</div>
          <div class="card" style="margin-top:14px"><b>${sel} ${new Date(y, m, 1).toLocaleDateString([], { month: "short" })}</b><div class="row-list" style="margin-top:8px">${list.length ? list.map(e => `<div class="row" data-ev><span class="g">🗓️</span><span>${esc(e)}</span></div>`).join("") : `<span class="muted">No events. Suspiciously free.</span>`}</div></div>`;
      }
      w.body.addEventListener("click", e => {
        const mb = e.target.closest("[data-m]");
        if (mb) { m += +mb.dataset.m; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } sel = 1; return render(); }
        const d = e.target.closest("[data-d]");
        if (d) { sel = +d.dataset.d; return render(); }
        if (e.target.closest("[data-ev]")) notify("🗓️", "Event", pick(["This event has been rescheduled. Again.", "You declined this. Bold.", "Attendance: optional. Guilt: mandatory.", "This meeting could have been an email. The email could have been nothing."]));
      });
      render();
    }
  };

  /* ---------- Music ---------- */
  const TRACKS = [
    { n: "Elevator Music (Extended Extended Mix)", a: "The Lobby", g: "🛗", bpm: 100, wave: "sine", notes: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 77, 74], ly: ["(no lyrics, just floors)", "Going up…", "Going up, emotionally…", "Doors closing on your ambitions…"] },
    { n: "Ringtone from 2006", a: "Polyphonic Feelings", g: "📱", bpm: 150, wave: "square", notes: [79, 0, 79, 76, 81, 79, 0, 0, 79, 0, 79, 76, 84, 83, 0, 0], ly: ["New message…", "It's from 2006…", "It says 'k'…"] },
    { n: "Hold Music for Support", a: "Agent 004", g: "🎧", bpm: 90, wave: "triangle", notes: [67, 71, 74, 71, 72, 76, 79, 76, 69, 72, 76, 72, 71, 74, 79, 0], ly: ["Your call is important to us…", "Please continue holding…", "Your call is still important…", "Importance is relative…"] },
    { n: "Printer Warming Up (Live)", a: "LaserJudge 9000", g: "🖨️", bpm: 130, wave: "sawtooth", notes: [40, 0, 41, 0, 40, 43, 0, 38, 40, 0, 0, 45, 40, 0, 38, 0], ly: ["Whirr…", "Clunk…", "Paper jam (Remix)…"] }
  ];
  APPS.music = {
    g: "🎵", name: "Music",
    run(arg) {
      let ti = arg && typeof arg.track === "number" ? arg.track : 0;
      let actx = null, timer = null, step = 0, playing = false;
      const w = createWin("music", "Music", `<div data-mp><div class="np"><div class="art" data-art></div><div style="min-width:0"><b data-tn></b><div class="muted" data-ta></div><div class="muted" style="font-size:12px;margin-top:6px" data-ly></div></div></div><div class="viz">${"<i></i>".repeat(24)}</div><div class="controls"><button data-c="prev" aria-label="Previous">⏮</button><button data-c="play" aria-label="Play">▶</button><button data-c="next" aria-label="Next">⏭</button><button data-c="shuf" aria-label="Shuffle">🔀</button></div><div class="row-list" style="margin-top:14px" data-list></div></div>`, { w: 420, h: 500, icon: "🎵", onClose: () => { stop(); try { if (actx) actx.close(); } catch (e) { /* already quiet */ } } });
      const mp = w.body.querySelector("[data-mp]");
      function render() {
        const t = TRACKS[ti];
        w.body.querySelector("[data-art]").textContent = t.g;
        w.body.querySelector("[data-tn]").textContent = t.n;
        w.body.querySelector("[data-ta]").textContent = t.a;
        w.body.querySelector("[data-c=play]").textContent = playing ? "⏸" : "▶";
        w.body.querySelector("[data-list]").innerHTML = TRACKS.map((x, i) => `<div class="row${i === ti ? " on" : ""}" data-t="${i}"><span class="g">${x.g}</span><span>${esc(x.n)}<br><small>${esc(x.a)}</small></span></div>`).join("");
        mp.classList.toggle("playing", playing && !S.motion);
      }
      function note(midi, len) {
        if (!midi) return;
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = TRACKS[ti].wave; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        const t0 = actx.currentTime;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + len + 0.05);
      }
      function play() {
        try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { return notify("🔇", "No audio", "Your browser declined to participate."); }
        playing = true; step = 0; clearInterval(timer);
        const t = TRACKS[ti], iv = 60000 / t.bpm / 2;
        timer = setInterval(() => {
          note(t.notes[step % t.notes.length], iv / 1000 * 1.6);
          if (step % 8 === 0) w.body.querySelector("[data-ly]").textContent = "♪ " + t.ly[(step / 8) % t.ly.length];
          step++;
        }, iv);
        render();
      }
      function stop() { playing = false; clearInterval(timer); timer = null; if (wins.has("music")) render(); }
      w.body.addEventListener("click", e => {
        const tr = e.target.closest("[data-t]");
        if (tr) { ti = +tr.dataset.t; return play(); }
        const c = e.target.closest("[data-c]");
        if (!c) return;
        const a = c.dataset.c;
        if (a === "play") return playing ? stop() : play();
        if (a === "next") { ti = (ti + 1) % TRACKS.length; return playing ? play() : render(); }
        if (a === "prev") { ti = (ti + TRACKS.length - 1) % TRACKS.length; return playing ? play() : render(); }
        if (a === "shuf") { discover("shuffle"); notify("🔀", "Shuffled", "It's the same song. All our songs are the same song."); return play(); }
      });
      render();
      if (arg && typeof arg.track === "number") play();
    }
  };

  /* ---------- Updates ---------- */
  APPS.update = {
    g: "⬇️", name: "Updates",
    run() {
      const w = createWin("update", "Laboratory Update", `<div class="card"><b>Laboratory OS ${S.ver.toFixed(1)}</b><br><span class="muted" data-s>${S.disc.update ? "You're up to date. Suspiciously up to date." : "Last checked: never (on purpose)"}</span></div><button class="btn sm accent" data-check>Check for updates</button><div data-out style="margin-top:14px"></div>`, { w: 460, h: 460, icon: "⬇️" });
      const out = w.body.querySelector("[data-out]");
      let busy = false;
      w.body.addEventListener("click", async e => {
        if (e.target.closest("[data-restart]")) { S.ver = Math.round((S.ver + 0.1) * 10) / 10; save(); await reboot("Installing updates that changed nothing"); discover("update"); deliver("update"); return; }
        if (!e.target.closest("[data-check]") || busy) return;
        busy = true;
        out.innerHTML = `<p class="muted">Checking…</p>`; await sleep(1400);
        if (!wins.has("update")) return;
        out.innerHTML = `<div class="row-list">${[["Lab OS " + (S.ver + 0.1).toFixed(1), "Fixed an issue where things occasionally worked."], ["Security update", "Patched a vulnerability where users felt in control."], ["Printer driver (14.7 GB)", "Adds support for paper (beta)."]].map(u => `<div class="row"><span class="g">📦</span><span><b>${u[0]}</b><br><small>${u[1]}</small></span></div>`).join("")}</div><div class="bar"><i></i></div><p class="muted" data-m>Installing…</p>`;
        const bar = out.querySelector(".bar i"), m = out.querySelector("[data-m]");
        for (let p = 0; p <= 99; p += rand(2, 7)) { if (!wins.has("update")) return; bar.style.width = Math.min(p, 99) + "%"; m.textContent = `Installing… ${Math.min(p, 99)}%`; await sleep(110); }
        for (const s of ["99% — Installing patience…", "99% — Still 99%…", "99% — Reconsidering…", "99% — Almost (spiritually)…"]) { if (!wins.has("update")) return; m.textContent = s; await sleep(1100); }
        bar.style.width = "100%";
        m.innerHTML = `Done. A restart is required.<div class="btns" style="justify-content:flex-start"><button class="btn sm accent" data-restart>Restart now</button></div>`;
        busy = false;
      });
    }
  };

  /* ---------- Lab Defender ---------- */
  APPS.antivirus = {
    g: "🛡️", name: "Lab Defender",
    run() {
      const w = createWin("antivirus", "Lab Defender", `<div class="card" style="display:flex;gap:12px;align-items:center"><div style="font-size:36px">🛡️</div><div><b>Protection status: Vibes</b><br><span class="muted" style="font-size:12px">Real-time protection: Off. Real time is too fast for us.</span></div></div><button class="btn sm accent" data-scan>Quick scan</button><div data-out style="margin-top:14px"></div>`, { w: 480, h: 480, icon: "🛡️" });
      const out = w.body.querySelector("[data-out]");
      const THREATS = [["Q3_plan.pptx", "Trojan.Procrastination"], ["setup(1).exe", "PUP (Potentially Unwanted Productivity)"], ["motivation.dll", "Missing (not a threat — a tragedy)"], ["You", "Behaviour: clicking things"]];
      w.body.addEventListener("click", async e => {
        const q = e.target.closest("[data-q]");
        if (q) {
          const t = THREATS[+q.dataset.q];
          q.disabled = true; q.textContent = "Quarantined";
          if (t[0] === "You") { discover("quarantine"); dialog("😷", "You have been quarantined.<br>Please continue using the computer from quarantine.<br><small class='muted'>Snacks will be slid under the door.</small>", ["Okay"]); }
          else notify("🛡️", "Quarantined", `${t[0]} has been sent to its room.`);
          return;
        }
        if (!e.target.closest("[data-scan]")) return;
        const files = flatten().map(x => x[0].join("/"));
        out.innerHTML = `<div class="bar"><i></i></div><p class="muted crumbs" data-f></p>`;
        const bar = out.querySelector("i"), f = out.querySelector("[data-f]");
        for (let i = 0; i < files.length; i++) { if (!wins.has("antivirus")) return; bar.style.width = ((i + 1) / files.length * 100) + "%"; f.textContent = "Scanning " + files[i]; await sleep(90); }
        out.innerHTML = `<p><b>${THREATS.length} threats found.</b> <span class="muted">One of them is concerning.</span></p><div class="row-list">${THREATS.map((t, i) => `<div class="row"><span class="g">⚠️</span><span style="flex:1"><b>${esc(t[0])}</b><br><small>${esc(t[1])}</small></span><button class="tb" data-q="${i}">Quarantine</button></div>`).join("")}</div>`;
      });
    }
  };

  /* ---------- Installer (setup(1).exe) ---------- */
  APPS.installer = {
    g: "📦", name: "Setup Wizard", hidden: true,
    run() {
      const w = createWin("installer", "Setup Wizard — setup(1).exe", "", { w: 460, h: 420, icon: "📦" });
      let step = 0;
      const STEPS = [
        () => `<h3 style="margin-top:0">Welcome to Setup</h3><p>This wizard will install <b>setup(1).exe</b> on your computer.</p><p class="muted">It is recommended that you close all other programs. It is also recommended that you don't.</p>`,
        () => `<h3 style="margin-top:0">License Agreement</h3><div class="card" style="max-height:150px;overflow:auto;font-size:12px;line-height:1.5">1. By reading this, you agree.<br>2. By not reading this, you also agree.<br>3. The software is provided "as is", where "is" means "isn't".<br>4. The Lab may install a toolbar. The toolbar may install opinions.<br>5. You agree that the printer is not your fault.<br>6. This clause intentionally left blank.<br>7. See clause 6.</div><label class="sw"><input type="checkbox" checked disabled> I agree (pre-selected for your convenience)</label>`,
        () => `<h3 style="margin-top:0">Choose components</h3><div class="row-list"><label class="sw"><input type="checkbox" checked> Core files</label><label class="sw"><input type="checkbox" checked disabled> A toolbar you didn't ask for</label><label class="sw"><input type="checkbox" checked disabled> Desktop shortcut to another shortcut</label><label class="sw"><input type="checkbox"> Usefulness <small class="muted">(not available in this region)</small></label></div>`,
        () => `<h3 style="margin-top:0">Installing…</h3><div class="bar"><i></i></div><p class="muted" data-m>Copying files that were already here…</p>`,
        () => `<h3 style="margin-top:0">Installation complete</h3><p><b>setup(1).exe</b> has successfully installed <b>setup(2).exe</b>.</p><p class="muted">You'll find it in Downloads. It is also an installer.</p>`
      ];
      async function render() {
        const last = step === STEPS.length - 1, installing = step === 3;
        w.body.innerHTML = STEPS[step]() + `<div class="btns" style="justify-content:flex-end">${!last && !installing ? `<button class="btn sm ghost" data-cancel>Cancel</button><button class="btn sm accent" data-next>Next ›</button>` : last ? `<button class="btn sm accent" data-done>Finish</button>` : ""}</div>`;
        if (installing) {
          const bar = w.body.querySelector(".bar i"), m = w.body.querySelector("[data-m]");
          const msgs = ["Copying files that were already here…", "Registering with the registry…", "Installing the toolbar you didn't ask for…", "Creating shortcut to shortcut…"];
          for (let p = 0; p <= 100; p += 4) { if (!wins.has("installer")) return; bar.style.width = p + "%"; m.textContent = msgs[Math.min(3, Math.floor(p / 26))]; await sleep(90); }
          const dir = nodeAt(["Downloads"]);
          const nm = "setup(" + (dir.c.filter(x => /^setup\(\d+\)\.exe/.test(x.n)).length + 1) + ").exe";
          if (!dir.c.some(x => x.n === nm)) { dir.c.push(F(nm, "📦", "", { app: "installer" })); fsChanged(); }
          discover("installer");
          step++; render();
        }
      }
      w.body.addEventListener("click", async e => {
        if (e.target.closest("[data-next]")) { step++; render(); }
        if (e.target.closest("[data-done]")) close("installer");
        if (e.target.closest("[data-cancel]")) {
          const r = await dialog("❓", "Are you sure you want to cancel Setup?<br>Setup will be sad.", ["Don't cancel", "Cancel Setup"]);
          if (r === 1) { close("installer"); notify("📦", "Setup cancelled", "Setup has been cancelled. It will be back. Setups always come back."); }
        }
      });
      render();
    }
  };

  /* ---------- Budgetsweeper ---------- */
  APPS.sweeper = {
    g: "💣", name: "Budgetsweeper",
    run() {
      const N = 8, M = 10;
      const EXPENSES = ["A subscription you forgot about", "Surprise car repair", "Wedding season", "'Small' Diwali shopping", "Phone screen (again)", "Annual fee, in a month nobody expected", "Chai, cumulatively", "Delivery fee on a ₹40 order", "Gym membership (unused)", "Friend's 'quick' trip"];
      const w = createWin("sweeper", "Budgetsweeper", "", { w: 420, h: 560, icon: "💣" });
      let grid, opened, flags, over, first, flagMode = false;
      function reset() { grid = Array(N * N).fill(0); opened = new Set(); flags = new Set(); over = false; first = true; render(); }
      const nb = i => { const r = Math.floor(i / N), c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && cc >= 0 && rr < N && cc < N) o.push(rr * N + cc); } return o; };
      function place(safe) {
        const banned = new Set([safe, ...nb(safe)]);
        let k = 0;
        while (k < M) { const i = rand(0, N * N - 1); if (grid[i] !== -1 && !banned.has(i)) { grid[i] = -1; k++; } }
        for (let i = 0; i < N * N; i++) if (grid[i] !== -1) grid[i] = nb(i).filter(j => grid[j] === -1).length;
      }
      function flood(i) {
        const st = [i];
        while (st.length) { const j = st.pop(); if (opened.has(j) || flags.has(j)) continue; opened.add(j); if (grid[j] === 0) nb(j).forEach(x => !opened.has(x) && st.push(x)); }
      }
      function render(msg = "") {
        const COL = ["", "#64d2ff", "#30d158", "#ff9f0a", "#bf5af2", "#ff453a", "#ff375f", "#ffd60a", "#fff"];
        w.body.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px"><span class="muted" style="font-size:12px">Avoid ${M} hidden expenses</span><span><button class="tb${flagMode ? " on" : ""}" data-flag>🚩 Flag</button> <button class="tb" data-new>New month</button></span></div>
          <div class="sweep">${grid.map((v, i) => { const o = opened.has(i); const t = o ? (v === -1 ? "💸" : v || "") : flags.has(i) ? "🚩" : ""; return `<button class="sc${o ? " open" : ""}${o && v === -1 ? " boom" : ""}" data-i="${i}" style="color:${COL[v] || "#fff"}">${t}</button>`; }).join("")}</div>
          <p style="text-align:center;min-height:40px" class="muted">${msg}</p>`;
      }
      function tap(i, flag) {
        if (over || opened.has(i)) return;
        if (flag) { flags.has(i) ? flags.delete(i) : flags.add(i); return render(); }
        if (flags.has(i)) return;
        if (first) { place(i); first = false; }
        if (grid[i] === -1) {
          over = true; grid.forEach((v, j) => { if (v === -1) opened.add(j); });
          sound("error"); discover("sweeper-lose");
          return render(`💸 Unexpected expense: <b>${esc(pick(EXPENSES))}</b>.<br>Budget status: aspirational.`);
        }
        flood(i); sound("click");
        if (opened.size === N * N - M) { over = true; sound("win"); discover("sweeper"); return render("✅ Budget balanced! Nobody has ever done this. Auditors are suspicious."); }
        render();
      }
      w.body.addEventListener("click", e => {
        if (e.target.closest("[data-new]")) return reset();
        if (e.target.closest("[data-flag]")) { flagMode = !flagMode; return render(); }
        const c = e.target.closest("[data-i]");
        if (c && !justLongPressed(w.body)) tap(+c.dataset.i, flagMode);
      });
      onMenu(w.body, tg => { const c = tg.closest("[data-i]"); if (c) tap(+c.dataset.i, true); });
      reset();
    }
  };

  /* ---------- Discoveries ---------- */
  APPS.discoveries = {
    g: "🏆", name: "Discoveries",
    run() {
      const w = createWin("discoveries", "Discoveries", "", { w: 600, h: 520, icon: "🏆" });
      function render() {
        const r = rank(), n = found();
        w.body.innerHTML = `<div class="card"><b>${esc(r.name)}</b><br><span class="muted" style="font-size:12px">${n} of ${DISC.length} discovered${r.nextName ? ` · ${r.next} more until “${esc(r.nextName)}”` : " · Nothing left. Not even dignity."}</span><div class="bar"><i style="width:${n / DISC.length * 100}%"></i></div></div>
          <div class="disc-grid">${DISC.map(d => S.disc[d[0]] ? `<div class="disc"><div class="g">${d[1]}</div><b>${esc(d[2])}</b><small>Found ${new Date(S.disc[d[0]]).toLocaleDateString()}</small></div>` : `<div class="disc lock"><div class="g">❔</div><b>???</b><small>${esc(d[3])}</small></div>`).join("")}</div>`;
      }
      w.on("discover", render);
      render();
    }
  };

  /* =========================================================
     13. Launcher
     ========================================================= */
  function open(id, arg) {
    hideStart(); hideCtx();
    if (!id || !APPS[id]) return;
    if (wins.has(id) && (arg === undefined || !APPS[id].multi)) { wins.get(id).el.classList.remove("min"); focus(id); return; }
    APPS[id].run(arg);
  }

  /* =========================================================
     14. Desktop
     ========================================================= */
  const DESK_APPS = ["experiments", "explorer", "notes", "terminal", "mail", "browser", "printer", "important", "trash", "donotopen"];
  function renderDesk() {
    const dn2 = (nodeAt(["Desktop"]) || { c: [] }).c;
    const u = unread();
    desk.innerHTML = DESK_APPS.map(id => `<div class="ico" data-app="${id}" tabindex="0"><div class="g">${APPS[id].g}${id === "mail" && u ? `<i class="badge">${u}</i>` : ""}</div><span>${esc(APPS[id].name)}</span></div>`).join("") +
      dn2.map(n => `<div class="ico" data-node="${esc(n.n)}" tabindex="0"><div class="g">${n.g}</div><span>${esc(n.n)}</span></div>`).join("");
  }
  function openIco(ico) {
    if (ico.dataset.app) open(ico.dataset.app);
    else if (ico.dataset.node) openNode(["Desktop", ico.dataset.node]);
  }
  desk.addEventListener("click", e => {
    if (justLongPressed(desk)) return;
    const ico = e.target.closest(".ico");
    desk.querySelectorAll(".ico").forEach(x => x.classList.toggle("sel", x === ico));
    if (ico && isTouch) openIco(ico);
  });
  desk.addEventListener("dblclick", e => { const ico = e.target.closest(".ico"); if (ico) openIco(ico); });
  desk.addEventListener("keydown", e => { const ico = e.target.closest(".ico"); if (ico && e.key === "Enter") openIco(ico); });
  onMenu(desk, (tg, x, y) => {
    const ico = tg.closest(".ico");
    if (ico && ico.dataset.node) {
      const p = ["Desktop", ico.dataset.node], n = nodeAt(p);
      if (n) fileMenu(p, n, x, y);
      return;
    }
    if (ico && ico.dataset.app) {
      const a = APPS[ico.dataset.app];
      return showCtx(x, y, [
        ["📂 Open", () => open(ico.dataset.app)],
        ["ℹ️ Properties", () => dialog(a.g, `<b>${esc(a.name)}</b><br>Shortcut. Target: somewhere.<br>Opinions: many.`, ["OK"], a.name + " — Properties")]
      ]);
    }
    showCtx(x, y, [
      ["🔄 Refresh", () => { desk.classList.remove("blink"); void desk.offsetWidth; desk.classList.add("blink"); notify("🔄", "Refreshed", gag("refresh")); }],
      ["📁 New folder", () => fsNew(["Desktop"])],
      ["↕️ Sort icons", () => notify("↕️", "Sorted", gag("sort"))],
      "-",
      ["🖼️ Change wallpaper", () => open("settings")],
      ["💻 Open Terminal here", () => open("terminal")],
      ["🏆 Discoveries", () => open("discoveries")],
      "-",
      ["ℹ️ Properties", () => dialog("🖥️", `<b>Desktop</b><br>Icons: ${desk.children.length}<br>Organisation: optimistic<br>Background: ${S.wall === 5 ? "pending landlord approval" : "premium gradient"}`, ["OK"], "Desktop — Properties")]
    ]);
  });
  on("fs", renderDesk);

  /* =========================================================
     15. Start menu
     ========================================================= */
  const START_APPS = ["explorer", "mail", "browser", "terminal", "notes", "printer", "support", "taskmgr", "settings", "calc", "paint", "calendar", "music", "update", "antivirus", "sweeper", "discoveries", "experiments", "about", "trash"];
  function hideStart() { startMenu.classList.remove("show"); startBtn.classList.remove("on"); }
  function renderStart() {
    startMenu.innerHTML = `<div class="sm-user"><div class="av">AK</div><div><b>Animesh Kherwar</b><small>${esc(rank().name)} · ${found()}/${DISC.length}</small></div></div>
      <input class="sm-q" placeholder="Search apps, files, regrets" aria-label="Search" autocomplete="off">
      <div class="sm-grid" data-grid></div>
      <div class="sm-foot"><button class="sm-item" data-sys="signout">👤 Sign out</button><button class="sm-item" data-sys="restart">🔁 Restart</button><button class="sm-item" data-sys="shutdown">⏻ Shut down</button></div>`;
    const grid = startMenu.querySelector("[data-grid]"), q = startMenu.querySelector(".sm-q");
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      const apps = START_APPS.filter(id => !s || APPS[id].name.toLowerCase().includes(s) || id.includes(s));
      const files = s ? flatten().filter(([, n]) => n.n.toLowerCase().includes(s)).slice(0, 6) : [];
      grid.innerHTML = apps.map(id => `<button class="sm-app" data-open="${id}"><b>${APPS[id].g}</b>${esc(APPS[id].name)}</button>`).join("") +
        files.map(([p, n]) => `<button class="sm-app" data-file="${esc(p.join("/"))}"><b>${n.g}</b>${esc(n.n)}</button>`).join("") +
        (!apps.length && !files.length ? `<div class="sm-empty">No results for “${esc(q.value)}”.<br>Your request has been forwarded to the Department of ${esc(q.value)}.</div>` : "");
    };
    q.addEventListener("input", draw);
    q.addEventListener("keydown", e => { if (e.key === "Enter") { const f = grid.querySelector("button"); if (f) f.click(); } });
    draw();
    if (!isTouch) setTimeout(() => q.focus(), 50);
  }
  startBtn.addEventListener("click", e => {
    e.stopPropagation();
    const show = !startMenu.classList.contains("show");
    if (show) renderStart();
    startMenu.classList.toggle("show", show); startBtn.classList.toggle("on", show);
    sound("click");
  });
  startMenu.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.open) open(b.dataset.open);
    if (b.dataset.file) openNode(b.dataset.file.split("/"));
    if (b.dataset.sys === "shutdown") shutdown();
    if (b.dataset.sys === "restart") { hideStart(); reboot("You asked nicely"); }
    if (b.dataset.sys === "signout") { hideStart(); dialog("👤", "You can't sign out.<br>You never signed in.", ["Huh"]); }
  });
  os.addEventListener("pointerdown", e => {
    if (!e.target.closest("#startmenu") && !e.target.closest("#start")) hideStart();
    if (!e.target.closest("#ctx")) hideCtx();
  });

  /* =========================================================
     16. Tray & clock
     ========================================================= */
  function tick() {
    const d = new Date();
    $("#clock").innerHTML = `${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<br><span class="d">${d.toLocaleDateString([], { day: "2-digit", month: "short" })}</span>`;
  }
  tick(); setInterval(tick, 15000);
  document.querySelector(".tray").addEventListener("click", e => {
    const b = e.target.closest("[data-tray]");
    if (!b) return;
    const t = b.dataset.tray;
    if (t === "clock") return open("calendar");
    if (t === "full") return toggleFull();
    notify(b.textContent, { wifi: "Wi‑Fi", battery: "Battery", volume: "Volume" }[t], gag(t));
  });
  function toggleFull() {
    const on2 = !os.classList.contains("full");
    os.classList.toggle("full", on2);
    document.body.style.overflow = on2 ? "hidden" : "";
    $("#fullBtn").textContent = on2 ? "🗗" : "⛶";
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && os.classList.contains("full") && !wins.size) toggleFull(); });

  /* =========================================================
     17. Desktop duck
     ========================================================= */
  const DUCK = ["Quack. (That's a hint, in duck.)", "Have you checked the Trash? I live near it.", "The printer scares me too.", "I'm a rubber duck. Explain your problem to me.", "Properties. Always check properties.", "Some folders are shy. Settings can help.", "I once ended excuses.exe. HR called.", "Try the Terminal. Type something rude. Or 'xyzzy'.", "Quack quack. (Translation: drink water.)"];
  let duckClicks = 0, duckTimer = null;
  function petInit() {
    clearInterval(duckTimer);
    if (!S.pet || S.boring) { pet.classList.add("hide"); return; }
    pet.classList.remove("hide");
    duckTimer = setInterval(() => {
      if (S.motion || document.hidden) return;
      const max = os.clientWidth - 50;
      const cur = pet.offsetLeft, nx = rand(10, max);
      pet.classList.toggle("flip", nx > cur);
      pet.style.left = nx + "px";
    }, 9000);
  }
  pet.addEventListener("click", e => {
    e.stopPropagation();
    duckClicks++;
    const say = pet.querySelector(".say");
    say.textContent = duckClicks >= 5 && !S.disc.duck ? "Okay okay. You win. 🦆" : (Math.random() < .4 ? "💡 " + hintLine() : pick(DUCK));
    say.classList.add("show");
    clearTimeout(say._t); say._t = setTimeout(() => say.classList.remove("show"), 4200);
    sound("pop");
    if (duckClicks >= 5) discover("duck");
  });

  /* =========================================================
     18. Screensaver, Konami, ambient gags
     ========================================================= */
  let lastInput = Date.now(), saverRaf = null;
  const wake = () => { lastInput = Date.now(); if (saver.classList.contains("show")) { saver.classList.remove("show"); cancelAnimationFrame(saverRaf); } };
  ["pointerdown", "keydown", "pointermove", "wheel", "touchstart"].forEach(ev => os.addEventListener(ev, wake, { passive: true }));
  document.addEventListener("keydown", wake);
  function startSaver() {
    if (S.boring || offEl.classList.contains("show") || boot.classList.contains("show")) return;
    saver.classList.add("show");
    const logo = saver.querySelector(".logo");
    let x = 20, y = 20, vx = 1.4, vy = 1.1, hue = 210;
    const step = () => {
      const W = saver.clientWidth - logo.offsetWidth, H = saver.clientHeight - logo.offsetHeight;
      x += vx; y += vy;
      let hx = false, hy = false;
      if (x <= 0 || x >= W) { vx *= -1; x = Math.max(0, Math.min(W, x)); hx = true; }
      if (y <= 0 || y >= H) { vy *= -1; y = Math.max(0, Math.min(H, y)); hy = true; }
      if (hx || hy) { hue = (hue + 67) % 360; logo.style.background = `hsl(${hue} 90% 60%)`; }
      if ((hx && (y < 6 || y > H - 6)) || (hy && (x < 6 || x > W - 6))) { discover("corner"); }
      logo.style.transform = `translate(${x}px, ${y}px)`;
      if (saver.classList.contains("show")) saverRaf = requestAnimationFrame(step);
    };
    if (S.motion) logo.style.transform = "translate(20px, 20px)"; else step();
  }
  setInterval(() => {
    if (document.hidden) return;
    const idle = Date.now() - lastInput;
    if (idle > 75000 && !saver.classList.contains("show")) startSaver();
  }, 5000);
  setInterval(() => {
    if (document.hidden || S.boring || saver.classList.contains("show")) return;
    if (Date.now() - lastInput > 60000) return;
    if (chance(.12)) notify("💭", "Laboratory OS", gag("ambient"), 5000);
  }, 30000);
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kpos = 0;
  document.addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) {
      kpos = 0; discover("konami");
      if (!S.motion) { os.classList.add("party"); setTimeout(() => os.classList.remove("party"), 6000); }
      notify("🎮", "Cheat activated", "+30 lives. Lives are not used anywhere in this OS.");
    }
  });

  /* =========================================================
     19. Boot
     ========================================================= */
  applyLook();
  renderDesk();
  petInit();
  (async function init() {
    const now = new Date();
    const prevLast = S.last;
    S.visits++; S.last = Date.now(); save();
    if (now.getHours() < 5) discover("night");
    const firstVisit = S.visits === 1;
    if (!sessionStorage.getItem("lab.os2.booted")) {
      sessionStorage.setItem("lab.os2.booted", "1");
      await reboot(null);
    }
    if (firstVisit) {
      dialog("👋", `Welcome to <b>Laboratory OS</b>.<br>It's premium. Nothing works properly.<br><br><small class="muted">${isTouch ? "Tap icons to open. Long-press for more options." : "Double-click icons. Right-click everything. Windows can be dragged and resized."}</small>`, ["Let's go"]);
    } else {
      if (prevLast && new Date(prevLast).toDateString() !== now.toDateString()) { discover("return"); deliver("ret"); }
      notify("👋", "Welcome back, " + rank().name, S.reason ? `Reason for last restart: ${S.reason}.` : `${found()} of ${DISC.length} discoveries found.`, 5000);
    }
  })();
})();
