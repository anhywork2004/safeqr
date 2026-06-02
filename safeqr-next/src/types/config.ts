// ============================================
// SafeQR v2 — Site Config Types
// ============================================

export interface SiteConfig {
  appName: string;
  tagline: string;
  locality: string;
  sosPhone: string;
  version: string;
}

export const DEFAULT_CONFIG: SiteConfig = {
  appName: "QR Khẩn Cấp",
  tagline: "An toàn trong tầm tay — Một chạm, cứu mạng",
  locality: "TP. Thủ Đức",
  sosPhone: "112",
  version: "2.0.0",
};
