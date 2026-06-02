// ============================================
// SafeQR v2 — Hero Section with Hotline Buttons
// Hỗ trợ hiển thị phường thực của user + GPS detection
// ============================================
import React, { useEffect, useRef } from "react";
import HotlineButton from "./HotlineButton";
import { HOTLINE_NUMBERS } from "@/lib/constants";
import { makeCall } from "@/lib/phone";
import gsap from "gsap";

interface HeroSectionProps {
  locality: string;
  detectingLocation?: boolean;
  onPickWard?: () => void;
  selectedWardName?: string | null;
}

export default function HeroSection({
  locality,
  detectingLocation = false,
  onPickWard,
  selectedWardName,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-title", {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });
      gsap.from(".hero-desc", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        delay: 0.15,
      });
      gsap.from(".hero-flag", {
        scale: 0.8,
        opacity: 0,
        duration: 0.4,
        delay: 0.2,
        ease: "back.out(1.7)",
      });
      gsap.from(".hotline-btn", {
        scale: 0.8,
        opacity: 0,
        stagger: 0.08,
        duration: 0.4,
        delay: 0.3,
        ease: "back.out(1.7)",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-red-700 via-red-600 to-red-800 px-4 pb-16 pt-10"
    >
      {/* Curved bottom */}
      <div className="absolute -bottom-1 left-0 right-0">
        <svg
          viewBox="0 0 1440 60"
          className="h-12 w-full fill-warm-100 sm:h-16"
          preserveAspectRatio="none"
        >
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </div>

      {/* Red cross background icon */}
      <div className="pointer-events-none absolute -right-8 top-4 select-none text-[180px] leading-none text-white/5 sm:text-[240px]">
        +
      </div>

      <div className="relative mx-auto max-w-page-lg text-center">
        {/* Locality badge — shows GPS-detected ward or manual selection */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="hero-flag mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            {detectingLocation ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Đang xac đinh vị tri...
              </>
            ) : (
              <>
                🇻🇳 {locality}
              </>
            )}
          </span>

          {/* Manual ward picker button */}
          {onPickWard && !detectingLocation && (
            <button
              onClick={onPickWard}
              className="hero-flag mb-4 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              style={{ animationDelay: "0.25s" }}
            >
              {selectedWardName ? "📍 Đoi phuong" : "📍 Chon phuong"}
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="hero-title mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
          QR Khẩn Cấp
        </h1>

        {/* Description */}
        <p className="hero-desc mx-auto mt-4 max-w-md text-base text-white/85 sm:text-lg">
          Dịch vu cứu hộ, cứu nạn & cấp cứu gần bạn nhất
        </p>

        {/* Hotline Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {HOTLINE_NUMBERS.map((h) => (
            <HotlineButton
              key={h.number}
              number={h.number}
              label={h.label}
              color={h.color}
              onClick={() => makeCall(h.number)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
