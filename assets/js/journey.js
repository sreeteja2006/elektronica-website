// Home page hero: a scroll-driven zoom into a circuit, drawn in code.
//
// Five layers, each 1000 x 1000 local units with (0,0) at the centre:
//   0 board -> 1 package -> 2 die -> 3 transistor layout -> 4 channel cross-section
// The central 100 x 100 square of every layer is the thing the next layer
// fills, so each step is a 10x zoom (4 steps = 10,000x). Scroll sets Z in
// [0,4]; layer i is drawn at scale 10^(Z - i). A teal signal enters every
// layer at the left-middle and runs towards the centre.

const M = 10;
const LAYERS = 5;
const NAMES = ["Board", "Package", "Die", "Transistor", "Signal"];
const C = {
  bg0: "#0e1113",
  body: "#161a1c",
  panel: "#1e2326",
  line: "#2a3034",
  line2: "#3b4348",
  mute: "#7d878d",
  light: "#a3acb1",
  sig: "#62b8c4",
  sigHi: "#8fd0d9",
  die: "#0b0d0e",
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A polyline we can stroke, and slice by fraction for travelling pulses.
function route(pts) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) {
    len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = len[len.length - 1];
  const at = (f) => {
    const d = Math.min(Math.max(f, 0), 1) * total;
    let i = 1;
    while (i < pts.length - 1 && len[i] < d) i++;
    const k = (d - len[i - 1]) / (len[i] - len[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, i];
  };
  return { pts, len, total, at };
}

function strokeRoute(g, r, w, color, alpha = 1) {
  g.beginPath();
  r.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.lineWidth = w;
  g.strokeStyle = color;
  g.globalAlpha = alpha;
  g.lineJoin = "round";
  g.stroke();
  g.globalAlpha = 1;
}

// A bright pulse with a short tail running along a route.
function pulse(g, r, f, px) {
  const f0 = Math.max(0, f - 0.08);
  const a = r.at(f0);
  const b = r.at(f);
  g.beginPath();
  g.moveTo(a[0], a[1]);
  for (let i = a[2]; i < b[2]; i++) g.lineTo(r.pts[i][0], r.pts[i][1]);
  g.lineTo(b[0], b[1]);
  g.lineWidth = 2.5 * px;
  g.strokeStyle = C.sigHi;
  g.globalAlpha = 0.85;
  g.lineCap = "round";
  g.stroke();
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(b[0], b[1], 3.2 * px, 0, Math.PI * 2);
  g.fillStyle = C.sigHi;
  g.fill();
}

function drawSignal(g, r, t, px, speed = 0.18) {
  strokeRoute(g, r, 6 * px, C.sig, 0.14);
  strokeRoute(g, r, 1.6 * px, C.sig, 0.95);
  pulse(g, r, (t * speed) % 1, px);
  pulse(g, r, (t * speed + 0.5) % 1, px);
}

function text(g, str, x, y, px, color, align = "center") {
  g.font = `${13 * px}px "IBM Plex Sans", ui-sans-serif, sans-serif`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(str, x, y);
}

// ---------------------------------------------------------------- layers

// 0: printed circuit board with a QFP chip, fan-out traces and passives.
const R0 = route([[-500, 0], [-68, 0]]);
function layer0(g, px, t) {
  g.fillStyle = C.bg0;
  g.fillRect(-500, -500, 1000, 1000);

  for (const [x, y] of [[-440, -260], [440, -260], [-440, 260], [440, 260]]) {
    g.beginPath();
    g.arc(x, y, 16, 0, Math.PI * 2);
    g.fillStyle = C.die;
    g.fill();
    g.lineWidth = 3 * px;
    g.strokeStyle = C.line2;
    g.stroke();
    g.beginPath();
    g.arc(x, y, 30, 0, Math.PI * 2);
    g.lineWidth = 1 * px;
    g.strokeStyle = C.line;
    g.stroke();
  }

  // Fan-out traces on all four sides (the left pin at y = 0 is the signal).
  for (let side = 0; side < 4; side++) {
    g.save();
    g.rotate((side * Math.PI) / 2);
    for (let k = -5; k <= 5; k++) {
      if (side === 0 && k === 0) continue;
      const y = k * 8;
      const yt = y * 4;
      const bend = 90 + Math.abs(yt - y);
      g.beginPath();
      g.moveTo(-60, y);
      g.lineTo(-90, y);
      g.lineTo(-bend, yt);
      g.lineTo(-500, yt);
      g.lineWidth = 3 * (k % 2 ? 1 : 1.2);
      g.strokeStyle = C.line2;
      g.lineJoin = "round";
      g.stroke();
    }
    // Pins
    for (let k = -5; k <= 5; k++) {
      g.fillStyle = side === 0 && k === 0 ? C.sig : C.mute;
      g.fillRect(-68, k * 8 - 2, 18, 4);
    }
    g.restore();
  }

  // Vias and passives sitting on the traces.
  for (const sy of [-1, 1]) {
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(sx * 400, sy * 96, 6, 0, Math.PI * 2);
      g.fillStyle = C.bg0;
      g.fill();
      g.lineWidth = 1.5 * px;
      g.strokeStyle = C.mute;
      g.stroke();
      g.fillStyle = C.bg0;
      g.fillRect(sx * 300 - 9, sy * 96 - 5, 18, 10);
      g.lineWidth = 1.5 * px;
      g.strokeStyle = C.mute;
      g.strokeRect(sx * 300 - 9, sy * 96 - 5, 18, 10);
    }
  }

  // The chip.
  g.fillStyle = C.body;
  g.fillRect(-50, -50, 100, 100);
  g.lineWidth = 2 * px;
  g.strokeStyle = C.line2;
  g.strokeRect(-50, -50, 100, 100);
  g.beginPath();
  g.arc(-38, -38, 3, 0, Math.PI * 2);
  g.fillStyle = C.mute;
  g.fill();

  drawSignal(g, R0, t, px, 0.22);
}

// 1: the package opened up: lead fingers, bond wires, paddle and die.
const R1 = route([[-500, 0], [-330, 0], [-52, 0]]);
function layer1(g, px, t) {
  g.fillStyle = C.body;
  g.fillRect(-500, -500, 1000, 1000);
  g.lineWidth = 2 * px;
  g.strokeStyle = C.line2;
  g.strokeRect(-500, -500, 1000, 1000);

  g.fillStyle = C.panel;
  g.fillRect(-90, -90, 180, 180);
  g.lineWidth = 1.5 * px;
  g.strokeStyle = C.line2;
  g.strokeRect(-90, -90, 180, 180);

  for (let side = 0; side < 4; side++) {
    g.save();
    g.rotate((side * Math.PI) / 2);
    for (let k = -5; k <= 5; k++) {
      if (side === 0 && k === 0) continue;
      const y = k * 80;
      g.fillStyle = C.line;
      g.fillRect(-500, y - 14, 170, 28);
      g.lineWidth = 1.5 * px;
      g.strokeStyle = C.line2;
      g.strokeRect(-500, y - 14, 170, 28);
      // PCB-style wire: straight, one 45° bend, straight into the die. Each side's
      // wires stay inside its quarter (|y| < |x|), so the corner pins (|k| = 5)
      // have no room and are left unbonded, as on a real package.
      const a = Math.abs(k);
      if (a === 5) continue;
      const s = Math.sign(k);
      const d = 50 - 10 * a; // the diagonal is y = -x - d (mirrored for k < 0)
      g.beginPath();
      g.moveTo(-330, y);
      g.lineTo(-80 * a - d, y);
      g.lineTo(-52, s * (52 - d));
      g.lineWidth = 1.4 * px;
      g.strokeStyle = C.mute;
      g.stroke();
    }
    g.restore();
  }
  g.fillStyle = C.line;
  g.fillRect(-500, -14, 170, 28);
  g.lineWidth = 1.5 * px;
  g.strokeStyle = C.line2;
  g.strokeRect(-500, -14, 170, 28);

  g.fillStyle = C.die;
  g.fillRect(-50, -50, 100, 100);
  g.lineWidth = 1.5 * px;
  g.strokeStyle = C.line2;
  g.strokeRect(-50, -50, 100, 100);

  drawSignal(g, R1, t, px, 0.2);
}

// 2: the die: pad ring, power ring, memory blocks, rows of logic cells.
const R2 = route([[-500, 0], [-330, 0], [-298, -32], [-170, -32], [-138, 0], [-50, 0]]);
const CELLS = (() => {
  const r = rng(7);
  const cells = [];
  for (let y = -340; y < 340; y += 20) {
    let x = -340;
    while (x < 340) {
      const w = 14 + Math.floor(r() * 5) * 8;
      if (r() > 0.18) cells.push([x, y, Math.min(w, 340 - x) - 2, 17, r()]);
      x += w;
    }
  }
  return cells;
})();
function layer2(g, px, t) {
  g.fillStyle = C.die;
  g.fillRect(-500, -500, 1000, 1000);

  g.lineWidth = 12;
  g.strokeStyle = C.line;
  g.strokeRect(-376, -376, 752, 752);

  for (let side = 0; side < 4; side++) {
    g.save();
    g.rotate((side * Math.PI) / 2);
    for (let k = -5; k <= 5; k++) {
      g.fillStyle = side === 0 && k === 0 ? C.sig : C.line2;
      g.fillRect(-480, k * 80 - 20, 40, 40);
    }
    g.restore();
  }

  for (const c of CELLS) {
    if (Math.abs(c[0] + c[2] / 2) < 130 && Math.abs(c[1]) < 130) continue;
    g.fillStyle = c[4] > 0.5 ? "#13181a" : "#171c1e";
    g.fillRect(c[0], c[1], c[2], c[3]);
  }
  g.lineWidth = 1 * px;
  g.strokeStyle = C.line;
  for (const [x, y, w, h] of [[-300, -330, 220, 130], [80, -330, 220, 130], [-300, 200, 220, 130], [80, 200, 220, 130]]) {
    g.fillStyle = "#101416";
    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
    for (let i = 1; i < 8; i++) {
      g.beginPath();
      g.moveTo(x, y + (h / 8) * i);
      g.lineTo(x + w, y + (h / 8) * i);
      g.stroke();
    }
  }

  g.lineWidth = 1 * px;
  g.strokeStyle = C.sig;
  g.globalAlpha = 0.4;
  g.strokeRect(-50, -50, 100, 100);
  g.globalAlpha = 1;

  drawSignal(g, R2, t, px, 0.2);
}

// 3: a transistor in plan view: diffusion, gate poly, contacts, metal.
const R3 = route([[-500, 0], [-50, 0]]);
function layer3(g, px, t) {
  g.fillStyle = C.bg0;
  g.fillRect(-500, -500, 1000, 1000);

  g.fillStyle = "#1a2023";
  g.fillRect(-380, -110, 760, 220);
  g.lineWidth = 1.5 * px;
  g.strokeStyle = C.line2;
  g.strokeRect(-380, -110, 760, 220);
  g.fillStyle = "rgba(98,184,196,0.07)";
  g.fillRect(-380, -110, 345, 220);
  g.fillRect(35, -110, 345, 220);

  for (const sx of [-1, 1]) {
    g.fillStyle = "rgba(163,172,177,0.14)";
    g.fillRect(sx * 250 - 55, -150, 110, 300);
    g.strokeStyle = C.line2;
    g.strokeRect(sx * 250 - 55, -150, 110, 300);
    for (const y of [-70, 0, 70]) {
      g.fillStyle = C.mute;
      g.fillRect(sx * 250 - 12, y - 12, 24, 24);
    }
  }

  g.fillStyle = C.line2;
  g.fillRect(-35, -260, 70, 520);
  g.lineWidth = 1.5 * px;
  g.strokeStyle = C.light;
  g.strokeRect(-35, -260, 70, 520);
  g.fillStyle = C.mute;
  g.fillRect(-14, -240, 28, 28);

  text(g, "Gate", 0, -285, px, C.mute);
  text(g, "Source", -250, 185, px, C.mute);
  text(g, "Drain", 250, 185, px, C.mute);

  drawSignal(g, R3, t, px, 0.2);
}

// 4: cross-section through the channel with electrons moving source -> drain.
const ELECTRONS = (() => {
  const r = rng(21);
  return Array.from({ length: 150 }, () => ({ u: r(), j: r() * 2 - 1, v: 0.7 + r() * 0.6 }));
})();
function channelY(x) {
  if (x < -300) return 52 * 0 - 52 * smooth(-500, -300, x);
  if (x > 300) return -52 * (1 - smooth(300, 500, x));
  return -52;
}
function layer4(g, px, t) {
  g.fillStyle = C.bg0;
  g.fillRect(-500, -500, 1000, 1000);

  g.fillStyle = "#13181a";
  g.fillRect(-500, -60, 1000, 560);
  g.lineWidth = 1 * px;
  g.strokeStyle = C.line;
  for (let y = -20; y < 500; y += 60) {
    g.beginPath();
    g.moveTo(-500, y);
    g.lineTo(500, y);
    g.stroke();
  }
  // source and drain
  g.fillStyle = "rgba(98,184,196,0.16)";
  g.strokeStyle = "rgba(98,184,196,0.5)";
  g.lineWidth = 1.5 * px;
  for (const [x0, x1] of [[-500, -300], [300, 500]]) {
    g.fillRect(x0, -60, x1 - x0, 110);
    g.strokeRect(x0, -60, x1 - x0, 110);
  }
  // oxide and gate
  g.fillStyle = C.line;
  g.fillRect(-350, -80, 700, 20);
  g.fillStyle = C.line2;
  g.fillRect(-350, -190, 700, 110);
  g.strokeStyle = C.light;
  g.strokeRect(-350, -190, 700, 110);
  // metal contacts
  g.fillStyle = C.mute;
  g.fillRect(-470, -140, 80, 80);
  g.fillRect(390, -140, 80, 80);

  text(g, "Gate", 0, -135, px, C.light);
  text(g, "Oxide", 0, -70, px, C.mute);
  text(g, "Source", -400, 110, px, C.sig);
  text(g, "Drain", 400, 110, px, C.sig);
  text(g, "p-type silicon", 0, 300, px, C.mute);

  g.fillStyle = C.sigHi;
  for (const e of ELECTRONS) {
    const u = (e.u + t * 0.1 * e.v) % 1;
    const x = -500 + u * 1000;
    const inCh = x > -300 && x < 300;
    const y = channelY(x) + e.j * (inCh ? 3 : 20) + (inCh ? 0 : 0);
    g.globalAlpha = 0.9;
    g.beginPath();
    g.arc(x, y, 3 * px * 1.4, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

const DRAW = [layer0, layer1, layer2, layer3, layer4];

// ---------------------------------------------------------------- driver

export function initJourney({ gsap, ScrollTrigger, reduced }) {
  const section = document.querySelector("[data-journey]");
  if (!section) return;
  const stage = section.querySelector("[data-stage]");
  const canvas = section.querySelector("[data-canvas]");
  const copy = section.querySelector("[data-hero-copy]");
  const scrim = section.querySelector("[data-scrim]");
  const hudStep = section.querySelector("[data-hud-step]");
  const hudName = section.querySelector("[data-hud-name]");
  const hudZoom = section.querySelector("[data-hud-zoom]");
  const hudZoomWrap = section.querySelector("[data-hud-zoomwrap]");
  const hudHint = section.querySelector("[data-hud-hint]");
  const g = canvas.getContext("2d");

  const state = { z: 0 };
  let W = 0, H = 0, dpr = 1, visible = true, dirty = true;

  function resize() {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    dirty = true;
  }

  function draw(t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = C.bg0;
    g.fillRect(0, 0, canvas.width, canvas.height);
    const U = Math.max(W, H) / 1000;
    const z = state.z;
    for (let i = 0; i < LAYERS; i++) {
      const s = Math.pow(M, z - i);
      if (s < 0.02) break;
      if (i < LAYERS - 1 && Math.pow(M, z - i - 1) >= 1) continue; // child covers the screen
      const k = s * U;
      g.save();
      g.setTransform(k * dpr, 0, 0, k * dpr, (W / 2) * dpr, (H / 2) * dpr);
      g.beginPath();
      g.rect(-500, -500, 1000, 1000);
      g.clip();
      g.globalAlpha = i === 0 ? 1 : smooth(0.1, 0.7, s);
      DRAW[i](g, 1 / k, t);
      g.restore();
    }
  }

  function hud() {
    const z = state.z;
    const i = Math.min(LAYERS - 1, Math.round(z));
    hudStep.textContent = `0${i + 1} / 05`;
    hudName.textContent = NAMES[i];
    const started = z > 0.04;
    hudHint.classList.toggle("hidden", started);
    hudZoomWrap.classList.toggle("hidden", !started);
    hudZoom.textContent = Math.round(Math.pow(M, z)).toLocaleString("en-US");
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    ScrollTrigger.refresh();
  });

  if (reduced) {
    // Still picture of the board, no pinning, no motion.
    draw(0);
    hud();
    return;
  }

  new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(stage);

  const navH = () => document.querySelector("header")?.offsetHeight || 0;
  gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: () => `top ${navH()}px`,
      end: () => `+=${Math.round(window.innerHeight * 1.25)}`, // short pin: the full zoom takes ~1 screen of scroll
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  })
    .to(state, { z: LAYERS - 1, ease: "none", duration: 1, onUpdate: () => (dirty = true) }, 0)
    .to(copy, { autoAlpha: 0, y: -50, ease: "none", duration: 0.07 }, 0.01)
    .to(scrim, { autoAlpha: 0, ease: "none", duration: 0.1 }, 0.02);

  let prevZ = -1;
  gsap.ticker.add((time) => {
    if (!visible) return;
    draw(time);
    if (state.z !== prevZ) {
      prevZ = state.z;
      hud();
    }
  });
}
