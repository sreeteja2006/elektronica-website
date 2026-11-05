// PCB bus down the left edge of every page.
//
//  - A faint "unpowered" bus of copper traces is always there.
//  - As you scroll, the bus energises (DrawSVG), with a bright head at the
//    bottom of the screen and current pulses running down the lit part.
//  - Every element marked [data-pad] (section headings) gets a pad. When the
//    heading scrolls into view a branch trace routes to it, the pad lights up,
//    a pulse travels along the branch and a ring pings out (MotionPath).
//  - On phones the bus is a single trace and pads sit directly on it.
//  - Reduced motion: everything is drawn fully lit and nothing moves.
//
// The SVG is rebuilt when the page width or height changes (resize, fonts,
// the blog showcase pin), because pad positions depend on the layout.

const NS = "http://www.w3.org/2000/svg";
const GREEN = "#3dff8f";
const CYAN = "#3de6ff";
const AMBER = "#ffb020";
const COPPER_DIM = "#1b2a38";

function svg(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  if (parent) parent.appendChild(node);
  return node;
}

// Layout position of el inside root, ignoring transforms (so it is correct
// even while an element is mid-reveal animation).
function offsetIn(el, root) {
  let x = 0;
  let y = 0;
  for (let n = el; n && n !== root; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}

export function initPCB({ gsap, ScrollTrigger, reduced }) {
  const root = document.querySelector("[data-pcb-root]");
  if (!root) return;

  let ctx = null;
  let layer = null;
  let built = { w: 0, h: 0 };

  function build() {
    ctx?.revert();
    layer?.remove();

    const W = root.clientWidth;
    const H = root.offsetHeight;
    built = { w: W, h: H };
    if (!W || !H) return;

    const desktop = W >= 1024;
    const vh = window.innerHeight;
    const rootTop = root.getBoundingClientRect().top + window.scrollY;

    const BUS = desktop
      ? [
          { x: 16, color: AMBER, glow: 0.1, w: 2 },
          { x: 27, color: CYAN, glow: 0.12, w: 2 },
          { x: 38, color: GREEN, glow: 0.18, w: 2.5, primary: true },
        ]
      : [{ x: 10, color: GREEN, glow: 0.18, w: 2.5, primary: true }];
    const primary = BUS[BUS.length - 1];

    layer = svg(
      "svg",
      { class: "pcb-layer", width: W, height: H, viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true", focusable: "false" },
      root
    );
    const defs = svg("defs", {}, layer);
    const clip = svg("clipPath", { id: "pcb-clip" }, defs);
    const clipRect = svg("rect", { x: 0, y: 0, width: W, height: 0 }, clip);

    // Unpowered copper + vias.
    const base = svg("g", {}, layer);
    BUS.forEach((b, i) => {
      svg("path", { d: `M${b.x} 0V${H}`, stroke: COPPER_DIM, "stroke-width": 2, fill: "none" }, base);
      for (let y = 140 + i * 90; y < H - 40; y += 300 + ((i * 53) % 110)) {
        svg("circle", { cx: b.x, cy: y, r: 3, fill: "#04070b", stroke: "#2a3d4f", "stroke-width": 1.5 }, base);
      }
    });

    // Energised copper, drawn by scroll.
    const lit = svg("g", {}, layer);
    const traces = BUS.map((b, i) => {
      const d = `M${b.x} 0V${H}`;
      const halo = svg("path", { d, stroke: b.color, "stroke-opacity": b.glow, "stroke-width": 8, fill: "none" }, lit);
      const core = svg("path", { d, stroke: b.color, "stroke-opacity": b.primary ? 0.95 : 0.6, "stroke-width": b.w, fill: "none" }, lit);
      return { ...b, halo, core, lag: (BUS.length - 1 - i) * 140 };
    });

    const headGlow = svg("circle", { cx: primary.x, cy: 0, r: 10, fill: primary.color, opacity: 0.22 }, layer);
    const headDot = svg("circle", { cx: primary.x, cy: 0, r: 3.5, fill: "#fff" }, layer);

    // Pads for every [data-pad] heading.
    const nodes = [];
    root.querySelectorAll("[data-pad]").forEach((padEl) => {
      const pos = offsetIn(padEl, root);
      const cs = getComputedStyle(padEl);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const y = pos.y + lh / 2;
      const x = desktop ? Math.max(pos.x - 32, primary.x + 28) : primary.x;

      const g = svg("g", { class: "pcb-node" }, layer);
      let branchDim = null;
      let branch = null;
      if (desktop) {
        const bend = 12;
        const d = `M${primary.x} ${y - bend}L${primary.x + bend} ${y}H${x - 8}`;
        branchDim = svg("path", { d, stroke: COPPER_DIM, "stroke-width": 2, fill: "none" }, g);
        branch = svg("path", { d, stroke: GREEN, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      }
      svg("circle", { class: "pcb-pad", cx: x, cy: y, r: 6 }, g);
      svg("circle", { class: "pcb-dot", cx: x, cy: y, r: 2 }, g);
      const ping = svg("circle", { cx: x, cy: y, r: 6, fill: "none", stroke: GREEN, "stroke-width": 2, opacity: 0 }, g);
      const pulse = desktop ? svg("circle", { cx: 0, cy: 0, r: 3.5, fill: "#fff", opacity: 0 }, g) : null;
      nodes.push({ padEl, g, branch, ping, pulse });
    });

    if (reduced) {
      // Fully lit, still.
      traces.forEach((t) => gsap.set([t.halo, t.core], { drawSVG: "0% 100%" }));
      nodes.forEach((n) => {
        n.g.classList.add("lit");
        if (n.branch) gsap.set(n.branch, { drawSVG: "0% 100%" });
      });
      headDot.remove();
      headGlow.remove();
      return;
    }

    ctx = gsap.context(() => {
      // Bus energising, driven by scroll. `head` is the y of the bright front.
      const S = { head: 0 };
      const apply = () => {
        for (const t of traces) {
          const y = Math.max(0, Math.min(H, S.head - t.lag));
          gsap.set([t.halo, t.core], { drawSVG: `0% ${(y / H) * 100}%` });
        }
        clipRect.setAttribute("height", Math.max(0, S.head));
        const hy = Math.min(H, S.head);
        headDot.setAttribute("cy", hy);
        headGlow.setAttribute("cy", hy);
        const visible = hy > 2 && hy < H - 2 ? 1 : 0;
        headDot.style.opacity = visible;
        headGlow.style.opacity = visible * 0.22;
      };
      const target = () => window.scrollY - rootTop + vh * 0.85;
      S.head = target();
      apply();
      const setHead = gsap.quickTo(S, "head", { duration: 0.7, ease: "power3.out", onUpdate: apply });
      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        onUpdate: () => setHead(target()),
      });

      // Current pulses running down the energised part of the bus.
      const pulses = svg("g", { "clip-path": "url(#pcb-clip)" }, layer);
      BUS.forEach((b, i) => {
        const speed = b.primary ? 320 : 230;
        const count = b.primary ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const dot = svg("g", {}, pulses);
          svg("circle", { cx: b.x, cy: 0, r: 9, fill: b.color, opacity: 0.18 }, dot);
          svg("circle", { cx: b.x, cy: 0, r: b.primary ? 3 : 2.2, fill: b.color }, dot);
          gsap.fromTo(
            dot,
            { y: -20 },
            { y: H + 20, duration: (H + 40) / speed, ease: "none", repeat: -1, delay: (k * (H / speed)) / 2 + i * 1.3 }
          );
        }
      });

      // Pads: route a branch, light the pad, send a pulse, ping.
      nodes.forEach((n) => {
        const tl = gsap.timeline({ paused: true });
        if (n.branch) {
          gsap.set(n.branch, { drawSVG: "0% 0%" });
          tl.to(n.branch, { drawSVG: "0% 100%", duration: 0.55, ease: "power2.out" }, 0);
          tl.fromTo(
            n.pulse,
            { opacity: 1 },
            {
              opacity: 1,
              duration: 0.55,
              ease: "power1.in",
              motionPath: { path: n.branch, align: n.branch, alignOrigin: [0.5, 0.5] },
            },
            0
          );
          tl.to(n.pulse, { opacity: 0, duration: 0.15 }, 0.55);
        }
        tl.fromTo(n.ping, { attr: { r: 6 }, opacity: 0.85 }, { attr: { r: 28 }, opacity: 0, duration: 0.9, ease: "power2.out" }, n.branch ? 0.45 : 0);
        tl.eventCallback("onReverseComplete", () => n.g.classList.remove("lit"));

        ScrollTrigger.create({
          trigger: n.padEl,
          start: "top 80%",
          onEnter: () => {
            n.g.classList.add("lit");
            tl.play();
          },
          onLeaveBack: () => tl.reverse(),
        });
      });
    });
  }

  build();

  let timer = 0;
  const maybeRebuild = () => {
    const W = root.clientWidth;
    const H = root.offsetHeight;
    if (Math.abs(W - built.w) > 1 || Math.abs(H - built.h) > 6) build();
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(maybeRebuild, 250);
  };
  new ResizeObserver(schedule).observe(root);
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  document.fonts?.ready.then(schedule);
}
