-- ============================================================
-- SafeQR – Emergency Reports Table
-- Migration 0002: Emergency location reporting with live map
-- ============================================================
-- Run: wrangler d1 execute safeqr-db --file=./migrations/0002_emergency_reports.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS emergency_reports (
  id              TEXT PRIMARY KEY,
  emergency_type  TEXT NOT NULL,
  latitude        REAL NOT NULL,
  longitude       REAL NOT NULL,
  accuracy        REAL,
  address         TEXT,
  reporter_ip     TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT NOT NULL DEFAULT (datetime('now', '+24 hours'))
);

CREATE INDEX IF NOT EXISTS idx_emergency_created
  ON emergency_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_expires
  ON emergency_reports(expires_at);
