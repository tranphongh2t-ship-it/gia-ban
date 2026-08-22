-- Bảng ghi nhật ký hoạt động thiết bị
CREATE TABLE IF NOT EXISTS device_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,          -- mã máy (UUID hoặc hostname)
  user_name TEXT,                   -- tên user trên máy
  user_id INTEGER,                  -- id user trong nhan_vien
  action TEXT NOT NULL,             -- startup, login, sync_push, sync_pull, backup, export, import, download, update, error, ...
  detail TEXT,                      -- mô tả chi tiết (JSON hoặc text)
  app_version TEXT,                 -- phiên bản app
  created_at TEXT DEFAULT (datetime('now','+7 hours'))
);

-- Index theo device + thời gian để query nhanh
CREATE INDEX IF NOT EXISTS idx_device_logs_device_id ON device_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_created_at ON device_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_device_logs_action ON device_logs(action);
