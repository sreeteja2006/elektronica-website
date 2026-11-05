// Small interface behaviours: mobile menu, scroll line, reveals, copy button,
// and the little wires under page titles.

import { createWire } from "./wire.js";

export function initUI({ gsap, ScrollTrigger, reduced }) {
  initMenu();
  initCopy();
  initPageWires({ gsap, reduced });
  if (reduced) return;
  initScrollMeter(gsap);
  initReveals(gsap, ScrollTrigger);
}

function initMenu() {
  const btn = document.getElementById("menu-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!btn || !menu) return;
  const label = btn.querySelector("[data-menu-label]");
  const set = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    if (label) label.textContent = open ? "Close" : "Menu";
    document.documentElement.style.overflow = open ? "hidden" : "";
  };
  btn.addEventListener("click", () => set(menu.hidden));
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) set(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) {
      set(false);
      btn.focus();
    }
  });
  window.matchMedia("(min-width: 768px)").addEventListener("change", (e) => e.matches && set(false));
}

function initCopy() {
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const label = btn.querySelector("[data-copy-label]") || btn;
    const original = label.textContent;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        label.textContent = "Copied";
      } catch {
        label.textContent = "Press Ctrl+C to copy";
      }
      setTimeout(() => (label.textContent = original), 1800);
    });
  });
}

// The wire under every page title rings once when the page loads.
function initPageWires({ gsap, reduced }) {
  document.querySelectorAll("[data-wire]").forEach((canvas) => {
    const wire = createWire(canvas, { gsap, reduced, lineWidth: 1.5, reach: 24 });
    if (!reduced) setTimeout(() => wire.pluck(0.12, 16), 500);
  });
}

// Thin line under the nav that fills as you scroll.
function initScrollMeter(gsap) {
  const meter = document.getElementById("scroll-meter");
  if (!meter) return;
  gsap.to(meter, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
    },
  });
}

// Fades and lifts [data-reveal] elements in as they enter the viewport.
function initReveals(gsap, ScrollTrigger) {
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
        overwrite: "auto",
      }),
  });
}
