/* Experiment 003 — Excuse Generator
   Tiers: 0 = believable, 1 = questionable, 2 = unhinged */
(function () {
  "use strict";
  const { unlock, sound, pick, toast } = window.LAB;

  const DB = {
    "Work": [
      ["I've completed the first draft and I'm doing a final quality check before sharing.",
       "I was blocked on an input from another team. Following up today.",
       "My laptop forced an update right before I could save. Redoing the last part now."],
      ["I finished it, but my laptop decided it was a good time to install 47 updates.",
       "It's done. It's just in a version of Excel that refuses to open.",
       "I was waiting for approval on the approval to start."],
      ["I completed it, but in a parallel universe. That version of me is very proud.",
       "The file achieved sentience and asked for more time. I respect its boundaries.",
       "A pigeon walked across my keyboard and deleted three weeks of work. I've forgiven it. Please do the same."]
    ],
    "Late": [
      ["Traffic was unusually bad today. On my way.",
       "The cab cancelled twice. I'm 10 minutes out.",
       "There was a slight delay at home. Leaving now."],
      ["My alarm and I had a creative disagreement.",
       "I left on time, but time did not leave with me.",
       "Google Maps took me on a scenic route I did not consent to."],
      ["A goat blocked the road and demanded a toll. I paid it emotionally.",
       "I was abducted, briefly, but they returned me on the grounds of being too boring.",
       "I'm not late. Everyone else is early, and frankly that's on them."]
    ],
    "Didn't reply": [
      ["Sorry, this got buried under a few other threads. Replying now.",
       "I saw it while travelling and meant to respond properly.",
       "I wanted to reply with a proper answer, not a rushed one."],
      ["I replied in my head. It was a very good reply.",
       "My phone has been on 2% since Tuesday.",
       "I was waiting for the perfect emoji. It never came."],
      ["I've been on a personal journey of silence. I'm now at the 'replying' stage.",
       "Your message was so good I had it framed. I couldn't reply to a framed message.",
       "Mercury is in retrograde and so, briefly, was I."]
    ],
    "Forgot": [
      ["It completely slipped my mind. Doing it right now.",
       "I had it in my notes but missed the reminder.",
       "I mixed up the dates. Apologies — sorting it today."],
      ["I wrote it down on a very important piece of paper. The paper is now missing.",
       "I set a reminder. The reminder also forgot.",
       "I remembered so hard at one point that I assumed I'd done it."],
      ["I didn't forget. I was strategically testing whether it was needed. It was.",
       "My brain archived it to cold storage. Retrieval takes 6–8 business weeks.",
       "I was cursed by a mildly annoyed wizard. Specifically for this task."]
    ],
    "Technically plausible": [
      ["There was a sync conflict and the latest version didn't save.",
       "The meeting invite went to my spam folder.",
       "My calendar showed it in a different time zone."],
      ["My cache was full. Not my laptop's. Mine.",
       "The tickets are open on my side. The task is in a queue I can't see.",
       "It's pending in a workflow with an approver who left in 2019."],
      ["A cosmic ray flipped a bit in my memory. Specifically the bit that remembered this.",
       "It was a known issue. Known to me. Now known to you.",
       "I followed the process. The process had a process. That process had a meeting."]
    ]
  };
  const TIER = [
    { label: "Plausible", w: 88, c: "#30d158" },
    { label: "Questionable", w: 46, c: "#ffd60a" },
    { label: "Unhinged", w: 6, c: "#ff453a" }
  ];

  const catsEl = document.getElementById("cats");
  const excuseEl = document.getElementById("excuse");
  const bar = document.getElementById("bar");
  const barLabel = document.getElementById("barLabel");

  let cat = "Work", tier = 1, last = "", worseClicks = 0;

  catsEl.innerHTML = Object.keys(DB).map(c => `<button class="cat${c === cat ? " on" : ""}" role="tab" data-c="${c}">${c}</button>`).join("");
  catsEl.addEventListener("click", e => {
    const b = e.target.closest(".cat");
    if (!b) return;
    cat = b.dataset.c;
    catsEl.querySelectorAll(".cat").forEach(x => x.classList.toggle("on", x === b));
    generate();
  });

  function generate(note) {
    const pool = DB[cat][tier].filter(x => x !== last);
    last = pick(pool);
    excuseEl.textContent = note ? `${note} ${last}` : last;
    excuseEl.classList.remove("pop"); void excuseEl.offsetWidth; excuseEl.classList.add("pop");
    const t = TIER[tier];
    bar.style.width = t.w + "%"; bar.style.background = t.c;
    barLabel.textContent = t.label;
    sound("pop");
  }

  document.getElementById("another").addEventListener("click", () => generate());
  document.getElementById("better").addEventListener("click", () => {
    worseClicks = 0;
    if (tier === 0) { generate(); toast({ icon: "🧾", kicker: "Excuse engine", title: "Maximum believability reached", text: "Any more believable and it would just be the truth." }); return; }
    tier--; generate();
  });
  document.getElementById("worse").addEventListener("click", () => {
    if (tier < 2) { tier++; generate(); return; }
    worseClicks++;
    generate(worseClicks > 1 ? "Also," : "");
    if (worseClicks === 1) toast({ icon: "🔥", kicker: "Excuse engine", title: "It cannot get worse", text: "It has, somehow, gotten worse." });
    unlock("excuse-worst");
  });
  document.getElementById("copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(excuseEl.textContent);
      toast({ icon: "📋", kicker: "Copied", title: "Excuse on clipboard", text: "Use responsibly. Or don't. We're not your manager." });
    } catch (e) {
      toast({ icon: "⚠️", kicker: "Clipboard", title: "Couldn't copy", text: "Your browser has its own excuse." });
    }
  });
})();
