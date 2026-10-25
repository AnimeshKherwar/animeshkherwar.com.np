/* Experiment 002 — The Useless Calculator (maths is always correct) */
(function () {
  "use strict";
  const { store, unlock, sound, pick } = window.LAB;
  const out = document.getElementById("out");
  const expr = document.getElementById("expr");
  const says = document.getElementById("says");
  const sub = document.getElementById("sub");
  const keys = document.getElementById("keys");
  const nCalcEl = document.getElementById("nCalc");
  const nEasyEl = document.getElementById("nEasy");

  let cur = "0", prev = null, op = null, fresh = false, lastOpBtn = null;
  let stats = store.get("calc.stats", { calc: 0, easy: 0 });

  const OPS = {
    "+": (a, b) => a + b,
    "−": (a, b) => a - b,
    "×": (a, b) => a * b,
    "÷": (a, b) => a / b
  };

  function fmt(x) {
    if (!isFinite(x)) return "Error";
    const clean = parseFloat(x.toPrecision(12));
    if (Math.abs(clean) >= 1e15 || (Math.abs(clean) > 0 && Math.abs(clean) < 1e-9)) return clean.toExponential(6);
    return String(clean);
  }
  function pretty(s) {
    if (s === "Error" || s.includes("e")) return s;
    const [i, d] = s.split(".");
    const neg = i.startsWith("-");
    const int = Number(neg ? i.slice(1) : i).toLocaleString("en-US");
    return (neg ? "-" : "") + int + (d !== undefined ? "." + d : "");
  }
  function paint() {
    const text = pretty(cur);
    out.textContent = text;
    const len = text.length;
    out.style.fontSize = len > 14 ? "30px" : len > 11 ? "38px" : len > 8 ? "48px" : "";
    document.querySelectorAll(".key.op").forEach(k => k.classList.toggle("on", k === lastOpBtn && fresh));
  }
  function comment(text, small) {
    says.textContent = text;
    says.classList.remove("pop"); void says.offsetWidth; says.classList.add("pop");
    sub.textContent = small || "";
  }

  function digit(d) {
    if (cur === "Error") cur = "0";
    if (fresh) { cur = "0"; fresh = false; }
    if (d === "." && cur.includes(".")) return;
    if (cur.replace(/[-.]/g, "").length >= 12) return;
    cur = cur === "0" && d !== "." ? d : cur + d;
    paint();
  }
  function setOp(o, btnEl) {
    if (cur === "Error") return;
    if (op && !fresh) compute(false);
    prev = parseFloat(cur);
    op = o; fresh = true; lastOpBtn = btnEl || null;
    expr.textContent = `${pretty(fmt(prev))} ${o}`;
    paint();
  }
  function compute(final) {
    if (op === null || prev === null) return;
    const a = prev, b = parseFloat(cur);
    const r = OPS[op](a, b);
    if (final) {
      expr.textContent = `${pretty(fmt(a))} ${op} ${pretty(fmt(b))} =`;
      react(a, op, b, r);
    }
    cur = fmt(r);
    prev = null; op = null; fresh = true; lastOpBtn = null;
    paint();
  }

  function react(a, o, b, r) {
    stats.calc++;
    const res = pretty(fmt(r));
    const small = (x) => Number.isInteger(x) && Math.abs(x) <= 12;
    const easy = (small(a) && small(b) && o !== "÷") || b === 0 && o !== "÷" || (o === "×" && (a === 1 || b === 1 || a === 10 || b === 10));

    if (o === "÷" && b === 0) {
      sound("error");
      unlock("calc-zero");
      comment("No. Absolutely not.", "Division by zero has been reported to the Department of Mathematics.");
    } else if (a === 1 && b === 1 && o === "+") {
      stats.easy++;
      unlock("calc-basic");
      comment("It's 2. It has always been 2.", "I'm going to need a moment.");
    } else if (easy) {
      stats.easy++;
      comment(pick([
        `${res}. I can't believe you needed me for this.`,
        `${res}. You had fingers. You had ten of them.`,
        `${res}. I trained my whole life for this moment and it's this?`,
        `${res}. Please tell nobody you asked.`,
        `${res}. A primary school student just felt a disturbance.`
      ]), "Answer verified. Self-respect not verified.");
    } else if (Math.abs(r) >= 1e9) {
      comment(`${res}. Impressive. Pointless, but impressive.`, "What exactly are you budgeting for?");
    } else if (!Number.isInteger(r)) {
      comment(pick([
        `${res}. Decimals. How very brave of you.`,
        `${res}. Precisely. Annoyingly precise.`,
        `${res}. I rounded nothing. You're welcome.`
      ]), "Floating point handled with extreme reluctance.");
    } else if (r === 42) {
      comment("42. The answer to everything.", "Still not the answer to why you're here.");
    } else if (r === 69 || r === 420) {
      comment(`${res}. Mature.`, "I'm choosing to ignore that.");
    } else {
      comment(pick([
        `According to my calculations: ${res}.`,
        `${res}. Please have this independently verified.`,
        `${res}. Don't make it weird.`,
        `${res}. That one was actually fair.`,
        `${res}. Final answer. Unlike your life choices.`
      ]), pick(["Accuracy: 100%. Enthusiasm: 3%.", "Computed in 0.0001s. Regretted for much longer.", "Mathematically correct. Emotionally unavailable."]));
    }
    store.set("calc.stats", stats);
    nCalcEl.textContent = stats.calc;
    nEasyEl.textContent = stats.easy;
  }

  function action(a) {
    if (a === "clear") { cur = "0"; prev = null; op = null; fresh = false; lastOpBtn = null; expr.innerHTML = "&nbsp;"; paint(); }
    if (a === "sign" && cur !== "Error" && cur !== "0") { cur = cur.startsWith("-") ? cur.slice(1) : "-" + cur; paint(); }
    if (a === "pct" && cur !== "Error") { cur = fmt(parseFloat(cur) / 100); paint(); }
    if (a === "eq") compute(true);
  }

  keys.addEventListener("click", e => {
    const k = e.target.closest(".key");
    if (!k) return;
    sound("click");
    if (k.dataset.d) digit(k.dataset.d);
    else if (k.dataset.op) setOp(k.dataset.op, k);
    else action(k.dataset.a);
  });

  const KEYMAP = { "+": "+", "-": "−", "*": "×", "x": "×", "/": "÷" };
  document.addEventListener("keydown", e => {
    let btn = null;
    if (/^[0-9.]$/.test(e.key)) { digit(e.key); btn = keys.querySelector(`[data-d="${e.key}"]`); }
    else if (KEYMAP[e.key]) { btn = keys.querySelector(`[data-op="${KEYMAP[e.key]}"]`); setOp(KEYMAP[e.key], btn); }
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); action("eq"); btn = keys.querySelector('[data-a="eq"]'); }
    else if (e.key === "Escape" || e.key === "Delete") { action("clear"); btn = keys.querySelector('[data-a="clear"]'); }
    else if (e.key === "%") { action("pct"); btn = keys.querySelector('[data-a="pct"]'); }
    else if (e.key === "Backspace") {
      if (!fresh && cur !== "Error") { cur = cur.length > 1 && !(cur.length === 2 && cur.startsWith("-")) ? cur.slice(0, -1) : "0"; paint(); }
    }
    if (btn) { btn.classList.add("flash"); setTimeout(() => btn.classList.remove("flash"), 120); }
  });

  nCalcEl.textContent = stats.calc;
  nEasyEl.textContent = stats.easy;
  paint();
})();
