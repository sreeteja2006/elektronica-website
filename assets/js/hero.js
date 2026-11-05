// Hero: a live oscilloscope behind the headline.
//
//  - Three channels (sine, square, sawtooth) drawn on a canvas, like a scope screen.
//  - Mouse X sets the frequency, mouse Y sets the amplitude. The readout panel
//    shows the matching numbers (timebase is 1 ms/div, 10 divisions across).
//  - Scrolling past the hero flatlines the signals.
//  - The headline "decodes" in glyph by glyph.
//  - Reduced motion: one still frame, no animation.

const TAU = Math.PI * 2;

export function initHero({ gsap, ScrollTrigger, SplitText, reduced }) {
  const hero = document.querySelector("[data-hero]");
  if (!hero) return;
  initTitle({ gsap, SplitText, reduced });
  initScope({ gsap, ScrollTrigger, hero, reduced });
}

/* ---------- Headline ---------- */

function initTitle({ gsap, SplitText, reduced }) {
  const title = document.querySelector("[data-hero-title]");
  const lines = gsap.utils.toArray("[data-hero-line]");
  if (!title) return;
  if (reduced) {
    title.style.visibility = "visible";
    return;
  }

  const split = SplitText.create(title, { type: "chars" });
  const chars = split.chars;
  const finals = chars.map((c) => c.textContent);
  const GLYPHS = "01<>/\\|{}[]#$%&*+=-_";

  // Lock each glyph's width while scrambling so the title doesn't jitter.
  const widths = chars.map((c) => c.getBoundingClientRect().width);
  chars.forEach((c, i) => {
    c.style.width = widths[i] + "px";
    c.style.textAlign = "center";
  });

  title.style.visibility = "visible";
  gsap.set(chars, { opacity: 0 });
  gsap.set(lines, { opacity: 0, y: 22 });

  const tl = gsap.timeline({ delay: 0.15 });
  chars.forEach((ch, i) => {
    const state = { p: 0 };
    const at = i * 0.06;
    tl.to(ch, { opacity: 1, duration: 0.12 }, at);
    tl.to(
      state,
      {
        p: 1,
        duration: 0.6,
        ease: "none",
        onUpdate() {
          if (state.p < 1) {
            if (Math.random() < 0.55) ch.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          } else {
            ch.textContent = finals[i];
          }
        },
        onComplete() {
          ch.textContent = finals[i];
        },
      },
      at
    );
  });
  tl.to(lines, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" }, 0.35);
  tl.add(() => {
    // Back to natural widths so the title reflows normally on resize.
    chars.forEach((c) => {
      c.style.width = "";
      c.style.textAlign = "";
    });
  });
}

/* ---------- Oscilloscope ---------- */

const CHANNELS = [
  { rgb: "61,230,255", y: 0.3, k: 1, shape: (t) => Math.sin(t) },
  { rgb: "61,255,143", y: 0.56, k: 0.5, shape: (t) => Math.tanh(7 * Math.sin(t)) },
  {
    rgb: "255,176,32",
    y: 0.8,
    k: 0.75,
    shape: (t) => {
      const u = (t / TAU) % 1;
      return 2 * (u < 0 ? u + 1 : u) - 1;
    },
  },
];

function initScope({ gsap, ScrollTrigger, hero, reduced }) {
  const canvas = hero.querySelector("#scope");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hud = {
    f1: hero.querySelector("[data-hud-freq]"),
    f2: hero.querySelector("[data-hud-freq2]"),
    f3: hero.querySelector("[data-hud-freq3]"),
    vpp: hero.querySelector("[data-hud-vpp]"),
  };

  const S = {
    freq: 0.45, // 0..1, from pointer X
    amp: 0.5, // 0..1, from pointer Y
    idle: 0, // slow drift so it's alive without a mouse
    mult: 1, // 1 -> 0 as the hero scrolls away (flatline)
    phase: 0,
    px: -1, // pointer x in px (-1 = no pointer)
    cursor: 0, // crosshair opacity
  };

  let W = 0;
  let H = 0;
  let frame = 0;
  let running = false;
  const isSmall = () => window.matchMedia("(max-width: 767px)").matches;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function cyclesNow() {
    return 1.6 + (S.freq + S.idle) * 2.4;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cycles = cyclesNow();
    const amp = H * 0.085 * (0.35 + 0.9 * S.amp) * S.mult;
    const step = isSmall() ? 6 : 3;
    const glow = !isSmall();

    for (const ch of CHANNELS) {
      const cy = H * ch.y;
      const at = (x) => cy - ch.shape((x / W) * cycles * ch.k * TAU + S.phase * ch.k) * amp;

      ctx.beginPath();
      for (let x = 0; x <= W + step; x += step) {
        const y = at(x);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Soft phosphor halo, then a bright core.
      ctx.lineWidth = glow ? 2.4 : 5;
      ctx.strokeStyle = `rgba(${ch.rgb},${glow ? 0.95 : 0.25})`;
      ctx.shadowColor = `rgba(${ch.rgb},0.9)`;
      ctx.shadowBlur = glow ? 14 : 0;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.stroke();

      // Measurement marker where the pointer is.
      if (S.cursor > 0.01 && S.px >= 0) {
        ctx.fillStyle = `rgba(${ch.rgb},${S.cursor})`;
        ctx.beginPath();
        ctx.arc(S.px, at(S.px), 4, 0, TAU);
        ctx.fill();
      }
    }

    if (S.cursor > 0.01 && S.px >= 0) {
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = `rgba(61,230,255,${0.3 * S.cursor})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(S.px, 0);
      ctx.lineTo(S.px, H);
      ctx.stroke();
      ctx.restore();
    }

    if (frame++ % 6 === 0) updateHud(cycles);
  }

  function updateHud(cycles) {
    // 10 divisions x 1 ms = 10 ms window, so cycles-per-screen x 100 = Hz.
    if (hud.f1) hud.f1.textContent = `${Math.round(cycles * 100)} Hz`;
    if (hud.f2) hud.f2.textContent = `${Math.round(cycles * 0.5 * 100)} Hz`;
    if (hud.f3) hud.f3.textContent = `${Math.round(cycles * 0.75 * 100)} Hz`;
    if (hud.vpp) hud.vpp.textContent = `${(1 + S.amp * S.mult * 5).toFixed(1)} V`;
  }

  const tick = (_time, deltaTime) => {
    S.phase += (deltaTime / 1000) * 2.4;
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

  if (reduced) {
    // One still frame, redrawn when the size changes.
    S.phase = 0.6;
    draw();
    updateHud(cyclesNow());
    new ResizeObserver(() => {
      resize();
      draw();
    }).observe(hero);
    return;
  }

  new ResizeObserver(resize).observe(hero);

  // Pointer: X -> frequency, Y -> amplitude.
  const setFreq = gsap.quickTo(S, "freq", { duration: 1, ease: "power3.out" });
  const setAmp = gsap.quickTo(S, "amp", { duration: 1, ease: "power3.out" });
  const setPx = gsap.quickTo(S, "px", { duration: 0.35, ease: "power3.out" });
  const setCursor = gsap.quickTo(S, "cursor", { duration: 0.3 });

  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    setFreq(Math.min(1, Math.max(0, nx)));
    setAmp(Math.min(1, Math.max(0, 1 - ny)));
    if (e.pointerType === "mouse") {
      if (S.px < 0) S.px = e.clientX - r.left;
      setPx(e.clientX - r.left);
      setCursor(1);
    }
  });
  hero.addEventListener("pointerleave", () => {
    setFreq(0.45);
    setAmp(0.5);
    setCursor(0);
  });

  // Slow drift while idle.
  gsap.to(S, { idle: 0.1, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });

  // Flatline as the hero scrolls away.
  gsap.to(S, {
    mult: 0,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom 35%", scrub: true },
  });

  // Only run while the hero is on screen.
  const visibility = ScrollTrigger.create({
    trigger: hero,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => (self.isActive ? start() : stop()),
  });
  if (visibility.isActive) start();
}
