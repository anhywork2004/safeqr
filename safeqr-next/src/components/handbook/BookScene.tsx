/* eslint-disable @next/next/no-img-element */
// ============================================
// SafeQR v2 — Premium 3D Book with GSAP
// Full physics-based: cover open, page flip,
// spine, back, page edge, travelling shadows
// ============================================
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import gsap from "gsap";
import type { HandbookTopic, FlipDirection } from "@/types";
import { SPREADS, COVER_INSIDE } from "@/data/handbook-topics";
import TopicRenderer from "./TopicRenderer";

// ── BookScene ref interface (exposed to parent) ──
export interface BookSceneHandle {
  flipToSpread: (index: number) => void;
  openBook: () => void;
  closeBook: () => void;
  getCurrentSpread: () => number;
  isBookOpen: () => boolean;
}

interface BookSceneProps {
  reducedMotion: boolean;
  onStateChange?: (spread: number, bookOpen: boolean) => void;
  onTocOpen: () => void;
}

// ── CSS custom properties injected via JS ──
const BOOK_SIZES = {
  bookW: 780,
  bookH: 520,
  pad: 26,
};

// Responsive via matchMedia handled in component

const BookScene = forwardRef<BookSceneHandle, BookSceneProps>(
  function BookScene({ reducedMotion, onStateChange, onTocOpen }, ref) {
    // ── Refs for all 3D elements ──
    const sceneRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<HTMLDivElement>(null);
    const shadowRef = useRef<HTMLDivElement>(null);
    const bookBackRef = useRef<HTMLDivElement>(null);
    const pageEdgeRef = useRef<HTMLDivElement>(null);
    const coverRef = useRef<HTMLDivElement>(null);
    const coverPageEdgeRef = useRef<HTMLDivElement>(null);
    const spreadRef = useRef<HTMLDivElement>(null);
    const spineRef = useRef<HTMLDivElement>(null);
    const spreadRightRef = useRef<HTMLDivElement>(null);
    const flipLeafRef = useRef<HTMLDivElement>(null);
    const flipFrontRef = useRef<HTMLDivElement>(null);
    const flipBackRef = useRef<HTMLDivElement>(null);

    // ── State ──
    const [currentSpread, setCurrentSpread] = useState(0);
    const [bookOpened, setBookOpened] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [viewport, setViewport] = useState({ w: 0, h: 0 });

    // Track state in refs for GSAP callbacks
    const stateRef = useRef({ spread: 0, opened: false, animating: false });

    // ── Responsive book sizing ──
    const getBookSize = useCallback(() => {
      if (typeof window === "undefined") return BOOK_SIZES;
      const w = window.innerWidth;
      if (w <= 460) return { bookW: 340, bookH: 240, pad: 12 };
      if (w <= 768) return { bookW: 560, bookH: 380, pad: 18 };
      if (w <= 1024) return { bookW: 680, bookH: 460, pad: 22 };
      return BOOK_SIZES;
    }, []);

    // ── Apply position to elements ──
    const applyBookSize = useCallback(() => {
      const size = getBookSize();
      const book = bookRef.current;
      const scene = sceneRef.current;
      if (!book || !scene) return;

      setViewport({ w: window.innerWidth, h: window.innerHeight });

      // Set CSS variables
      book.style.setProperty("--book-w", `${size.bookW}px`);
      book.style.setProperty("--book-h", `${size.bookH}px`);
      book.style.setProperty("--pad", `${size.pad}px`);

      // Closed: half width. If opened, full width
      if (!stateRef.current.opened) {
        book.style.width = `${size.bookW / 2}px`;
        book.style.height = `${size.bookH}px`;
      } else {
        book.style.width = `${size.bookW}px`;
        book.style.height = `${size.bookH}px`;
      }
    }, [getBookSize]);

    // ── Open Book Animation ──
    const openBook = useCallback(() => {
      if (stateRef.current.animating || stateRef.current.opened) return;
      if (reducedMotion) {
        stateRef.current.opened = true;
        setBookOpened(true);
        onStateChange?.(stateRef.current.spread, true);
        return;
      }

      stateRef.current.animating = true;
      setIsAnimating(true);
      const size = getBookSize();

      const tl = gsap.timeline({
        onComplete: () => {
          stateRef.current.opened = true;
          stateRef.current.animating = false;
          setBookOpened(true);
          setIsAnimating(false);
          onStateChange?.(stateRef.current.spread, true);
        },
      });

      // Expand book width
      tl.to(bookRef.current, {
        width: size.bookW,
        duration: 0.75,
        ease: "power3.inOut",
      }, 0);

      // Expand ground shadow
      tl.to(shadowRef.current, {
        width: size.bookW * 0.88,
        duration: 0.75,
        ease: "power3.inOut",
      }, 0);

      // Flip cover open
      tl.to(coverRef.current, {
        rotateY: -180,
        left: "50%",
        width: "50%",
        duration: 0.85,
        ease: "power2.inOut",
      }, 0);

      // Fade cover page edge
      tl.to(coverPageEdgeRef.current, {
        opacity: 0,
        duration: 0.2,
      }, 0);

      // Fade cover opacity near end
      tl.to(coverRef.current, {
        opacity: 0,
        duration: 0.15,
      }, ">-=0.15");

      // Show spine + right page
      tl.to(
        [spineRef.current, spreadRightRef.current],
        { opacity: 1, duration: 0.4 },
        ">-=0.5"
      );

      // Add is-open class
      tl.call(() => sceneRef.current?.classList.add("is-open"));
    }, [reducedMotion, getBookSize, onStateChange]);

    // ── Close Book Animation ──
    const closeBook = useCallback(() => {
      if (stateRef.current.animating || !stateRef.current.opened) return;
      if (reducedMotion) {
        stateRef.current.opened = false;
        setBookOpened(false);
        onStateChange?.(stateRef.current.spread, false);
        return;
      }

      stateRef.current.animating = true;
      setIsAnimating(true);
      const size = getBookSize();

      const tl = gsap.timeline({
        onComplete: () => {
          stateRef.current.opened = false;
          stateRef.current.animating = false;
          setBookOpened(false);
          setIsAnimating(false);
          onStateChange?.(stateRef.current.spread, false);
        },
      });

      // Hide spine + right page
      tl.to(
        [spineRef.current, spreadRightRef.current],
        { opacity: 0, duration: 0.2 }
      );

      // Show cover
      tl.to(coverRef.current, { opacity: 1, duration: 0.1 });

      // Flip cover closed + shrink book
      tl.to(coverRef.current, {
        rotateY: 0,
        left: "0%",
        width: "100%",
        duration: 0.7,
        ease: "power2.inOut",
      }, ">-0.1");

      tl.to(bookRef.current, {
        width: size.bookW / 2,
        duration: 0.75,
        ease: "power3.inOut",
      }, "<");

      tl.to(shadowRef.current, {
        width: (size.bookW / 2) * 0.88,
        duration: 0.75,
        ease: "power3.inOut",
      }, "<");

      // Show cover page edge
      tl.to(coverPageEdgeRef.current, { opacity: 1, duration: 0.15 });

      tl.call(() => sceneRef.current?.classList.remove("is-open"));
    }, [reducedMotion, getBookSize, onStateChange]);

    // ── Flip to Spread ──
    const flipToSpread = useCallback(
      (targetIndex: number) => {
        const st = stateRef.current;
        if (st.animating || !st.opened) return;
        if (targetIndex < 0 || targetIndex >= SPREADS.length) return;
        if (targetIndex === st.spread) return;

        if (reducedMotion) {
          st.spread = targetIndex;
          setCurrentSpread(targetIndex);
          onStateChange?.(targetIndex, true);
          return;
        }

        st.animating = true;
        setIsAnimating(true);

        const direction: FlipDirection =
          targetIndex > st.spread ? "forward" : "backward";

        const leaf = flipLeafRef.current;
        if (!leaf) return;

        // Set flip leaf content
        // We update the current spread AFTER animation completes
        // During animation, the leaf shows new content

        // Prepare leaf
        leaf.style.visibility = "visible";

        const tl = gsap.timeline({
          onComplete: () => {
            leaf.style.visibility = "hidden";
            leaf.style.filter = "none";
            st.spread = targetIndex;
            st.animating = false;
            setCurrentSpread(targetIndex);
            setIsAnimating(false);
            onStateChange?.(targetIndex, true);
          },
        });

        if (direction === "forward") {
          tl.fromTo(
            leaf,
            { rotateY: 0 },
            {
              rotateY: -180,
              duration: 0.68,
              ease: "power2.inOut",
            }
          );
          tl.set(leaf, { filter: "drop-shadow(-12px 4px 24px rgba(0,0,0,0.22))" }, 0);
        } else {
          tl.fromTo(
            leaf,
            { rotateY: -180 },
            {
              rotateY: 0,
              duration: 0.68,
              ease: "power2.inOut",
            }
          );
          tl.set(leaf, { filter: "drop-shadow(12px 4px 24px rgba(0,0,0,0.22))" }, 0);
        }
      },
      [reducedMotion, onStateChange]
    );

    // ── Expose methods to parent ──
    useImperativeHandle(
      ref,
      () => ({
        flipToSpread,
        openBook,
        closeBook,
        getCurrentSpread: () => stateRef.current.spread,
        isBookOpen: () => stateRef.current.opened,
      }),
      [flipToSpread, openBook, closeBook]
    );

    // ── Init + Resize ──
    useEffect(() => {
      applyBookSize();
      const onResize = () => applyBookSize();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [applyBookSize]);

    // ── Keyboard + Touch ──
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (!stateRef.current.opened) return;
        if (e.key === "ArrowLeft") flipToSpread(stateRef.current.spread - 1);
        if (e.key === "ArrowRight") flipToSpread(stateRef.current.spread + 1);
        if (e.key === "Escape") closeBook();
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }, [flipToSpread, closeBook]);

    useEffect(() => {
      let startX = 0;
      const ts = (e: TouchEvent) => {
        startX = e.touches[0].clientX;
      };
      const te = (e: TouchEvent) => {
        if (!stateRef.current.opened) return;
        const diff = startX - e.changedTouches[0].clientX;
        if (diff > 50) flipToSpread(stateRef.current.spread + 1);
        if (diff < -50) flipToSpread(stateRef.current.spread - 1);
      };
      document.addEventListener("touchstart", ts);
      document.addEventListener("touchend", te);
      return () => {
        document.removeEventListener("touchstart", ts);
        document.removeEventListener("touchend", te);
      };
    }, [flipToSpread]);

    // ── Current spread data ──
    const spread = SPREADS[currentSpread];
    // For flip leaf content (show the "new" content during flip)
    const nextSpread =
      currentSpread < SPREADS.length - 1
        ? SPREADS[currentSpread + 1]
        : SPREADS[currentSpread];

    const size = getBookSize();
    const isMobile = viewport.w <= 460;

    return (
      <div ref={sceneRef} className="book-scene relative flex flex-col items-center">
        {/* Ground shadow */}
        <div
          ref={shadowRef}
          className="pointer-events-none absolute -bottom-[22px] left-1/2 h-7 -translate-x-1/2 rounded-[50%] blur-[8px]"
          style={{
            width: (size.bookW / 2) * 0.88,
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 70%)",
          }}
        />

        {/* Book 3D Container */}
        <div
          ref={bookRef}
          className="book relative"
          style={{
            width: size.bookW / 2,
            height: size.bookH,
            transformStyle: "preserve-3d",
            transform: reducedMotion
              ? "none"
              : "perspective(1400px) rotateY(-8deg) rotateX(4deg)",
            filter: reducedMotion
              ? "none"
              : "drop-shadow(0 30px 60px rgba(0,0,0,0.65)) drop-shadow(0 0 40px rgba(140,10,10,0.12))",
            transition: reducedMotion ? "none" : "transform 0.4s ease",
          }}
          onMouseEnter={(e) => {
            if (reducedMotion || stateRef.current.opened) return;
            gsap.to(e.currentTarget, {
              rotateY: -5,
              rotateX: 2,
              duration: 0.4,
              overwrite: "auto",
            });
          }}
          onMouseLeave={(e) => {
            if (reducedMotion || stateRef.current.opened) return;
            gsap.to(e.currentTarget, {
              rotateY: -8,
              rotateX: 4,
              duration: 0.4,
              overwrite: "auto",
            });
          }}
        >
          {/* Book Back (depth) */}
          <div
            ref={bookBackRef}
            className="absolute inset-0 rounded-r-md"
            style={{
              background: "linear-gradient(145deg, #4a0000, #2e0000)",
              transform: "translateZ(-14px)",
            }}
          />

          {/* Pages Thickness Edge */}
          <div
            ref={pageEdgeRef}
            className="absolute bottom-1 right-[-10px] top-1"
            style={{
              width: 10,
              background:
                "repeating-linear-gradient(180deg, #f4e8c8 0px, #f4e8c8 1.5px, #e8d8b0 1.5px, #e8d8b0 3px)",
              transform: "translateZ(-7px) rotateY(90deg)",
              transformOrigin: "right center",
            }}
          />

          {/* ── COVER ── */}
          <div
            ref={coverRef}
            className="cover absolute inset-0 z-30 cursor-pointer overflow-hidden rounded-r-md outline-none"
            style={{
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
              background:
                "linear-gradient(160deg, #b81818 0%, #cc1f1f 18%, #d42222 38%, #be1c1c 55%, #a81515 72%, #8e0e0e 88%, #780a0a 100%)",
              boxShadow:
                "inset 2px 0 8px rgba(255,255,255,0.06), inset -1px 0 4px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!stateRef.current.opened) openBook();
            }}
          >
            {/* Cover back face */}
            <div
              className="absolute inset-0 rounded-r-md"
              style={{
                background:
                  "linear-gradient(145deg, #6e0a0a 0%, #580808 50%, #400606 100%)",
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
              }}
            />

            {/* Leather texture */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.018) 3px, rgba(255,255,255,0.018) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.022) 3px, rgba(0,0,0,0.022) 4px)",
                backfaceVisibility: "hidden",
              }}
            />

            {/* Ring band (left spine edge) */}
            <div
              className="absolute bottom-0 left-0 top-0 z-[2] flex flex-col items-center justify-evenly border-r border-black/35"
              style={{
                width: 24,
                background:
                  "linear-gradient(90deg, #5c0606 0%, #740a0a 60%, #680808 100%)",
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[11px] w-[11px] rounded-full border border-black/50"
                  style={{
                    background: "#0e0e1c",
                    boxShadow:
                      "inset 0 1px 3px rgba(0,0,0,0.6), 0 0.5px 0 rgba(255,255,255,0.06)",
                  }}
                />
              ))}
            </div>

            {/* Cover border */}
            <div
              className="pointer-events-none absolute inset-[10px] left-[30px] rounded-sm border border-white/8"
              style={{ backfaceVisibility: "hidden" }}
            />

            {/* Cover body content */}
            <div
              className="absolute inset-0 left-[28px] flex flex-col items-center justify-center gap-[10px] px-[22px] py-5 text-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              {/* Badge */}
              <span
                className="rounded-sm border border-white/20 px-[10px] py-[3px] text-[0.46rem] font-bold uppercase tracking-[5px] text-white/40"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                SỔ TAY
              </span>

              {/* Red Cross */}
              <div className="flex items-center justify-center">
                <svg
                  width="60"
                  height="60"
                  viewBox="0 0 60 60"
                  className="drop-shadow-[0_3px_14px_rgba(255,255,255,0.18)]"
                  style={{
                    animation: reducedMotion
                      ? "none"
                      : "crossPulse 3.5s ease-in-out infinite",
                  }}
                >
                  <rect
                    x="16"
                    y="0"
                    width="28"
                    height="60"
                    rx="4"
                    fill="white"
                    opacity="0.95"
                  />
                  <rect
                    x="0"
                    y="16"
                    width="60"
                    height="28"
                    rx="4"
                    fill="white"
                    opacity="0.95"
                  />
                </svg>
              </div>

              {/* Title */}
              <h1
                className="m-0 font-black uppercase leading-[1.08] tracking-[0.1em] text-white"
                style={{
                  fontSize: "clamp(1rem, 3.4vw, 1.9rem)",
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.1), 0 3px 18px rgba(0,0,0,0.55)",
                }}
              >
                Sổ tay
                <br />
                Sơ cứu
              </h1>

              {/* Rule */}
              <div
                className="h-[1.5px] w-[50px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent)",
                }}
              />

              {/* Subtitle */}
              <p
                className="font-medium leading-[1.55] text-white/45"
                style={{ fontSize: "clamp(0.42rem, 1vw, 0.58rem)" }}
              >
                Hướng dẫn sơ cứu cơ bản
                <br />
                cho mọi tình huống khẩn cấp
              </p>

              {/* Brand */}
              <span
                className="uppercase tracking-[0.32em] text-white/20"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "clamp(0.34rem, 0.8vw, 0.46rem)",
                }}
              >
                SafeQR
              </span>

              {/* Open button */}
              <button
                className="inline-flex items-center justify-center gap-[7px] rounded border border-white/25 bg-white/10 px-[22px] py-2 font-bold tracking-[0.05em] text-white/90 transition-all hover:translate-y-[-2px] hover:border-white/50 hover:bg-white/20 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] active:translate-y-0 active:scale-95"
                style={{ fontSize: "clamp(0.58rem, 1.3vw, 0.72rem)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  openBook();
                }}
              >
                📖 Mở sổ tay
              </button>
            </div>

            {/* Shimmer sweep */}
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div
                className="animate-shimmer absolute top-0 h-full w-[40%] -skew-x-[8deg]"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.05) 55%, transparent 100%)",
                }}
              />
            </div>

            {/* Cover page edge (visible when closed) */}
            <div
              ref={coverPageEdgeRef}
              className="absolute bottom-1 right-[-7px] top-1 rounded-r-[3px]"
              style={{
                width: 7,
                background:
                  "repeating-linear-gradient(180deg, #f4e8c8 0px, #f4e8c8 1.5px, #e8d8b0 1.5px, #e8d8b0 3px)",
                boxShadow: "2px 0 5px rgba(0,0,0,0.25)",
              }}
            />
          </div>

          {/* ── OPEN BOOK SPREAD ── */}
          <div
            ref={spreadRef}
            className="absolute inset-0 z-[1] flex overflow-hidden rounded-r-md"
            style={{
              background: "#ffffff",
              colorScheme: "light",
            }}
          >
            {/* Left page */}
            <div
              className="relative flex h-full w-1/2 flex-col overflow-y-auto bg-white"
              style={{
                boxShadow: "inset -8px 0 16px rgba(0,0,0,0.07)",
                colorScheme: "light",
                // Ruled lines
                backgroundImage:
                  "repeating-linear-gradient(180deg, transparent 0px, transparent 23px, rgba(160,140,100,0.1) 23px, rgba(160,140,100,0.1) 24px)",
              }}
            >
              <div style={{ padding: size.pad }} className="min-h-full">
                {spread.left && <TopicRenderer topic={spread.left} />}
              </div>
            </div>

            {/* Spine */}
            <div
              ref={spineRef}
              className="relative z-[2] w-3 flex-shrink-0 opacity-0"
              style={{
                background:
                  "linear-gradient(90deg, #c8bfa8, #e0d5bc, #c8bfa8)",
                boxShadow:
                  "inset -2px 0 4px rgba(0,0,0,0.1), inset 2px 0 4px rgba(0,0,0,0.08)",
              }}
            >
              <div
                className="absolute left-1/2 top-[15%] bottom-[15%] w-px -translate-x-1/2 bg-white/40"
              />
            </div>

            {/* Right page */}
            <div
              ref={spreadRightRef}
              className="relative flex h-full w-1/2 flex-col overflow-y-auto bg-white opacity-0"
              style={{
                colorScheme: "light",
                backgroundImage:
                  "repeating-linear-gradient(180deg, transparent 0px, transparent 23px, rgba(160,140,100,0.1) 23px, rgba(160,140,100,0.1) 24px)",
              }}
            >
              <div style={{ padding: size.pad }} className="min-h-full">
                {spread.right && (
                  <TopicRenderer topic={spread.right} isRightPage />
                )}
              </div>
            </div>
          </div>

          {/* ── FLIP LEAF (page flip animation) ── */}
          <div
            ref={flipLeafRef}
            className="absolute right-0 top-0 z-10 h-full w-1/2"
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "left center",
              visibility: "hidden",
              willChange: "transform",
            }}
          >
            {/* Flip leaf front face */}
            <div
              ref={flipFrontRef}
              className="absolute inset-0 overflow-hidden bg-white"
              style={{
                backfaceVisibility: "hidden",
                colorScheme: "light",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-[2]"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.04) 12%, transparent 30%, transparent 70%, rgba(0,0,0,0.03) 88%, rgba(0,0,0,0.1) 100%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, transparent 0px, transparent 23px, rgba(160,140,100,0.1) 23px, rgba(160,140,100,0.1) 24px)",
                }}
              />
              <div
                className="relative z-[1]"
                style={{ padding: size.pad }}
              >
                <TopicRenderer
                  topic={nextSpread.left || COVER_INSIDE}
                />
              </div>
            </div>

            {/* Flip leaf back face */}
            <div
              ref={flipBackRef}
              className="absolute inset-0 overflow-hidden bg-white"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                colorScheme: "light",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-[2]"
                style={{
                  background:
                    "linear-gradient(270deg, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.1) 8%, transparent 28%, transparent 100%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, transparent 0px, transparent 23px, rgba(160,140,100,0.1) 23px, rgba(160,140,100,0.1) 24px)",
                }}
              />
              <div
                className="relative z-[1]"
                style={{ padding: size.pad }}
              >
                <TopicRenderer
                  topic={spread.left || COVER_INSIDE}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Close button (light theme) ── */}
        <button
          onClick={closeBook}
          className={`absolute left-[10px] top-[10px] z-40 inline-flex items-center gap-[5px] rounded-[5px] border px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.03em] transition-all hover:translate-y-[-1px] hover:text-red-700 active:scale-95 ${
            bookOpened ? "inline-flex" : "hidden"
          }`}
          style={{
            background: "rgba(255,255,255,0.92)",
            borderColor: "rgba(0,0,0,0.1)",
            color: "#4a4a4a",
            backdropFilter: "blur(8px)",
            colorScheme: "only light",
          }}
        >
          ✕ Đóng sách
        </button>

        {/* ── TOC button (light theme) ── */}
        <button
          onClick={onTocOpen}
          className={`fixed bottom-5 right-[18px] z-50 inline-flex items-center gap-1.5 rounded-3xl border px-4 py-2 text-xs font-semibold transition-all hover:translate-y-[-1px] hover:text-red-700 ${
            bookOpened ? "inline-flex" : "hidden"
          }`}
          style={{
            background: "rgba(255,255,255,0.94)",
            borderColor: "rgba(0,0,0,0.1)",
            color: "#555",
            backdropFilter: "blur(10px)",
            colorScheme: "only light",
          }}
        >
          📑 Mục lục
        </button>
      </div>
    );
  }
);

export default BookScene;
