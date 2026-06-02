-- SafeQR News Posts / Bảng tin
-- Allows administrative agencies to publish announcements
CREATE TABLE IF NOT EXISTS news_posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id   TEXT NOT NULL REFERENCES contacts(id),
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL,
  image_url   TEXT DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'general',  -- general, safety, health, traffic, weather, other
  is_pinned   INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_agency ON news_posts(agency_id);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_posts(category);
CREATE INDEX IF NOT EXISTS idx_news_created ON news_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_pinned ON news_posts(is_pinned);
