// Hero.
//
// The title is fitted to the full width of the page. Its letters stand on a wire
// (wire.js). On load each letter grows up from the wire with a springy overshoot
// and plucks it as it goes, so the wire rings. Afterwards you can pluck the wire
// yourself by moving the pointer across it.
//
// Reduced motion: letters are simply there, and the wire is a flat line.

import { createWire } from "./wire.js";

const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

export async function initHero({ gsap, SplitText, reduced }) {
  const hero = document.querySelector("[data-hero]");
  const title = hero?.querySelector("[data-hero-title]");
  const canvas = hero?.querySelector("#wire");
  if (!hero || !title || !canvas) return;
  const lines = gsap.utils.toArray("[data-hero-line]", hero);

  await fontsReady();

  const wire = createWire(canvas, { gsap, reduced, lineWidth: 2 });
  const split = SplitText.create(title, { type: "chars" });
  const chars = split.chars;

  // A zero-size inline block sits exactly on the text baseline, which is where
  // the wire goes and where the letters grow from.
  const marker = document.createElement("span");
  marker.style.cssText = "display:inline-block;width:0;height:0;";
  title.appendChild(marker);

  function layout() {
    // Fit the title to the container width.
    const box = title.parentElement;
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    title.style.fontSize = "100px";
    const first = chars[0].getBoundingClientRect();
    const last = chars[chars.length - 1].getBoundingClientRect();
    title.style.fontSize = `${(100 * avail) / (last.right - first.left)}px`;

    // Baseline: position the wire and each letter's growth origin.
    const heroTop = hero.getBoundingClientRect().top;
    const baseline = marker.getBoundingClientRect().bottom;
    wire.setLineY(baseline - heroTop);
    for (const c of chars) {
      const r = c.getBoundingClientRect();
      gsap.set(c, { transformOrigin: `50% ${((baseline - r.top) / r.height) * 100}%` });
    }
  }

  layout();
  title.style.visibility = "visible";

  let relayoutTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(layout, 120);
  }).observe(hero);

  if (reduced) return;

  // Entrance: letters grow from the wire, each one plucking it.
  gsap.set(chars, { scaleY: 0 });
  gsap.set(lines, { opacity: 0, y: 18 });
  const tl = gsap.timeline({ delay: 0.15 });
  chars.forEach((c, i) => {
    const at = i * 0.075;
    tl.to(c, { scaleY: 1, duration: 1.5, ease: "elastic.out(1, 0.32)" }, at);
    tl.call(
      () => {
        const r = c.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        wire.pluck((r.left + r.width / 2 - cr.left) / cr.width, 14 + Math.random() * 6);
      },
      null,
      at + 0.06
    );
  });
  tl.to(lines, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" }, 0.4);
}
