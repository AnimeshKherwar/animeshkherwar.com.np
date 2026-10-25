/* Experiment 008 — Hacker Mode (Instagram edition)
   100% theatrical. No network requests. No data stored except the achievement. */
(function () {
  "use strict";
  const { unlock, sound, sleep, esc, toast, pick, rand } = window.LAB;
  const form = document.getElementById("form");
  const input = document.getElementById("handle");
  const go = document.getElementById("go");
  const out = document.getElementById("out");
  const err = document.getElementById("err");
  let busy = false;

  /* ---------- Matrix rain ---------- */
  const cv = document.getElementById("rain");
  const ctx = cv.getContext("2d");
  let cols = [], fs = 14;
  function size() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Array(Math.ceil(r.width / fs)).fill(0).map(() => Math.random() * -50);
  }
  function rain() {
    const w = cv.width, h = cv.height;
    ctx.fillStyle = "rgba(2,4,3,0.12)"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#32d74b"; ctx.font = fs + "px monospace";
    cols.forEach((y, i) => {
      ctx.fillText(String.fromCharCode(0x30a0 + Math.random() * 96), i * fs, y * fs);
      cols[i] = y * fs > cv.clientHeight && Math.random() > 0.975 ? 0 : y + 1;
    });
  }
  size(); window.addEventListener("resize", size);
  setInterval(rain, 60);

  const clock = document.getElementById("hkClock");
  setInterval(() => { clock.textContent = new Date().toISOString().slice(11, 19) + " UTC"; }, 1000);

  /* ---------- Output helpers ---------- */
  function line(html, cls = "") {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    d.innerHTML = html;
    out.appendChild(d);
    return d;
  }
  async function type(text, cls = "", speed = 14) {
    const d = line("", cls + " cursor");
    for (let i = 0; i <= text.length; i++) { d.textContent = text.slice(0, i); await sleep(speed); }
    d.classList.remove("cursor");
    return d;
  }
  async function progress(label, ms = 1600) {
    const d = line("");
    const W = 22;
    for (let p = 0; p <= 100; p += rand(4, 13)) {
      const f = Math.round((Math.min(p, 100) / 100) * W);
      d.innerHTML = `${esc(label)} <span class="bar">[${"█".repeat(f)}${"░".repeat(W - f)}]</span> ${Math.min(p, 100)}%`;
      await sleep(ms / 12);
    }
    d.innerHTML = `${esc(label)} <span class="bar">[${"█".repeat(W)}]</span> 100% <span class="dim">OK</span>`;
    sound("click");
  }
  async function scramble(label, ms = 2200) {
    const d = line("");
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      let s = ""; for (let i = 0; i < 12; i++) s += chars[rand(0, chars.length - 1)];
      d.innerHTML = `${esc(label)} <span class="white">${esc(s)}</span>`;
      await sleep(45);
    }
    d.innerHTML = `${esc(label)} <span class="white">************</span> <span class="dim">(cracked)</span>`;
  }

  /* ---------- The "hack" ---------- */
  async function hack(handle) {
    busy = true; go.disabled = true; input.disabled = true;
    out.innerHTML = "";
    const h = "@" + handle;
    const lower = handle.toLowerCase();

    await type(`> Locating target ${h} ...`);
    await sleep(300);
    line(`  Target acquired. Threat level: <span class="white">mildly online</span>`, "dim");
    await type("> Connecting to Instagram mainframe at 127.0.0.1 ...");
    line("  Connected. (That's your own computer, but let's not dwell on it.)", "dim");

    if (lower.includes("animesh") || lower.includes("kherwar")) {
      await sleep(500);
      sound("error");
      line(`<span class="granted">ACCESS DENIED</span>`);
      line(`<span class="red">The Lab does not hack its own creator. Nice try.</span>`);
      return finish(handle, true);
    }

    await progress("> Bypassing firewall          ");
    await progress("> Disabling 2FA (asking nicely)", 1200);
    await scramble("> Brute-forcing password      ");
    await progress("> Downloading DMs             ", 1400);
    await type("> Deleting traces ... and also a few of your own browser tabs (kidding).", "dim", 10);
    await sleep(300);
    sound("thud");
    line(`<span class="granted">ACCESS GRANTED</span>`);
    await sleep(1600);

    await type(`> Extracting classified intel from ${h}:`);
    const intel = [
      `  Password ............ ************`,
      `  Unsent drafts ....... ${rand(23, 88)} (all of them just say "haha")`,
      `  Most-used emoji ..... ${pick(["💀", "😭", "🙂", "🫠", "😂"])}`,
      `  Screen time ......... ${pick(["concerning", "medically interesting", "yes"])}`,
      `  Same reel rewatched . ${rand(9, 31)} times`,
      `  Secret .............. ${pick(["types 'lol' with a completely straight face", "has 4 drafts of one story, never posted", "still remembers their first password", "follows 3 accounts dedicated to bread"])}`
    ];
    for (const l of intel) { await type(l, "", 8); await sleep(140); }
    if (lower === "instagram") line(`  <span class="red">Note: you just tried to hack Instagram's own account. Bold.</span>`);
    await sleep(1100);
    finish(handle, false);
  }

  function finish(handle, denied) {
    const card = document.createElement("div");
    card.className = "reveal-card";
    card.innerHTML = denied ? `
      <h3>Self-defence protocol engaged. 🛡️</h3>
      <p>Attempting to hack the person who built the hacking tool was, frankly, ambitious.</p>
      <div class="btns"><button class="btn sm dark" data-again>Hack someone else</button></div>` : `
      <h3>Gotcha. 🫵</h3>
      <p><b>Nobody got hacked.</b> @${esc(handle)} is perfectly safe. The only thing compromised today was your moral compass.</p>
      <p>Every “breach” you just watched ran entirely on your own device and contacted exactly zero servers. The intel? Made up. The password? Twelve asterisks. Always has been.</p>
      <div class="btns">
        <button class="btn sm dark" data-again>Hack someone else</button>
        <button class="btn sm ghost" style="color:#111;border-color:#ccc" data-report>Report myself to the authorities</button>
      </div>`;
    out.appendChild(card);
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    sound("pop");
    if (!denied) unlock("hacker");
    card.addEventListener("click", e => {
      if (e.target.closest("[data-again]")) { out.innerHTML = ""; input.value = ""; input.focus(); }
      if (e.target.closest("[data-report]")) toast({ icon: "🚔", kicker: "Report filed", title: "Authorities have responded", text: "Their full response: “lol”." });
    });
    busy = false; go.disabled = false; input.disabled = false;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (busy) return;
    const handle = input.value.trim().replace(/^@+/, "");
    if (!handle) { err.textContent = "> ERROR: No target. Even fake hackers need a target."; sound("error"); return; }
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) { err.textContent = "> ERROR: Instagram IDs only use letters, numbers, periods and underscores."; sound("error"); return; }
    err.textContent = "";
    hack(handle);
  });
})();
