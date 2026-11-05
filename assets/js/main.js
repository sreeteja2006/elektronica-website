// Elektronica front-end entry point. Bundled by Hugo (js.Build) into one file.
//
//   journey.js  scroll-driven zoom into a circuit (home page hero)
//   ui.js       menu, scroll meter, reveals, copy button
//
// GSAP lives in ./vendor/gsap (see the README there).
import { gsap } from "./vendor/gsap/index.js";
import ScrollTrigger from "./vendor/gsap/ScrollTrigger.js";

import { initUI } from "./ui.js";
import { initJourney } from "./journey.js";

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { gsap, ScrollTrigger, reduced };

// Each piece is isolated, so one failing never takes the others (or the page) down.
function run(name, fn) {
  try {
    fn(ctx);
  } catch (err) {
    console.error(`[elektronica] ${name} failed`, err);
    html.classList.add("js-failed");
  }
}

// Lets the CSS hide not-yet-revealed elements. Only added once scripts are running.
html.classList.add("js-ready");

run("ui", initUI);
run("journey", initJourney);

window.addEventListener("load", () => ScrollTrigger.refresh());
