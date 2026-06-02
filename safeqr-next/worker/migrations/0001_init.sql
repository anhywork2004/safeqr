-- SafeQR D1 Database Schema
-- Migration 0001: Initial setup

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  maps_query TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#c62828',
  description TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS passwords (
  agency_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default emergency contacts
INSERT OR IGNORE INTO contacts (id, name, phone, address, maps_query, icon, color, description) VALUES
('medical', 'Cấp cứu y tế', '115', 'Bệnh viện Đa khoa khu vực Thủ Đức\n64 Lê Văn Việt, P. Hiệp Phú', 'Bệnh viện Đa khoa khu vực Thủ Đức', '🚑', '#e74c3c', 'Gọi cấp cứu khi có tai nạn, đột quỵ, khó thở, chấn thương nặng.'),
('fire', 'Cảnh sát PCCC & CNCH', '114', 'Đội PCCC Thủ Đức\n6A Đường số 12, P. Linh Trung', 'Đội PCCC Thủ Đức', '🚒', '#e67e22', 'Gọi khi xảy ra cháy nổ, sập nhà, cứu nạn trong đám cháy.'),
('police', 'Công an địa phương', '113', 'Công an phường sở tại\nLiên hệ theo địa bàn cư trú', 'Công an phường gần nhất', '👮', '#2c3e50', 'Gọi khi cần hỗ trợ an ninh, trộm cắp, tai nạn giao thông.'),
('electricity', 'Điện lực', '19001006', 'Điện lực Thủ Đức\n72 Võ Văn Ngân, P. Bình Thọ', 'Điện lực Thủ Đức', '⚡', '#f39c12', 'Báo sự cố điện: chập điện, đứt dây, mất điện kéo dài.'),
('water', 'Cấp nước', '19001047', 'Công ty Cấp nước Thủ Đức\nSố 2 Đường số 8, P. Linh Xuân', 'Công ty Cấp nước Thủ Đức', '💧', '#3498db', 'Báo vỡ đường ống, rò rỉ nước, mất nước đột ngột.'),
('ward', 'Đường dây nóng UBND phường', '19001133', 'UBND phường sở tại\nLiên hệ theo địa bàn cư trú', 'UBND phường gần nhất', '🆘', '#9b59b6', 'Phản ánh khẩn cấp về an ninh trật tự, sự cố hạ tầng, cứu trợ.');

-- Default passwords (plain text for initial — will be replaced with hashed versions)
INSERT OR IGNORE INTO passwords (agency_id, password_hash) VALUES
('medical', 'medical2024'),
('fire', 'fire2024'),
('police', 'police2024'),
('electricity', 'electricity2024'),
('water', 'water2024'),
('ward', 'ward2024');

-- Site config
INSERT OR IGNORE INTO site_config (key, value) VALUES
('locality', 'TP. Thủ Đức, TP. Hồ Chí Minh'),
('sos_phone', '112'),
('version', '1.0.0'),
('app_name', 'SafeQR – QR Khẩn Cấp');
