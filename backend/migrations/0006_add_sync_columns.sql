-- 0006: Add sync columns (updated_at, updated_by) to tables missing them
-- These columns enable conflict-free offline sync between Desktop and Web

ALTER TABLE gia_ban_tier ADD COLUMN updated_at TEXT;
ALTER TABLE gia_ban_tier ADD COLUMN updated_by TEXT;

ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN updated_at TEXT;
ALTER TABLE so_chi_tiet_ban_hang ADD COLUMN updated_by TEXT;

ALTER TABLE don_hang_excel ADD COLUMN updated_at TEXT;
ALTER TABLE don_hang_excel ADD COLUMN updated_by TEXT;

ALTER TABLE phan_quyen ADD COLUMN updated_at TEXT;
ALTER TABLE phan_quyen ADD COLUMN updated_by TEXT;
