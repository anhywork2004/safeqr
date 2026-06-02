-- ============================================================
-- SafeQR – Localities & Per-Locality Contacts
-- Migration 0003: Multi-ward admin system
-- ============================================================
-- Run: wrangler d1 execute safeqr-db --file=./migrations/0003_localities.sql
-- ============================================================

-- 1. Create localities table (one row per ward/commune)
CREATE TABLE IF NOT EXISTS localities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Add locality_id to existing contacts table
-- NULL = global contact (115, 114, 113, 112...)
-- non-NULL = local contact for a specific ward
ALTER TABLE contacts ADD COLUMN locality_id TEXT DEFAULT NULL;

-- 3. Index for locality-based queries
CREATE INDEX IF NOT EXISTS idx_contacts_locality ON contacts(locality_id);

-- 4. Seed sample localities (password = "safeqr2026" hashed)
-- Password hash is PBKDF2-SHA256 of "safeqr2026"
-- Generated with: PBKDF2-SHA256, 100k iterations, random salt
-- NOTE: Replace these hashes with real ones after first deployment
--       or change passwords immediately via admin dashboard.

INSERT OR IGNORE INTO localities (id, name, district, city, password_hash)
VALUES
  ('phuong-hiep-phu', 'Phường Hiệp Phú', 'TP. Thủ Đức', 'TP. Hồ Chí Minh',
   '$pbkdf2-sha256$100000$c2FsdHBsYWNlaG9sZGVy$PLACEHOLDER_HASH'),
  ('phuong-linh-trung', 'Phường Linh Trung', 'TP. Thủ Đức', 'TP. Hồ Chí Minh',
   '$pbkdf2-sha256$100000$c2FsdHBsYWNlaG9sZGVy$PLACEHOLDER_HASH'),
  ('phuong-binh-tho', 'Phường Bình Thọ', 'TP. Thủ Đức', 'TP. Hồ Chí Minh',
   '$pbkdf2-sha256$100000$c2FsdHBsYWNlaG9sZGVy$PLACEHOLDER_HASH');

-- 5. Seed local contacts for Phường Hiệp Phú
INSERT OR IGNORE INTO contacts (id, name, phone, address, maps_query, icon, color, description, locality_id)
VALUES
  ('hiep-phu-medical', 'Trạm Y tế P. Hiệp Phú', '028.3896.1234',
   'Đường Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức',
   'Trạm y tế phường Hiệp Phú', '🏥', '#e74c3c',
   'Khám chữa bệnh, sơ cứu ban đầu cho người dân trong phường.', 'phuong-hiep-phu'),
  ('hiep-phu-police', 'Công an P. Hiệp Phú', '028.3896.5678',
   'Đường Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức',
   'Công an phường Hiệp Phú', '👮', '#2c3e50',
   'Tiếp nhận tin báo an ninh trật tự, trộm cắp, gây rối trên địa bàn phường.', 'phuong-hiep-phu'),
  ('hiep-phu-ward', 'UBND P. Hiệp Phú', '028.3896.9012',
   'Đường Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức',
   'UBND phường Hiệp Phú', '🏛️', '#9b59b6',
   'Tiếp nhận phản ánh khẩn cấp về hạ tầng, an ninh, cứu trợ trong phường.', 'phuong-hiep-phu');

-- 6. Seed local contacts for Phường Linh Trung
INSERT OR IGNORE INTO contacts (id, name, phone, address, maps_query, icon, color, description, locality_id)
VALUES
  ('linh-trung-medical', 'Trạm Y tế P. Linh Trung', '028.3897.1234',
   'Đường Hoàng Diệu 2, P. Linh Trung, TP. Thủ Đức',
   'Trạm y tế phường Linh Trung', '🏥', '#e74c3c',
   'Khám chữa bệnh, sơ cứu ban đầu cho người dân trong phường.', 'phuong-linh-trung'),
  ('linh-trung-police', 'Công an P. Linh Trung', '028.3897.5678',
   'Đường Hoàng Diệu 2, P. Linh Trung, TP. Thủ Đức',
   'Công an phường Linh Trung', '👮', '#2c3e50',
   'Tiếp nhận tin báo an ninh trật tự trên địa bàn phường.', 'phuong-linh-trung');

-- 7. Seed local contacts for Phường Bình Thọ
INSERT OR IGNORE INTO contacts (id, name, phone, address, maps_query, icon, color, description, locality_id)
VALUES
  ('binh-tho-medical', 'Trạm Y tế P. Bình Thọ', '028.3898.1234',
   'Đường Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức',
   'Trạm y tế phường Bình Thọ', '🏥', '#e74c3c',
   'Khám chữa bệnh, sơ cứu ban đầu cho người dân trong phường.', 'phuong-binh-tho'),
  ('binh-tho-ward', 'UBND P. Bình Thọ', '028.3898.5678',
   'Đường Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức',
   'UBND phường Bình Thọ', '🏛️', '#9b59b6',
   'Tiếp nhận phản ánh khẩn cấp về hạ tầng, cứu trợ trong phường.', 'phuong-binh-tho');

-- 8. Mark existing 6 contacts as GLOBAL (locality_id stays NULL)
-- No action needed — existing contacts already have NULL locality_id
-- Only update descriptions to clarify they are national/regional
UPDATE contacts SET description = 'Gọi cấp cứu khi có tai nạn, đột quỵ, khó thở, chấn thương nặng. Số toàn quốc.' WHERE id = 'medical';
UPDATE contacts SET description = 'Gọi khi xảy ra cháy nổ, sập nhà, cứu nạn trong đám cháy. Số toàn quốc.' WHERE id = 'fire';
UPDATE contacts SET description = 'Gọi khi cần hỗ trợ an ninh, trộm cắp, tai nạn giao thông. Số toàn quốc.' WHERE id = 'police';
