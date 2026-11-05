// Elektronica front-end entry point. Bundled by Hugo (js.Build) into one file.
//
//   hero.js      live oscilloscope + decoding headline
//   showcase.js  horizontal-scroll blog showcase
//   pcb.js       PCB rail that draws and lights up as you scroll
//   ui.js        menu, scroll meter, reveals, copy button
//
// GSAP lives in ./vendor/gsap (see the README there).
import { gsap } from "./vendor/gsap/index.js";
import ScrollTrigger from "./vendor/gsap/ScrollTrigger.js";
import DrawSVGPlugin from "./vendor/gsap/DrawSVGPlugin.js";
import MotionPathPlugin from "./vendor/gsap/MotionPathPlugin.js";
import SplitText from "./vendor/gsap/SplitText.js";

import { initUI } from "./ui.js";
import { initHero } from "./hero.js";
import { initShowcase } from "./showcase.js";
import { initPCB } from "./pcb.js";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, SplitText);

const html = document.documentElement;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctx = { gsap, ScrollTrigger, SplitText, reduced };

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
run("hero", initHero);
run("showcase", initShowcase); // before pcb: its pin changes the page height
run("pcb", initPCB);

window.addEventListener("load", () => ScrollTrigger.refresh());
