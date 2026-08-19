-- 0063: Cờ "tự lấy" theo từng khách (xác nhận từ người dùng: tự lấy/giao tùy từng khách).
-- Suy từ dữ liệu lịch sử: khách nào đơn CHI/khác có +1% (CK vận chuyển) chiếm đa số → tự lấy.
ALTER TABLE danh_sach_khach ADD COLUMN tu_lay INTEGER DEFAULT 0;

UPDATE danh_sach_khach SET tu_lay = 1 WHERE ma_kh IN (
  'ACONGDL','ATHAINT','ATRUCBMT','BAOHUYBL','CNHUNG','COTUDL','GGTUNGUYEN',
  'NGOCTHOMGL','PHUCKHANG','QUOCTUANDL','THIENNHANCM','TOANPHAT','VANGOSONGCHI'
);
