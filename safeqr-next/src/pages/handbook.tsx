// ============================================
// SafeQR v2 — Premium 3D First-Aid Handbook Page
// NỀN TRẮNG CỐ ĐỊNH — không bị ảnh hưởng bởi
// light mode hay dark mode của trình duyệt
// ============================================
import React, { useState, useCallback, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import ParticleBackground from "@/components/handbook/ParticleBackground";
import BookScene, {
  type BookSceneHandle,
} from "@/components/handbook/BookScene";
import BookControls from "@/components/handbook/BookControls";
import DotIndicators from "@/components/handbook/DotIndicators";
import TableOfContents from "@/components/handbook/TableOfContents";
import { SPREADS } from "@/data/handbook-topics";

export default function HandbookPage() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [bookOpened, setBookOpened] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const bookRef = useRef<BookSceneHandle>(null);

  // Check reduced motion preference
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Book state change callback
  const handleStateChange = useCallback(
    (spread: number, opened: boolean) => {
      setCurrentSpread(spread);
      setBookOpened(opened);
    },
    []
  );

  // Navigation
  const goPrev = useCallback(() => {
    bookRef.current?.flipToSpread(currentSpread - 1);
  }, [currentSpread]);

  const goNext = useCallback(() => {
    bookRef.current?.flipToSpread(currentSpread + 1);
  }, [currentSpread]);

  const goToSpread = useCallback((index: number) => {
    bookRef.current?.flipToSpread(index);
  }, []);

  return (
    <>
      <Head>
        <title>Sổ tay Sơ cứu — SafeQR</title>
        <meta
          name="description"
          content="Sổ tay sơ cứu cơ bản: bỏng, cháy, đột quỵ, CPR, tai nạn giao thông, điện giật. Hướng dẫn từng bước."
        />
        {/* KHÓA color-scheme: chỉ light — dark mode không được phép can thiệp */}
        <meta name="color-scheme" content="light only" />
        <meta name="theme-color" content="#ffffff" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/*
        NỀN TRẮNG CỐ ĐỊNH — tất cả màu đều hardcode,
        không dùng CSS variables có thể bị dark mode ghi đè.
        color-scheme: only light — buộc trình duyệt tôn trọng.
      */}
      <div
        className="fixed inset-0"
        style={{
          backgroundColor: "#ffffff",
          colorScheme: "only light",
        }}
      />

      {/* Particle canvas — vô hiệu trên nền trắng hoặc đổi màu hạt */}
      <ParticleBackground reducedMotion={true} />

      {/* Content */}
      <div
        className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-20"
        style={{ colorScheme: "only light" }}
      >
        {/* Back link */}
        <Link
          href="/"
          className="fixed left-[18px] top-[18px] z-[100] inline-flex items-center gap-1.5 rounded-[20px] border px-4 py-2 text-[0.78rem] font-semibold transition-all hover:translate-x-[-2px]"
          style={{
            backgroundColor: "rgba(0,0,0,0.04)",
            borderColor: "rgba(0,0,0,0.1)",
            color: "#5a5a5a",
            colorScheme: "only light",
          }}
        >
          ← Về trang chủ
        </Link>

        {/* Book Scene */}
        <BookScene
          ref={bookRef}
          reducedMotion={reducedMotion}
          onStateChange={handleStateChange}
          onTocOpen={() => setTocOpen(true)}
        />

        {/* Navigation Controls */}
        <BookControls
          visible={bookOpened}
          currentPage={currentSpread}
          totalPages={SPREADS.length}
          onPrev={goPrev}
          onNext={goNext}
        />

        {/* Dot Navigation */}
        <DotIndicators
          total={SPREADS.length}
          active={currentSpread}
          onDotClick={goToSpread}
        />
      </div>

      {/* Table of Contents Modal */}
      <TableOfContents
        isOpen={tocOpen}
        active={currentSpread}
        onSelect={goToSpread}
        onClose={() => setTocOpen(false)}
      />
    </>
  );
}
