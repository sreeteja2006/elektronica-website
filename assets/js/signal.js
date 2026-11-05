// Mission scene: a square wave assembled from sine waves.
//
// A square wave is the sum of odd harmonics: sin(x) + sin(3x)/3 + sin(5x)/5 ...
// As you scroll, more harmonics are added, so the soft sine at the start
// sharpens into a square wave (including the small overshoot at the edges that
// real circuits show, the Gibbs ringing). The mission text lights up word by
// word at the same pace.
//
// Desktop: the scene is pinned and scroll drives everything.
// Mobile: not pinned, scroll position still drives the harmonics.
// Reduced motion: the finished square wave, no animation.

const TAU = Math.PI * 2;
const MAX = 12; // number of harmonics at the end
const ACCENT = "#f08a2a";
const FAINT = "74,68,60"; // ink-500

export function initSignal({ gsap, ScrollTrigger, SplitText, reduced }) {
  const root = document.querySelector("[data-mission]");
  const canvas = root?.querySelector("[data-fourier]");
  if (!root || !canvas) return;
  const ctx = canvas.getContext("2d");
  const nEl = root.querySelector("[data-n]");
  const nS = root.querySelector("[data-n-s]");
  const plate = root.querySelector("[data-plate]");
  const text = root.querySelector("[data-words]");

  const S = { m: reduced ? MAX : 0, phase: 0 };
  let W = 0;
  let H = 0;
  let running = false;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cy = H / 2;
    const amp = H * 0.34;
    const cycles = W < 700 ? 1.5 : 2.5;
    const step = W < 700 ? 4 : 2;

    // Zero line
    ctx.strokeStyle = `rgba(${FAINT},0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(cy) + 0.5);
    ctx.lineTo(W, Math.round(cy) + 0.5);
    ctx.stroke();

    // Weight of each harmonic: it fades in as the scroll position passes it.
    const weights = [];
    for (let j = 0; j < MAX; j++) weights.push(Math.max(0, Math.min(1, S.m + 1 - j)));

    // Individual harmonics, faint.
    for (let j = 1; j < MAX; j++) {
      const w = weights[j];
      if (w <= 0.01) continue;
      const k = 2 * j + 1;
      ctx.beginPath();
      for (let x = 0; x <= W + step; x += step) {
        const t = (x / W) * cycles * TAU - S.phase;
        const yy = cy - ((4 / Math.PI) * w * Math.sin(k * t) * amp) / k;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = `rgba(${FAINT},${0.9 * w})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // The sum.
    ctx.beginPath();
    for (let x = 0; x <= W + step; x += step) {
      const t = (x / W) * cycles * TAU - S.phase;
      let sum = 0;
      for (let j = 0; j < MAX; j++) {
        const w = weights[j];
        if (w <= 0) break;
        const k = 2 * j + 1;
        sum += (w * Math.sin(k * t)) / k;
      }
      const yy = cy - (4 / Math.PI) * sum * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = ACCENT;
    ctx.stroke();

    const n = Math.min(MAX, Math.ceil(S.m) + 1);
    if (nEl && nEl.textContent !== String(n)) nEl.textContent = n;
    if (nS) nS.textContent = n === 1 ? "" : "s";
  }

  const tick = (_t, dt) => {
    S.phase += (dt / 1000) * 0.9; // the wave travels slowly
    draw();
  };
  const start = () => {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    gsap.ticker.remove(tick);
  };

  resize();
  new ResizeObserver(resize).observe(canvas);

  if (reduced) return;

  const split = text ? SplitText.create(text, { type: "words" }) : null;
  const words = split ? split.words : [];

  const mm = gsap.matchMedia();

  const build = (pinned) => {
    gsap.set(words, { opacity: 0.16 });
    if (plate) gsap.set(plate, { clipPath: "inset(0 0 100% 0)" });
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: pinned
        ? { trigger: root, start: "top 64px", end: "+=220%", pin: true, scrub: 0.5, anticipatePin: 1 }
        : { trigger: root, start: "top 65%", end: "bottom 70%", scrub: 0.5 },
    });
    tl.to(S, { m: MAX - 1, duration: 0.85 }, 0);
    if (words.length) tl.to(words, { opacity: 1, stagger: 0.7 / words.length, duration: 0.12 }, 0);
    if (plate) tl.to(plate, { clipPath: "inset(0 0 0% 0)", duration: 0.4 }, 0.05);
    tl.to({}, { duration: 0.15 }); // hold on the finished square wave

    // Only animate while the scene is on screen (created after the pin so its
    // end includes the pinned scroll distance).
    ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: () => (pinned ? tl.scrollTrigger.end : "bottom top"),
      onToggle: (self) => (self.isActive ? start() : stop()),
      onRefresh: (self) => (self.isActive ? start() : stop()),
    });
    return () => {
      stop();
      gsap.set(words, { clearProps: "opacity" });
      if (plate) gsap.set(plate, { clearProps: "clipPath" });
    };
  };

  mm.add("(min-width: 1024px)", () => build(true));
  mm.add("(max-width: 1023px)", () => build(false));
}
