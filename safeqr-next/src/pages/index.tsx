// ============================================
// SafeQR v2 — Home Page (Emergency Contacts)
// Tự động phát hiện phường qua GPS + cho phép chọn thủ công
// ============================================
import React, { useCallback, useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import HeroSection from "@/components/home/HeroSection";
import ContactGrid from "@/components/home/ContactGrid";
import ExtraNumbers from "@/components/home/ExtraNumbers";
import SOSButton from "@/components/home/SOSButton";
import ChatButton from "@/components/home/ChatButton";
import PhoneModal from "@/components/ui/PhoneModal";
import WardSelector from "@/components/home/WardSelector";
import { useContacts } from "@/hooks/useContacts";
import { makeCall, isMobilePhone, openMaps } from "@/lib/phone";
import { useToastContext } from "@/context/ToastContext";
import { DEFAULT_EXTERNAL_NUMBERS } from "@/data/contacts";
import { getCurrentPosition, reverseGeocode } from "@/lib/location";
import { getItem, setItem } from "@/lib/storage";
import { getWardById, DEFAULT_WARD_ID, type WardInfo } from "@/data/wards";
import type { EmergencyContact } from "@/types";

const STORAGE_KEY_WARD = "safeqr_selected_ward";

export default function HomePage() {
  const { contacts, config, loading, isOffline } = useContacts();
  const { showToast } = useToastContext();

  // ── Ward state ──
  const [selectedWard, setSelectedWard] = useState<WardInfo | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [showWardPicker, setShowWardPicker] = useState(false);

  // ── Định vị GPS → tìm phường gần nhất ──
  useEffect(() => {
    async function detectWard() {
      // 1. Check stored preference first
      const stored = getItem<string | null>(STORAGE_KEY_WARD, null);
      if (stored) {
        const ward = getWardById(stored);
        if (ward) {
          setSelectedWard(ward);
          setDetectingLocation(false);
          return;
        }
      }

      // 2. Try GPS + reverse geocoding
      try {
        const pos = await getCurrentPosition(5000);
        const geo = await reverseGeocode(pos);

        // Try to match to known wards
        if (geo) {
          // Import dynamically to avoid circular dependency
          const { WARDS } = await import("@/data/wards");
          const searchStr = `${geo.ward} ${geo.district}`.toLowerCase();

          // Find best matching ward
          let bestMatch: WardInfo | undefined;
          for (const w of WARDS) {
            const wardLower = w.name.toLowerCase();
            if (searchStr.includes(wardLower)) {
              bestMatch = w;
              break;
            }
          }

          if (bestMatch) {
            setSelectedWard(bestMatch);
            setItem(STORAGE_KEY_WARD, bestMatch.id);
          }
        }
      } catch {
        // GPS failed or user denied — use default
      }

      // 3. Fallback to default ward
      if (!selectedWard) {
        const defaultWard = getWardById(DEFAULT_WARD_ID);
        if (defaultWard) setSelectedWard(defaultWard);
      }

      setDetectingLocation(false);
    }

    detectWard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Khi user chọn phường thủ công ──
  const handleSelectWard = useCallback((ward: WardInfo) => {
    setSelectedWard(ward);
    setItem(STORAGE_KEY_WARD, ward.id);
    setShowWardPicker(false);
    showToast(`Da chon: ${ward.name}`, "info");
  }, [showToast]);

  // ── Merge ward-specific contacts ──
  const wardContacts: EmergencyContact[] = React.useMemo(() => {
    if (!selectedWard) return contacts;

    // Replace generic contacts with ward-specific data
    const overrides: Partial<Record<string, Partial<EmergencyContact>>> = {
      medical: {
        name: `Cap cuu — ${selectedWard.nearestHospital}`,
        phone: selectedWard.nearestHospitalPhone,
        address: selectedWard.nearestHospital,
        mapsQuery: selectedWard.nearestHospital,
      },
      fire: {
        address: selectedWard.nearestFireStation,
        mapsQuery: selectedWard.nearestFireStation,
      },
      police: {
        address: selectedWard.policeStation,
        mapsQuery: selectedWard.policeStation,
        phone: selectedWard.policePhone,
      },
      ward: {
        name: `UBND phuong ${selectedWard.name}`,
        address: selectedWard.wardOffice,
        mapsQuery: selectedWard.wardOffice,
        phone: selectedWard.wardPhone,
      },
    };

    return contacts.map((c) => {
      const override = overrides[c.id];
      if (override) return { ...c, ...override };
      return c;
    });
  }, [contacts, selectedWard]);

  const [phoneModal, setPhoneModal] = useState<{
    phone: string;
    visible: boolean;
  }>({ phone: "", visible: false });

  const handleCall = useCallback(
    (phone: string, name: string, color: string) => {
      if (isMobilePhone()) {
        makeCall(phone);
      } else {
        setPhoneModal({ phone, visible: true });
      }
      showToast(`Dang goi ${name}...`, "info");
    },
    [showToast]
  );

  const handleMaps = useCallback(
    (query: string) => {
      openMaps(query);
      showToast("Dang mo ban do...", "info");
    },
    [showToast]
  );

  // ── Build locality string từ ward ──
  const locality = selectedWard
    ? `P. ${selectedWard.name}, TP. Thu Duc, TP. HCM`
    : config.locality;

  return (
    <Layout>
      {/* Offline Banner */}
      {isOffline && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-center text-xs font-medium text-yellow-800">
          ⚠️ Dang o che do ngoại tuyến — Du liệu co thể chưa được cập nhật mới nhất
        </div>
      )}

      {/* Hero */}
      <HeroSection
        locality={locality}
        detectingLocation={detectingLocation}
        onPickWard={() => setShowWardPicker(true)}
        selectedWardName={selectedWard?.name || null}
      />

      {/* Ward Picker Modal */}
      {showWardPicker && (
        <WardSelector
          onSelect={handleSelectWard}
          onClose={() => setShowWardPicker(false)}
        />
      )}

      {/* Contact Grid with ward-specific data */}
      <ContactGrid
        contacts={wardContacts}
        loading={loading}
        onCall={handleCall}
        onMaps={handleMaps}
      />

      {/* Extra Numbers */}
      <ExtraNumbers
        numbers={DEFAULT_EXTERNAL_NUMBERS}
        onCall={handleCall}
      />

      {/* Floating Buttons */}
      <SOSButton onCall={handleCall} />
      <ChatButton />

      {/* Desktop Phone Modal */}
      <PhoneModal
        phone={phoneModal.phone}
        visible={phoneModal.visible}
        onClose={() => setPhoneModal({ phone: "", visible: false })}
      />
    </Layout>
  );
}
