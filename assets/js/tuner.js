// Blog as a radio tuner.
//
// On desktop the blog section is pinned and scrolling turns the dial. Each post
// is a station: between stations you get static, and as the needle approaches a
// station the picture comes into focus, the title's letters lock in one by one
// and the rest of the text fades up. Scrolling snaps to the nearest station so
// you always land on a clear signal.
//
// Mobile / reduced motion: a plain stacked list (the page works without this).

const LO = 88; // dial range in MHz
const HI = 108;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

export function initTuner({ gsap, ScrollTrigger, SplitText }) {
  const root = document.querySelector("[data-tuner]");
  if (!root) return;
  const stations = gsap.utils.toArray("[data-station]", root);
  const n = stations.length;
  if (n < 2) return;

  const scale = root.querySelector("[data-scale]");
  const needle = root.querySelector("[data-needle]");
  const readout = root.querySelector("[data-freq]");
  const noise = root.querySelector("[data-static]");

  const mm = gsap.matchMedia();

  // Pinned only on large screens with motion allowed.
  mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
    root.classList.add("is-tuner");

    // Station frequencies, spread over the middle of the dial.
    const freqs = stations.map((_, i) => Math.round((91 + (14 * i) / (n - 1)) * 10) / 10);
    const freqAt = (pos) => {
      const i = clamp(Math.floor(pos), 0, n - 2);
      return freqs[i] + (freqs[i + 1] - freqs[i]) * (pos - i);
    };
    const xOf = (f) => ((f - LO) / (HI - LO)) * 100;

    // Dial scale: a tick every 0.5 MHz, a number every 2.
    const built = [];
    for (let f = LO; f <= HI + 0.001; f += 0.5) {
      const major = Math.abs(f % 2) < 0.001;
      const tick = document.createElement("div");
      tick.className = "dial-tick";
      tick.style.left = `${xOf(f)}%`;
      tick.style.height = major ? "14px" : Math.abs(f % 1) < 0.001 ? "9px" : "5px";
      scale.appendChild(tick);
      built.push(tick);
      if (major) {
        const num = document.createElement("span");
        num.className = "dial-num";
        num.textContent = f;
        num.style.left = `${xOf(f)}%`;
        scale.appendChild(num);
        built.push(num);
      }
    }
    for (const f of freqs) {
      const dot = document.createElement("div");
      dot.className = "dial-station";
      dot.style.left = `${xOf(f)}%`;
      scale.appendChild(dot);
      built.push(dot);
    }

    // Per-station parts.
    const parts = stations.map((el) => {
      const title = el.querySelector("[data-station-title]");
      // "words" keeps each word in one piece so lines only break between words.
      const split = SplitText.create(title, { type: "words,chars" });
      return {
        el,
        media: el.querySelector("[data-station-media] img"),
        fades: el.querySelectorAll("[data-station-fade]"),
        chars: split.chars,
        // The moment (0..1 of lock) at which each letter locks in.
        thresholds: split.chars.map(() => 0.15 + Math.random() * 0.8),
        split,
      };
    });

    // Static: a small noise canvas, scaled up so it reads as coarse TV grain.
    const nctx = noise.getContext("2d");
    noise.width = 200;
    noise.height = 120;
    const frame = nctx.createImageData(200, 120);
    let noiseOn = false;
    let skip = 0;
    const drawNoise = () => {
      if (skip++ % 2) return;
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = 20 + Math.random() * 190;
        d[i] = g * 1.04;
        d[i + 1] = g;
        d[i + 2] = g * 0.92;
        d[i + 3] = 255;
      }
      nctx.putImageData(frame, 0, 0);
    };

    const S = { pos: 0 };
    let shown = -1;

    function render() {
      const i = clamp(Math.round(S.pos), 0, n - 1);
      const d = Math.abs(S.pos - i);
      const lock = 1 - smooth((d - 0.05) / 0.4);

      if (i !== shown) {
        parts.forEach((p, k) => (p.el.style.visibility = k === i ? "visible" : "hidden"));
        shown = i;
      }

      const p = parts[i];
      const blur = (1 - lock) * 16;
      if (p.media) {
        p.media.style.filter = `blur(${blur.toFixed(1)}px) contrast(${(1 + (1 - lock) * 0.9).toFixed(2)}) saturate(${(0.4 + 0.6 * lock).toFixed(2)})`;
        p.media.style.transform = `translateX(${((Math.random() - 0.5) * (1 - lock) * 22).toFixed(1)}px)`;
      }
      p.chars.forEach((c, k) => {
        c.style.opacity = lock >= p.thresholds[k] ? 1 : 0.1;
      });
      p.fades.forEach((f) => (f.style.opacity = clamp((lock - 0.55) / 0.4, 0, 1)));

      noise.style.opacity = ((1 - lock) * 0.92).toFixed(3);
      noiseOn = noise.style.opacity > 0.02;

      const f = freqAt(clamp(S.pos, 0, n - 1));
      needle.style.left = `${xOf(f)}%`;
      readout.textContent = f.toFixed(1);
    }

    const tick = () => {
      if (noiseOn) drawNoise();
    };
    gsap.ticker.add(tick);

    render();
    const setPos = gsap.quickTo(S, "pos", { duration: 0.35, ease: "power2.out", onUpdate: render });

    const st = ScrollTrigger.create({
      trigger: root,
      start: "top 64px",
      end: () => "+=" + (n - 1) * window.innerHeight * 0.85,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.6 }, delay: 0.1, ease: "power2.inOut" },
      onUpdate: (self) => setPos(self.progress * (n - 1)),
    });

    return () => {
      st.kill();
      gsap.ticker.remove(tick);
      root.classList.remove("is-tuner");
      built.forEach((el) => el.remove());
      parts.forEach((p) => {
        p.split.revert();
        p.el.style.visibility = "";
        if (p.media) {
          p.media.style.filter = "";
          p.media.style.transform = "";
        }
        p.fades.forEach((f) => (f.style.opacity = ""));
      });
      noise.style.opacity = "";
    };
  });
}
