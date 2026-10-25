/* =========================================================
   ANIMESH KHERWAR'S LAB — REGISTRY
   Single source of truth for experiments and achievements.
   To add an experiment: add an entry to LAB_EXPERIMENTS and
   create /experiments/<slug>/index.html (+ app.js).
   ========================================================= */

window.LAB_EXPERIMENTS = [
  {
    id: "001", slug: "the-button", title: "The Button", icon: "🔴",
    tagline: "One instruction. Universally ignored.",
    blurb: "A beautiful red button you should absolutely not press.",
    device: "all", accent: "#ff4d4d"
  },
  {
    id: "002", slug: "useless-calculator", title: "The Useless Calculator", icon: "🧮",
    tagline: "Mathematically correct. Emotionally unhelpful.",
    blurb: "Flawless arithmetic, delivered with visible disappointment.",
    device: "all", accent: "#ff9f0a"
  },
  {
    id: "003", slug: "excuse-generator", title: "Excuse Generator", icon: "📝",
    tagline: "Accountability, professionally avoided.",
    blurb: "Industrial-grade excuses for work, lateness and silence.",
    device: "all", accent: "#bf5af2"
  },
  {
    id: "004", slug: "overthinking-machine", title: "Overthinking Machine", icon: "🧠",
    tagline: "Turning nothing into something since today.",
    blurb: "Submit a harmless situation. Receive a full crisis report.",
    device: "all", accent: "#64d2ff"
  },
  {
    id: "005", slug: "catch-me", title: "Catch Me", icon: "🖱️",
    tagline: "A comprehensive test of human patience.",
    blurb: "A button with a strong sense of self-preservation.",
    device: "desktop", accent: "#30d158"
  },
  {
    id: "006", slug: "coin-flip-3000", title: "Coin Flip 3000", icon: "🪙",
    tagline: "Fifty-fifty, with unnecessary rigour.",
    blurb: "A quantum-grade, slow-motion, cinematically excessive coin toss.",
    device: "all", accent: "#ffd60a"
  },
  {
    id: "007", slug: "laboratory-os", title: "Laboratory OS", icon: "🪟",
    tagline: "An operating system nobody asked for.",
    blurb: "A tiny desktop with real windows and one folder you must not open.",
    device: "all", accent: "#0a84ff"
  },
  {
    id: "008", slug: "hacker-mode", title: "Hacker Mode", icon: "🕵️",
    tagline: "Hollywood-grade hacking. Zero actual hacking.",
    blurb: "Enter any Instagram ID. Witness an extremely serious breach.",
    device: "all", accent: "#32d74b"
  },
  {
    id: "009", slug: "snake", title: "Snake, Escalated", icon: "🐍",
    tagline: "It starts with an apple. It does not end with one.",
    blurb: "Classic Snake with a progressively unreasonable diet.",
    device: "all", accent: "#a8ff3e"
  }
];

/* secret: true -> shown as ??? in the Passport until unlocked */
window.LAB_ACHIEVEMENTS = [
  { id: "welcome",        icon: "🧪", title: "Lab Access Granted",        desc: "Entered the Lab for the first time." },
  { id: "curious",        icon: "🔍", title: "Curiosity Killed Productivity", desc: "Opened 5 different experiments." },
  { id: "completionist",  icon: "🗺️", title: "Full Tour",                 desc: "Opened every experiment in the Lab." },
  { id: "logo-tapper",    icon: "👆", title: "Persistent Clicker",         desc: "Clicked the Lab logo 7 times.", secret: true },
  { id: "konami",         icon: "🎮", title: "Old Habits",                 desc: "Entered a very old code.", secret: true },

  { id: "button-25",      icon: "🚫", title: "I Was Specifically Told Not To", desc: "Pressed The Button 25 times." },
  { id: "button-deal",    icon: "🤝", title: "Diplomat",                   desc: "Negotiated with a button." },
  { id: "button-100",     icon: "💯", title: "Centurion",                  desc: "Pressed The Button 100 times.", secret: true },
  { id: "calc-basic",     icon: "🤦", title: "Outsourced Thinking",        desc: "Asked a calculator for 1 + 1." },
  { id: "calc-zero",      icon: "♾️", title: "Forbidden Arithmetic",       desc: "Tried dividing by zero." },
  { id: "excuse-worst",   icon: "🔥", title: "Beyond Saving",              desc: "Made an excuse as bad as it gets." },
  { id: "overthinker",    icon: "🌀", title: "Certified Overthinker",      desc: "Ran a full crisis analysis on nothing." },
  { id: "caught-it",      icon: "🏁", title: "Unreasonably Persistent",    desc: "Actually caught the button." },
  { id: "flip-10",        icon: "🪙", title: "Probability Enthusiast",     desc: "Flipped the coin 10 times." },
  { id: "do-not-open",    icon: "💥", title: "Warnings Are Suggestions",   desc: "Opened the folder labelled DO NOT OPEN." },
  { id: "final-final",    icon: "📁", title: "FINAL_v2_FINAL",             desc: "Reached the bottom of Definitely Important.", secret: true },
  { id: "hacker",         icon: "🕶️", title: "Ethical Hacker",            desc: "Completed a deeply fake breach." },
  { id: "snake-sap",      icon: "🗄️", title: "Ate the Server",             desc: "Reached the SAP Server stage in Snake." }
];
