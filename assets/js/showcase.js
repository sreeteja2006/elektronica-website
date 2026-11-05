// Blog showcase on the home page.
//
//  - Desktop: the row of posts pins to the screen and slides sideways as you
//    scroll down, with a thin progress line underneath showing how far along you are.
//  - Mobile / reduced motion: a plain swipeable row (CSS scroll-snap), no pinning.

export function initShowcase({ gsap, reduced }) {
  const wrap = document.querySelector("[data-showcase]");
  if (!wrap) return;
  const track = wrap.querySelector("[data-track]");
  const cards = gsap.utils.toArray("[data-card]", wrap);
  const bar = wrap.querySelector("[data-progress]");
  if (!track || !cards.length) return;

  const mm = gsap.matchMedia();

  mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
    wrap.classList.add("is-pinned-mode");
    const distance = () => Math.max(0, track.scrollWidth - wrap.clientWidth);

    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: wrap,
        start: "top 14%",
        end: () => "+=" + distance(),
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => bar && gsap.set(bar, { scaleX: self.progress }),
      },
    });

    gsap.from(cards, {
      opacity: 0,
      y: 40,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: wrap, start: "top 85%", once: true },
    });

    return () => {
      wrap.classList.remove("is-pinned-mode");
      if (bar) gsap.set(bar, { clearProps: "transform" });
    };
  });

  if (!reduced) {
    mm.add("(max-width: 1023px)", () => {
      gsap.from(cards, {
        opacity: 0,
        y: 36,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: wrap, start: "top 88%", once: true },
      });
    });
  }
}
