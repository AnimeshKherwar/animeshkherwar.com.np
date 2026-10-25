/* Experiment 005 — Catch Me (desktop only) */
(function () {
  "use strict";
  const { store, unlock, sound, pick, isTouch } = window.LAB;
  if (isTouch) return;

  const arena = document.getElementById("arena");
  const runner = document.getElementById("runner");
  const taunt = document.getElementById("taunt");
  const escEl = document.getElementById("escapes");
  const bestEl = document.getElementById("best");
  const win = document.getElementById("win");

  const TAUNTS = [
    "Too slow.", "That wasn't even close.", "I'm beginning to understand your problem.",
    "Have you tried being faster?", "Nope.", "I can do this all day.", "Is your mouse okay?",
    "Wheeee.", "Personal space, please.", "You're getting warmer. Not really.",
    "My grandma clicks faster.", "Embarrassing. For you.", "I've seen glaciers with better reflexes."
  ];
  const TIRED = ["I'm getting tired...", "Okay, slow down... I need a minute...", "My legs... I don't have legs, but still..."];

  let x = 0, y = 0, escapes = 0, tired = false, done = false;
  let best = store.get("catch.best", null);
  bestEl.textContent = best ? best + " escapes" : "—";

  function bounds() {
    const a = arena.getBoundingClientRect();
    return { w: a.width - runner.offsetWidth - 24, h: a.height - runner.offsetHeight - 70, a };
  }
  function moveTo(nx, ny) {
    const b = bounds();
    x = Math.max(12, Math.min(b.w, nx));
    y = Math.max(50, Math.min(b.h, ny));
    runner.style.transform = `translate(${x}px, ${y}px)`;
  }
  function center() { const b = bounds(); moveTo(b.w / 2, b.h / 2); }

  function say(t) { taunt.textContent = t; taunt.classList.remove("pop"); void taunt.offsetWidth; taunt.classList.add("pop"); }

  function flee(mx, my) {
    const b = bounds();
    // Try several random spots, keep the one farthest from the cursor
    let bestSpot = null, bestD = -1;
    for (let i = 0; i < 8; i++) {
      const tx = 12 + Math.random() * (b.w - 12), ty = 50 + Math.random() * (b.h - 50);
      const d = Math.hypot(tx + runner.offsetWidth / 2 - mx, ty + runner.offsetHeight / 2 - my);
      if (d > bestD) { bestD = d; bestSpot = [tx, ty]; }
    }
    if (tired) {
      // short, sluggish hops
      const dx = (bestSpot[0] - x), dy = (bestSpot[1] - y);
      moveTo(x + dx * 0.25, y + dy * 0.25);
    } else moveTo(bestSpot[0], bestSpot[1]);

    escapes++;
    escEl.textContent = escapes;
    sound("pop");
    if (escapes % 4 === 0) say(pick(TAUNTS));
    if (escapes === 45) { tired = true; runner.classList.add("tired"); say(pick(TIRED)); }
    if (tired && escapes % 6 === 0) say(pick(TIRED));
  }

  arena.addEventListener("mousemove", e => {
    if (done) return;
    const a = arena.getBoundingClientRect();
    const mx = e.clientX - a.left, my = e.clientY - a.top;
    const cx = x + runner.offsetWidth / 2, cy = y + runner.offsetHeight / 2;
    const radius = tired ? 46 : 110;
    if (Math.hypot(mx - cx, my - cy) < radius) flee(mx, my);
  });

  runner.addEventListener("click", e => {
    if (done) return;
    if (e.detail === 0) { say("Keyboard? Cheating detected. Use the mouse like an adult."); sound("error"); return; }
    done = true;
    runner.classList.add("caught");
    sound("win");
    if (!best || escapes < best) { best = escapes; store.set("catch.best", best); bestEl.textContent = best + " escapes"; }
    document.getElementById("winText").textContent =
      escapes < 10 ? `Only ${escapes} escapes. Suspiciously skilled.` : `It escaped ${escapes} times. Persistence: concerning.`;
    win.classList.add("show");
    unlock("caught-it");
  });

  document.getElementById("again").addEventListener("click", () => {
    done = false; tired = false; escapes = 0; escEl.textContent = 0;
    runner.classList.remove("tired", "caught");
    win.classList.remove("show");
    center();
    say("Round two. I've been training.");
  });

  window.addEventListener("resize", center);
  requestAnimationFrame(center);
})();
