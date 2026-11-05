// A wire you can pluck.
//
// A canvas draws one horizontal line as a damped vibrating string: every point
// is pulled towards its neighbours (the 1D wave equation) and loses a little
// energy each step, so a pluck rings out and dies away like a real oscillator.
//
//  - pluck(x, amount) : displace the wire at x (0..1 across the canvas).
//  - Moving the pointer across the wire plucks it, harder the faster you go.
//  - The loop only runs while the wire is moving and on screen.
//  - Reduced motion: a flat line, drawn once, no interaction.

const COLOR = "#f08a2a";

export function createWire(canvas, { gsap, reduced = false, lineWidth = 2, lineY = 0.5, reach = 36, damping = 0.016, points = 220 } = {}) {
  const ctx = canvas.getContext("2d");
  const N = points;
  const y = new Float32Array(N);
  const v = new Float32Array(N);
  const C = 0.32; // wave speed squared (must stay under 0.5 to be stable)

  let W = 0;
  let H = 0;
  let baseY = 0;
  let dirty = false;
  let onScreen = true;
  let ticking = false;
  const lineFrac = typeof lineY === "function" ? lineY : () => lineY;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseY = lineFrac(H);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = (i / (N - 1)) * W;
      if (i === 0) ctx.moveTo(px, baseY + y[i]);
      else ctx.lineTo(px, baseY + y[i]);
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = COLOR;
    ctx.stroke();
  }

  function step() {
    let energy = 0;
    for (let s = 0; s < 2; s++) {
      for (let i = 1; i < N - 1; i++) {
        const a = C * (y[i - 1] + y[i + 1] - 2 * y[i]) - damping * v[i];
        v[i] += a;
      }
      for (let i = 1; i < N - 1; i++) {
        y[i] += v[i];
        energy += Math.abs(y[i]) + Math.abs(v[i]);
      }
    }
    return energy;
  }

  const tick = () => {
    const e = step();
    draw();
    if (e < 0.4) {
      y.fill(0);
      v.fill(0);
      draw();
      dirty = false;
      sleep();
    }
  };
  function wake() {
    dirty = true;
    if (reduced || ticking || !onScreen) return;
    ticking = true;
    gsap.ticker.add(tick);
  }
  function sleep() {
    if (!ticking) return;
    ticking = false;
    gsap.ticker.remove(tick);
  }

  // Displace the wire at x (0..1). Positive amount pushes it down.
  function pluck(x, amount) {
    if (reduced) return;
    const centre = x * (N - 1);
    const sigma = 3.5;
    for (let i = 1; i < N - 1; i++) {
      const d = i - centre;
      y[i] += amount * Math.exp(-(d * d) / (2 * sigma * sigma));
    }
    wake();
  }

  // Pointer: crossing the wire plucks it.
  let lastY = null;
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    const py = e.clientY - r.top;
    const px = e.clientX - r.left;
    if (px < 0 || px > r.width || Math.abs(py - baseY) > reach * 2) {
      lastY = null;
      return;
    }
    if (lastY !== null) {
      const crossed = (lastY - baseY) * (py - baseY) <= 0;
      if (crossed) {
        const speed = Math.min(Math.abs(py - lastY), 60);
        pluck(px / r.width, (py > lastY ? 1 : -1) * Math.max(6, speed * 0.9));
      }
    }
    lastY = py;
  }
  function onLeave() {
    lastY = null;
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  if (!reduced) {
    const host = canvas.closest("[data-wire-host]") || canvas.parentElement;
    window.addEventListener("pointermove", onMove, { passive: true });
    host?.addEventListener("pointerleave", onLeave);
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (!onScreen) sleep();
      else if (dirty) wake();
    }).observe(canvas);
  }

  return {
    pluck,
    setLineY(px) {
      baseY = px;
      draw();
    },
    resize,
    destroy() {
      sleep();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    },
  };
}
