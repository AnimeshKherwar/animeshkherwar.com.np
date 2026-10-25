/* Experiment 006 — Coin Flip 3000
   The coin spins in slow motion for exactly as long as the analysis text takes. */
(function () {
  "use strict";
  const { store, unlock, sound, pick, rand, sleep } = window.LAB;
  const coin = document.getElementById("coin");
  const zone = document.getElementById("zone");
  const log = document.getElementById("log");
  const result = document.getElementById("result");
  const btn = document.getElementById("flip");

  let angle = 0, busy = false;
  let stats = store.get("coin.stats", { h: 0, t: 0, last: null, streak: 0, flips: 0 });

  function paintStats() {
    document.getElementById("sh").textContent = stats.h;
    document.getElementById("st").textContent = stats.t;
    document.getElementById("ss").textContent = stats.last ? `${stats.streak}× ${stats.last}` : "—";
  }

  function fairCoin() {
    const a = new Uint8Array(1);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return (a[0] & 1) === 0 ? "HEADS" : "TAILS";
  }

  async function flip() {
    if (busy) return;
    busy = true; btn.disabled = true;
    result.textContent = ""; result.classList.remove("pop");
    log.innerHTML = "";

    const outcome = fairCoin();
    const lines = [
      "Initialising quantum decision engine...",
      `Calibrating thumb torque <b>(${(Math.random() * 2 + 3).toFixed(2)} N·m)</b>...`,
      `Estimating atmospheric interference <b>(${rand(2, 9)}% chaos)</b>...`,
      "Consulting ancient probability models...",
      "Negotiating terms with gravity...",
      "Entering slow motion for dramatic effect...",
      `Running <b>${rand(10, 99)},${rand(100, 999)}</b> simulations...`,
      "<b>✓</b> Simulation complete."
    ];
    const step = 780;                          // ms per line
    const airTime = lines.length * step + 300; // coin stays airborne until text finishes

    // Spin target: many slow rotations, landing on the correct face
    const base = angle - (angle % 360);
    const target = base + 360 * 5 + (outcome === "TAILS" ? 180 : 0);
    zone.classList.add("air");
    sound("pop");
    const anim = coin.animate([
      { transform: `translateY(0) rotateX(${angle}deg) scale(1)` },
      { transform: `translateY(-38%) rotateX(${angle + (target - angle) * 0.18}deg) scale(1.08)`, offset: 0.12, easing: "linear" },
      { transform: `translateY(-46%) rotateX(${angle + (target - angle) * 0.86}deg) scale(1.12)`, offset: 0.9, easing: "ease-in" },
      { transform: `translateY(0) rotateX(${target}deg) scale(1)` }
    ], { duration: airTime, easing: "linear", fill: "forwards" });

    for (const l of lines) {
      const d = document.createElement("div");
      d.className = "l";
      d.innerHTML = "› " + l;
      log.appendChild(d);
      sound("click");
      await sleep(step);
    }
    await anim.finished.catch(() => {});
    angle = target;
    coin.style.transform = `rotateX(${angle}deg)`;
    anim.cancel();
    zone.classList.remove("air");

    sound("thud");
    if (navigator.vibrate) navigator.vibrate(40);
    result.textContent = outcome;
    void result.offsetWidth; result.classList.add("pop");

    if (outcome === "HEADS") stats.h++; else stats.t++;
    stats.streak = stats.last === outcome ? stats.streak + 1 : 1;
    stats.last = outcome;
    stats.flips++;
    store.set("coin.stats", stats);
    paintStats();

    const after = document.createElement("div");
    after.className = "l muted";
    after.textContent = pick([
      "Confidence: 50.00%. Peer review pending.",
      "Result is final. Unless you flip again. Which you will.",
      "The universe has spoken. Quietly. Ambiguously.",
      "Margin of error: ±1 coin."
    ]);
    log.appendChild(after);
    if (stats.flips >= 10) unlock("flip-10");
    busy = false; btn.disabled = false;
    btn.textContent = "🪙 Flip again";
  }

  btn.addEventListener("click", flip);
  paintStats();
})();
