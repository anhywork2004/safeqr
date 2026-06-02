// ============================================
// SafeQR v2 — Emergency Contact Grid
// ============================================
import React, { useEffect, useRef } from "react";
import ContactCard from "./ContactCard";
import type { EmergencyContact } from "@/types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ContactGridProps {
  contacts: EmergencyContact[];
  loading: boolean;
  onCall: (phone: string, name: string, color: string) => void;
  onMaps: (query: string) => void;
}

export default function ContactGrid({
  contacts,
  loading,
  onCall,
  onMaps,
}: ContactGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      gsap.from(".card-wrapper", {
        y: 40,
        opacity: 0,
        duration: 0.5,
        stagger: { each: 0.06, grid: [2, 3], from: "start" },
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 85%",
        },
      });
    }, gridRef);

    return () => ctx.revert();
  }, [loading]);

  return (
    <section className="px-4 pt-10" id="contacts">
      <div className="mx-auto max-w-page-lg">
        <h2 className="mb-2 text-center text-xl font-extrabold text-warm-800 sm:text-2xl">
          Danh bạ khẩn cấp
        </h2>
        <p className="mb-8 text-center text-sm text-warm-500">
          Một chạm để gọi — luôn sẵn sàng khi bạn cần
        </p>

        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {(loading ? contacts : contacts).map((contact) => (
            <div key={contact.id} className="card-wrapper">
              <ContactCard
                contact={contact}
                onCall={onCall}
                onMaps={onMaps}
                loading={loading}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
