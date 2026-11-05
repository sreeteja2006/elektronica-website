// Elektronica front-end entry point. Bundled by Hugo (js.Build) into one file.
//
//   wire.js    a plucked, damped string (hero wire, wires under page titles)
//   hero.js    title fitted to the page, letters grow from the wire
//   signal.js  mission scene: a square wave summed from harmonics as you scroll
//   tuner.js   blog as a radio tuner with stations that lock in out of static
//   ui.js      menu, scroll line, reveals, copy button
//
// GSAP lives in ./vendor/gsap (see the README there).
import { gsap } from "./vendor/gsap/index.js";
import ScrollTrigger from "./vendor/gsap/ScrollTrigger.js";
import SplitText from "./vendor/gsap/SplitText.js";

import { initUI } from "./ui.js";
import { initHero } from "./hero.js";
import { initSignal } from "./signal.js";
import { initTuner } from "./tuner.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { gsap, ScrollTrigger, SplitText, reduced };

// Each piece is isolated, so one failing never takes the others (or the page) down.
function run(name, fn) {
  const fail = (err) => {
    console.error(`[elektronica] ${name} failed`, err);
    html.classList.add("js-failed");
    document.querySelector("[data-hero-title]")?.style.setProperty("visibility", "visible");
  };
  try {
    const out = fn(ctx);
    if (out && typeof out.catch === "function") out.catch(fail);
  } catch (err) {
    fail(err);
  }
}

// Lets the CSS hide not-yet-revealed elements. Only added once scripts are running.
html.classList.add("js-ready");

run("ui", initUI);
run("hero", initHero);
run("signal", initSignal); // before tuner: pins change the page height
run("tuner", initTuner);

window.addEventListener("load", () => ScrollTrigger.refresh());
