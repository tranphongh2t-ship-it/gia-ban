-- 0099: Additional indexes for D1 optimization (Tier 3.2)

-- khach_theo_thang: WHERE thang = ? (used by khach-thang GET + copy)
CREATE INDEX IF NOT EXISTS idx_ktt_thang ON khach_theo_thang(thang);

-- ck_op1: WHERE thang = ? (used by OP1 lookup in Lop2Ctx + import-bang-thang)
CREATE INDEX IF NOT EXISTS idx_ck_op1_thang ON ck_op1(thang);

-- ck_op2: WHERE thang = ? (used by OP2 lookup in Lop2Ctx)
CREATE INDEX IF NOT EXISTS idx_ck_op2_thang ON ck_op2(thang);

-- op2_bac_thang: WHERE thang = ? (used by bac lookup in chot-thang)
CREATE INDEX IF NOT EXISTS idx_op2bt_thang ON op2_bac_thang(thang);

-- monthly_summary: WHERE thang = ? (used by chot-thang)
CREATE INDEX IF NOT EXISTS idx_ms_thang ON monthly_summary(thang);

-- thay_doi_log: WHERE thang = ? AND bang = ? (used by log endpoint)
CREATE INDEX IF NOT EXISTS idx_tdl_thang_bang ON thay_doi_log(thang, bang);

-- check_chiet_khau_test: WHERE ngay LIKE ? (month extraction in chot-thang)
CREATE INDEX IF NOT EXISTS idx_cck_ngay ON check_chiet_khau_test(ngay);

-- so_chi_tiet_ban_hang: WHERE thang = ? (month extraction used heavily)
-- Already has idx_sctbh_thang expression index from 0098

-- PRAGMA optimize
PRAGMA optimize;
