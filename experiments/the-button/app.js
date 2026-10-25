/* Experiment 001 — The Button */
(function () {
  "use strict";
  const { store, unlock, sound, pick } = window.LAB;
  const btn = document.getElementById("bigRed");
  const bezel = document.getElementById("bezel");
  const msg = document.getElementById("msg");
  const countEl = document.getElementById("count");
  const deal = document.getElementById("deal");
  const warn = document.getElementById("warn");

  let n = store.get("button.count", 0);
  let dealDone = store.get("button.deal", false);

  const LINES = {
    1: "Seriously?",
    2: "Okay. I'm moving.",
    3: "That was a clear instruction.",
    4: "You have read the label, yes?",
    5: "Stop shaking things.",
    6: "I am a button of very few words, and they were DO NOT PRESS.",
    7: "Thala for a reason!",
    8: "Fine. I'll make myself smaller.",
    9: "Can you even see me now?",
    10: "You found me. Unbelievable.",
    11: "Back to full size. Against my will.",
    12: "Do you treat all instructions like this?",
    13: "Unlucky number. For you.",
    14: "Now I'm blue. Are you happy?",
    15: "I've reported you to the system.",
    16: "The system did not care.",
    18: "I'm starting to think you like me.",
    20: "Twenty. Twenty presses. Twenty.",
    21: "Red again. Blue wasn't me.",
    25: "Achievement unlocked. Disappointment also unlocked.",
    30: "I've started writing a memoir about this.",
    33: "Chapter 1: The Finger.",
    40: "My lawyer will be in touch.",
    42: "The answer to everything. Still pressing, though.",
    50: "Okay. Let's make a deal.",
    60: "I have accepted my fate.",
    69: "Hehe, nice!.",
    75: "Three quarters of a hundred. Don't you dare.",
    77: "Thala for another season!"
    90: "Ten more and something happens. Probably.",
    99: "One more. Think carefully about who you've become.",
    100: "100. You absolute legend. You absolute menace.",
    101: "There's nothing after 100. I promise.",
    150: "I lied. There's also nothing at 150.",
    404: "Motivation not found.",
    500: "Internal button error.",
    1000: "One thousand. Please go outside."
  };
  const FILLER = [
    "Still no.", "Why are you like this?", "Each press costs me a little more.",
    "I can feel that, you know.", "Have you tried not pressing?", "Press logged.",
    "Remarkable consistency. Wrong direction.", "Your persistence is noted. Not praised.",
    "This is fine.", "I'm not mad. I'm just pressed.", "Okay.", "…"
  ];

  function say(text) {
    msg.textContent = text;
    msg.classList.remove("pop"); void msg.offsetWidth; msg.classList.add("pop");
  }

  function placeRandom() {
    const max = Math.min(window.innerWidth * 0.28, 160);
    bezel.style.translate = `${(Math.random() * 2 - 1) * max}px ${(Math.random() * 2 - 1) * 50}px`;
  }

  function applyState() {
    countEl.textContent = n.toLocaleString();
    btn.classList.toggle("tiny", n >= 8 && n <= 10);
    bezel.classList.toggle("tiny", n >= 8 && n <= 10);
    btn.classList.toggle("blue", n >= 14 && n <= 20);
    if (!(n >= 2 && n <= 4)) bezel.style.translate = "0 0";
  }

  function confetti() {
    const colors = ["#d7ff3a", "#ff4d4d", "#64d2ff", "#ffd60a", "#bf5af2"];
    for (let i = 0; i < 90; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 2 + "s";
      c.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  }

  function press() {
    n++;
    store.set("button.count", n);
    sound("click");
    if (navigator.vibrate) navigator.vibrate(12);

    say(LINES[n] || pick(FILLER));
    applyState();

    if (n >= 2 && n <= 4) placeRandom();
    if (n === 5 || n === 40) { document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 550); sound("thud"); }
    if (n === 15) { warn.classList.add("show"); sound("error"); }
    if (n === 25) unlock("button-25");
    if (n === 50 && !dealDone) deal.classList.add("show");
    if (n === 51 && !dealDone) { deal.classList.remove("show"); say("Deal rejected by force. Rude."); }
    if (n === 100) { unlock("button-100"); confetti(); }
  }

  btn.addEventListener("click", press);
  document.getElementById("warnOk").addEventListener("click", () => { warn.classList.remove("show"); say("Good. Now walk away slowly."); });
  document.getElementById("warnPress").addEventListener("click", () => { warn.classList.remove("show"); press(); say("You pressed the 'press it anyway' button. Of course you did."); });
  document.getElementById("dealYes").addEventListener("click", () => {
    dealDone = true; store.set("button.deal", true);
    deal.classList.remove("show");
    say(pick([
      "Deal. Here's your compliment: you have excellent taste in buttons.",
      "Deal. Compliment: your clicking technique is genuinely elite.",
      "Deal. Compliment: you'd make a terrifying QA tester."
    ]));
    unlock("button-deal");
  });
  document.getElementById("dealNo").addEventListener("click", () => { deal.classList.remove("show"); press(); });

  // Initial state for returning visitors
  applyState();
  if (n > 0) say(n >= 100 ? "Welcome back, Centurion." : `Welcome back. We're at ${n}. Don't make it ${n + 1}.`);
})();
