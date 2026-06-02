// ============================================
// SafeQR v2 — Phone & Maps Utilities
// ============================================

/**
 * Detect if the device is a mobile phone (can make calls).
 */
export function isMobilePhone(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    ua
  );
}

/**
 * Initiate a phone call. On desktop, returns the number for modal display.
 */
export function makeCall(phone: string): boolean {
  const cleaned = phone.replace(/[^\d+#*]/g, "");
  if (!cleaned) return false;

  try {
    window.location.href = `tel:${cleaned}`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Open Google Maps with a search query.
 */
export function openMaps(query: string): void {
  const encoded = encodeURIComponent(query);
  const mapsUrl = `https://www.google.com/maps/search/${encoded}`;
  try {
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = mapsUrl;
  }
}

/**
 * Get text to copy for sharing location.
 */
export function getShareText(lat: number, lng: number): string {
  return `Vị trí hiện tại của tôi:\nhttps://www.google.com/maps?q=${lat},${lng}`;
}
