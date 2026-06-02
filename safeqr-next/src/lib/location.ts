// ============================================
// SafeQR v2 — Geolocation Utilities + Reverse Geocoding
// ============================================

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface ReverseGeoResult {
  ward: string;
  district: string;
  city: string;
  displayName: string;
}

/** Get current position with timeout */
export function getCurrentPosition(
  timeoutMs: number = 10000
): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Trinh duyet khong ho tro dinh vi"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 300000 }
    );
  });
}

/** Reverse geocode lat/lng to address using Nominatim (OpenStreetMap) */
export async function reverseGeocode(
  pos: GeoPosition
): Promise<ReverseGeoResult | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=16&addressdetails=1&accept-language=vi`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "SafeQR/2.0 (emergency QR)" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const addr = data.address || {};

    const ward =
      addr.quarter || addr.suburb || addr.neighbourhood || addr.village || "";
    const district = addr.city_district || addr.district || addr.county || "";
    const city = addr.city || addr.state || addr.province || "";

    return { ward, district, city, displayName: data.display_name || "" };
  } catch {
    return null;
  }
}

/** Share location via Web Share API or clipboard fallback */
export async function shareLocation(position?: GeoPosition): Promise<boolean> {
  try {
    let pos = position;
    if (!pos) pos = await getCurrentPosition();
    const url = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
    const text = `Vi tri hien tai cua toi:\n${url}`;

    if (navigator.share) {
      await navigator.share({ title: "Vi tri khan cap", text, url });
    } else {
      await navigator.clipboard.writeText(text);
    }
    return true;
  } catch {
    return false;
  }
}
