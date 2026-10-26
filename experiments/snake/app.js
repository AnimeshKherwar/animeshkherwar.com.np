<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Snake, Escalated — Animesh Kherwar's Lab</title>
  <meta name="theme-color" content="#08090a">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧪</text></svg>">
  <link rel="stylesheet" href="../../assets/css/lab.css">
  <style>
    .sn { display: grid; grid-template-columns: minmax(0, 580px) minmax(0, 1fr); gap: clamp(20px, 4vw, 44px); align-items: start; }
    .board-wrap { position: relative; width: 100%; aspect-ratio: 1; border-radius: 20px; overflow: hidden; border: 1px solid var(--line-2, #2c313a); background: #060708; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    canvas#board { display: block; width: 100%; height: 100%; }

    /* Overlay screens */
    .ov { position: absolute; inset: 0; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(6,7,8,.88); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); color: #f5f5f7; }
    .ov.hide { display: none; }
    .ov-in { width: 100%; max-width: 440px; text-align: center; margin: auto; }
    .ov-logo { font-size: 44px; line-height: 1; }
    .ov h2 { margin: 8px 0 12px; font-size: clamp(24px, 5.5vw, 40px); letter-spacing: -0.04em; color: #f5f5f7; }
    .ov h3 { margin: 16px 0 8px; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: #a1a1a6; font-weight: 600; }
    .ov-d { margin: 10px 0 14px; color: #c7c7cc; font-size: 14px; line-height: 1.45; min-height: 20px; }
    .modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 8px; }
    .mode { display: grid; gap: 3px; justify-items: center; padding: 10px 6px; border-radius: 14px; border: 1px solid #2c313a; background: #15181d; color: #f5f5f7; cursor: pointer; font: inherit; }
    .mode .mg { font-size: 24px; line-height: 1.1; }
    .mode b { font-size: 13px; font-weight: 600; }
    .mode small { font-size: 11px; color: #a1a1a6; font-family: var(--mono, monospace); }
    .mode:hover { background: #1c2027; }
    .mode.on { border-color: #b8f23a; background: #1b2412; box-shadow: 0 0 0 1px #b8f23a inset; }
    .sb { appearance: none; -webkit-appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 42px; padding: 0 16px; border-radius: 12px; border: 1px solid #3a404b; background: #262a31; color: #ffffff; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; text-shadow: none; }
    .sb:hover { background: #313641; }
    .sb.pri { background: #b8f23a; border-color: #b8f23a; color: #0b0d07; }
    .sb.pri:hover { background: #c9ff52; }
    .sb.big { width: 100%; min-height: 50px; font-size: 16px; border-radius: 14px; }
    .sb:focus-visible, .mode:focus-visible { outline: 3px solid #ffd60a; outline-offset: 2px; }
    .ov-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
    .ov-row .sb { flex: 1; min-width: 96px; }
    .res { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 4px 0 14px; }
    .res div { background: #15181d; border: 1px solid #2c313a; border-radius: 12px; padding: 10px 4px; }
    .res b { display: block; font-size: 22px; letter-spacing: -0.03em; color: #f5f5f7; }
    .res span { font-family: var(--mono, monospace); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #a1a1a6; }
    .nb { display: inline-block; margin-bottom: 12px; padding: 5px 12px; border-radius: 999px; background: #ffd60a; color: #1d1d1f; font-weight: 700; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
    .skins { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; text-align: left; }
    .skin { border-radius: 14px; border: 1px solid #2c313a; background: #15181d; color: #f5f5f7; padding: 10px; cursor: pointer; font: inherit; text-align: left; }
    .skin i { display: block; height: 16px; border-radius: 8px; margin-bottom: 8px; }
    .skin b { display: block; font-size: 13px; }
    .skin small { display: block; font-size: 11px; color: #a1a1a6; margin-top: 2px; line-height: 1.35; }
    .skin.on { border-color: #b8f23a; box-shadow: 0 0 0 1px #b8f23a inset; }
    .skin.lock { opacity: .55; cursor: not-allowed; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; text-align: left; }
    .stats div { background: #15181d; border: 1px solid #2c313a; border-radius: 10px; padding: 8px 10px; font-size: 12px; color: #a1a1a6; }
    .stats b { display: block; font-size: 17px; color: #f5f5f7; }
    .trophies { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; text-align: left; }
    .tro { background: #15181d; border: 1px solid #2c313a; border-radius: 10px; padding: 8px 10px; font-size: 12px; color: #f5f5f7; }
    .tro small { display: block; color: #a1a1a6; font-size: 11px; margin-top: 2px; line-height: 1.35; }
    .tro.lock { opacity: .5; }
    .legend { display: grid; gap: 6px; text-align: left; }
    .legend div { display: flex; gap: 10px; align-items: center; background: #15181d; border: 1px solid #2c313a; border-radius: 10px; padding: 8px 10px; font-size: 13px; color: #e5e5ea; }
    .legend span { font-size: 20px; width: 26px; text-align: center; flex: none; }
    .pausebtn { position: absolute; top: 10px; right: 10px; width: 38px; height: 38px; border-radius: 12px; border: 1px solid #3a404b; background: rgba(21,24,29,.8); color: #fff; font-size: 13px; cursor: pointer; z-index: 2; }
    .pausebtn[hidden] { display: none; }

    /* Side */
    .hud { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .hud .panel { min-width: 0; }
    .hud .panel b { display: block; font-size: 26px; letter-spacing: -0.04em; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hud .panel span { font-family: var(--mono, monospace); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted, #a1a1a6); }
    .combo { margin-top: 8px; }
    .cb-top { display: flex; justify-content: space-between; align-items: baseline; }
    .cb-top span { font-family: var(--mono, monospace); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted, #a1a1a6); }
    .cb-top b { font-size: 20px; letter-spacing: -0.03em; }
    .cbar { height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; margin-top: 8px; }
    .cbar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #b8f23a, #ffd60a, #ff6b3d); transition: width .12s linear; }
    .eating { margin-top: 8px; display: flex; align-items: center; gap: 14px; }
    .eating .g { font-size: 36px; width: 60px; height: 60px; flex: none; display: grid; place-items: center; border-radius: 18px; background: rgba(184,242,58,.1); border: 1px solid rgba(184,242,58,.25); }
    .eating b { display: block; font-size: 19px; letter-spacing: -0.02em; }
    .eating span { font-size: 13px; color: var(--muted, #a1a1a6); }
    .fx { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; min-height: 34px; }
    .chip { position: relative; overflow: hidden; display: inline-flex; gap: 6px; align-items: center; padding: 6px 10px; border-radius: 999px; background: #15181d; border: 1px solid #2c313a; font-size: 12.5px; color: #f5f5f7; }
    .chip i { position: absolute; left: 0; bottom: 0; height: 2px; background: #b8f23a; }
    .menu { margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
    .menu.hide { display: none; }
    .menu i { font-style: normal; font-size: 20px; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; border: 1px solid var(--line, #22262d); filter: grayscale(1); opacity: .35; transition: all .3s; }
    .menu i.on { filter: none; opacity: 1; border-color: var(--line-2, #2c313a); }
    .menu i.lock { filter: blur(3px) grayscale(1); }
    .keys-hint { margin-top: 14px; font-family: var(--mono, monospace); font-size: 12px; color: var(--dim, #8e8e93); line-height: 1.6; }
    .dpad { display: none; margin: 14px auto 0; width: 220px; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .dpad button { height: 60px; border-radius: 16px; border: 1px solid var(--line-2, #2c313a); background: rgba(255,255,255,.06); color: #fff; font-size: 22px; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
    .dpad button:active { background: rgba(184,242,58,.3); }
    .dpad .u { grid-column: 2; } .dpad .l { grid-column: 1; grid-row: 2; } .dpad .d { grid-column: 2; grid-row: 2; } .dpad .r { grid-column: 3; grid-row: 2; }
    body.is-touch .dpad { display: grid; }
    body.is-touch .keys-hint { display: none; }
    @media (pointer: coarse) { .dpad { display: grid; } .keys-hint { display: none; } }
    @media (max-width: 820px) {
      .sn { grid-template-columns: 1fr; gap: 12px; }
      .side { order: -1; }
      .hud { gap: 6px; }
      .hud .panel { padding: 10px 10px; }
      .hud .panel b { font-size: 18px; }
      .hud .panel span { font-size: 9px; letter-spacing: .06em; }
      .combo { padding: 8px 12px; }
      .cb-top b { font-size: 16px; }
      .cbar { margin-top: 6px; }
      .eating { padding: 8px 12px; gap: 10px; }
      .eating .g { width: 40px; height: 40px; font-size: 24px; border-radius: 12px; }
      .eating b { font-size: 15px; }
      .eating span { font-size: 12px; }
      .fx { min-height: 0; }
      .menu, .keys-hint { display: none !important; }
      .ov { padding: 12px; }
      .ov-logo { font-size: 34px; }
      .modes { grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .mode { padding: 8px 4px; }
      .mode .mg { font-size: 20px; }
      .mode b { font-size: 12px; }
      .mode small { font-size: 10px; }
      .ov-d { font-size: 13px; margin: 8px 0 10px; }
      .res b { font-size: 18px; }
    }
    @media (max-width: 380px) { .dpad { width: 190px; } .dpad button { height: 54px; } }
  </style>
</head>
<body data-root="../../" data-exp="009">
  <div data-lab-header></div>
  <section data-lab-hero></section>
  <main class="wrap">
    <section class="stage">
      <div class="sn">
        <div>
          <div class="board-wrap" id="wrap">
            <canvas id="board" aria-label="Snake board"></canvas>
            <button class="pausebtn" id="pauseBtn" aria-label="Pause" hidden>❚❚</button>
            <div class="ov" id="ov"></div>
          </div>
          <div class="dpad" id="dpad">
            <button class="u" data-dir="up" aria-label="Up">▲</button>
            <button class="l" data-dir="left" aria-label="Left">◀</button>
            <button class="d" data-dir="down" aria-label="Down">▼</button>
            <button class="r" data-dir="right" aria-label="Right">▶</button>
          </div>
        </div>
        <div class="side">
          <div class="hud">
            <div class="panel"><b id="score">0</b><span>Score</span></div>
            <div class="panel"><b id="best">0</b><span>Best</span></div>
            <div class="panel"><b id="len">3</b><span>Length</span></div>
            <div class="panel"><b id="mstat">—</b><span id="mlbl">Tier</span></div>
          </div>
          <div class="panel combo">
            <div class="cb-top"><span>Combo</span><b id="combo">×1</b></div>
            <div class="cbar"><i id="cbar"></i></div>
          </div>
          <div class="panel eating">
            <div class="g" id="eatG">🍎</div>
            <div><b id="eatN">Apple</b><span id="eatC">A healthy start. It won't last.</span></div>
          </div>
          <div class="fx" id="fx"></div>
          <div class="menu" id="menu"></div>
          <div class="keys-hint">Arrow keys / WASD to move · Space or P to pause · Esc for menu<br>Eat quickly to build combos. Grab power-ups before they vanish.</div>
        </div>
      </div>
    </section>
  </main>
  <nav data-lab-pager></nav>
  <script src="../../assets/js/registry.js"></script>
  <script src="../../assets/js/lab.js"></script>
  <script src="app.js"></script>
</body>
</html>
