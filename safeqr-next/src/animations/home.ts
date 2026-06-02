// ============================================
// SafeQR v2 — GSAP Home Page Animations
// ============================================
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero entrance animation — staggered reveal
 * Call after page mount
 */
export function animateHero(container: HTMLElement): gsap.core.Timeline {
  return gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(".hero-title", { y: 40, opacity: 0, duration: 0.7 }, 0)
    .from(".hero-desc", { y: 20, opacity: 0, duration: 0.5 }, 0.15)
    .from(".hero-flag", { scale: 0.8, opacity: 0, duration: 0.4, ease: "back.out(1.7)" }, 0.2)
    .from(
      ".hotline-btn",
      { scale: 0.7, opacity: 0, stagger: 0.08, duration: 0.45, ease: "back.out(1.7)" },
      0.3
    );
}

/**
 * Card grid stagger entrance — scroll triggered
 */
export function animateCards(container: HTMLElement): ScrollTrigger {
  return ScrollTrigger.create({
    trigger: container,
    start: "top 88%",
    onEnter: () => {
      gsap.from(".card-wrapper", {
        y: 50,
        opacity: 0,
        duration: 0.55,
        stagger: { each: 0.07, grid: "auto", from: "start" },
        ease: "power2.out",
      });
    },
    once: true,
  });
}

/**
 * SOS button expand/collapse
 */
export function animateSOSExpand(
  container: HTMLElement,
  expand: boolean
): gsap.core.Timeline {
  if (expand) {
    return gsap
      .timeline()
      .fromTo(
        ".sos-action",
        { scale: 0.7, opacity: 0, y: 8 },
        { scale: 1, opacity: 1, y: 0, stagger: 0.05, duration: 0.3, ease: "back.out(1.4)" }
      );
  }
  return gsap
    .timeline()
    .to(".sos-action", {
      scale: 0.8,
      opacity: 0,
      stagger: 0.03,
      duration: 0.2,
      ease: "power2.in",
    });
}

/**
 * Chat panel slide in/out
 */
export function animateChatPanel(
  panel: HTMLElement,
  show: boolean
): gsap.core.Tween {
  if (show) {
    return gsap.fromTo(
      panel,
      { y: 24, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.3)" }
    );
  }
  return gsap.to(panel, {
    y: 16,
    opacity: 0,
    scale: 0.97,
    duration: 0.25,
    ease: "power2.in",
  });
}

/**
 * Page transition stagger
 */
export function pageEntrance(container: HTMLElement): gsap.core.Timeline {
  return gsap
    .timeline()
    .from(container.querySelectorAll(".page-stagger"), {
      y: 16,
      opacity: 0,
      stagger: 0.04,
      duration: 0.4,
      ease: "power2.out",
    });
}
