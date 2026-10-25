]/* Experiment 004 — Overthinking Machine */
(function () {
  "use strict";
  const { unlock, sound, pick, rand, sleep, esc } = window.LAB;
  const input = document.getElementById("input");
  const go = document.getElementById("go");
  const cons = document.getElementById("console");
  const report = document.getElementById("report");
  let running = false;

  document.getElementById("presets").addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") { input.value = e.target.textContent; input.focus(); }
  });

  function buildSteps(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lower = text.toLowerCase();
    const punct = (text.match(/[.!?,…]/g) || []);
    const hasEmoji = /\p{Extended_Pictographic}/u.test(text);
    const quoted = (text.match(/[“"']([^”"']+)[”"']/) || [])[1];
    const steps = [
      ["", `Parsing ${words.length} word${words.length === 1 ? "" : "s"}...`],
      ["warn", punct.length ? `Punctuation detected: “${esc(punct.join(" "))}”. Tone: suspicious.` : "No punctuation detected. Tone: deeply suspicious."],
      ["", hasEmoji ? "Emoji detected. Calculating probability of sarcasm..." : "Analysing absence of emoji..."],
      quoted ? ["warn", `Isolating key phrase “${esc(quoted)}”. Rereading it 41 times...`] : ["", "Rereading situation 41 times..."],
      /\bok\b/i.test(lower) ? ["bad", "“ok” identified. No exclamation mark. This is war."] : ["", `Cross-referencing with ${rand(2400, 9800).toLocaleString()} past conversations...`],
      ["", "Replaying the moment in the shower (simulated)..."],
      ["", "Analysing what they meant. And what they meant by that."],
      ["", `Drafting ${rand(9, 23)} possible replies...`],
      ["warn", "Deleting all possible replies..."],
      ["", "Recalling an unrelated embarrassing moment from 2011..."],
      ["bad", "Constructing worst-case scenario..."],
      ["bad", "Constructing worse-case scenario..."],
      ["bad", "Identifying potential diplomatic incident..."],
      ["ok", "✓ Analysis complete. Brain is now awake until 3:00 AM."]
    ];
    return steps;
  }

  async function run() {
    if (running) return;
    const text = input.value.trim();
    if (!text) { input.focus(); input.classList.add("shake"); setTimeout(() => input.classList.remove("shake"), 500); return; }
    running = true; go.disabled = true;
    report.classList.remove("show");
    cons.innerHTML = `<div id="lines"></div><div class="progress"><i id="prog"></i></div>`;
    const lines = document.getElementById("lines");
    const prog = document.getElementById("prog");
    const steps = buildSteps(text);
    for (let i = 0; i < steps.length; i++) {
      const [cls, msg] = steps[i];
      const div = document.createElement("div");
      div.className = "log-line";
      div.innerHTML = `<span class="${cls}">›</span> <span class="${cls}">${msg}</span>`;
      lines.appendChild(div);
      prog.style.width = ((i + 1) / steps.length) * 100 + "%";
      sound("click");
      await sleep(cls === "bad" ? 950 : rand(420, 720));
    }
    await sleep(400);
    document.getElementById("riskLevel").textContent = pick(["CATASTROPHIC", "APOCALYPTIC", "DEFCON 1", "EXTINCTION-LEVEL", "BIBLICAL"]);
    document.getElementById("m1").textContent = rand(91, 100) + "%";
    document.getElementById("m2").textContent = rand(9, 37);
    document.getElementById("m3").textContent = (Math.random() * 0.9 + 0.1).toFixed(1) + "%";
    document.getElementById("rec").textContent = pick([
      "Do absolutely nothing.",
      "Do absolutely nothing. Think about it constantly.",
      "Reply “haha” in 3–5 business days.",
      "Change your name. Move to the mountains.",
      "Drink water. It was fine all along."
    ]);
    report.classList.add("show");
    sound("thud");
    if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
    report.scrollIntoView({ behavior: "smooth", block: "nearest" });
    unlock("overthinker");
    running = false; go.disabled = false;
    go.textContent = "🌀 Overthink it again";
  }

  go.addEventListener("click", run);
  input.addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); });
})();
