# Giá Bán App

Quản lý bảng giá bán, so sánh giá gốc, phân quyền người dùng.

**Stack:** React + Vite (frontend), Cloudflare Workers + D1 (backend), Electron (desktop)

---

## Kiến trúc tổng thể

```
gia-ban-app/
├── backend/          # Cloudflare Workers API (Hono framework + D1 SQLite)
├── frontend/         # React SPA + Electron desktop wrapper
└── README.md
```

- **Backend duy nhất** — cả web và desktop đều gọi chung API
- **Web** → Vite build (vite.web.config.ts) → Cloudflare Pages
- **Desktop** → Vite build (vite.config.ts) + Electron → .exe
- **Sync** — Desktop có SQLite local (sql.js) + sync engine push/pull 30s

---

## Cấu trúc Backend (`backend/`)

```
backend/
├── src/
│   ├── index.ts                  # Root router: khởi tạo Hono, mount all routes
│   ├── seed.ts                   # Seed dữ liệu mẫu (Admin/Bangdang190891)
│   ├── helpers/
│   │   └── crud.ts               # Generic CRUD helper: listQuery, defaultFilters, filter alias
│   ├── logic/
│   │   ├── basePricingEngine.ts  # Tính giá cơ bản (ván phủ, 8 nhóm nhỏ)
│   │   ├── discountLookup.ts     # Tra chiết khấu theo loại KH, mã hàng
│   │   ├── extendedPricingEngine.ts # Tính giá mở rộng (26KB — phức tạp nhất)
│   │   ├── pricingEngine.ts      # Engine tổng hợp
│   │   └── revenueCalc.ts        # Tính doanh thu
│   └── routes/
│       ├── audit.ts              # Audit trail: xem lịch sử thay đổi dữ liệu
│       ├── audit-log.ts          # Audit log CRUD (create/read)
│       ├── bang-gia-ck.ts        # CRUD bảng giá chiết khấu
│       ├── bang-gia-cot-go.ts    # CRUD bảng giá cốt gỗ
│       ├── bang-gia-ma-mau.ts    # CRUD bảng giá mã màu
│       ├── bang-gia-new.ts       # CRUD 8 nhóm nhỏ (Veneer, Chỉ, Acrylic, Laminate, PVC...)
│       ├── bang-gia-nhom-mau.ts  # CRUD bảng giá nhóm màu
│       ├── bang-gia-nhua-pvc.ts  # CRUD bảng giá nhựa PVC
│       ├── bang-gia-veneers.ts   # CRUD bảng giá Veneer
│       ├── don-hang-excel.ts     # CRUD đơn hàng Excel import
│       ├── gia-van-tron.ts       # Tính giá ván trộn + bổ sung dữ liệu thiếu
│       ├── import-export.ts      # Import/Export tất cả 26 bảng (Excel + JSON)
│       ├── khach-hang.ts         # CRUD khách hàng
│       ├── ma-misa.ts            # CRUD mã MISA
│       ├── phan-bo-kh.ts         # CRUD phân bổ khách hàng
│       ├── phan-quyen.ts         # Auth + user CRUD + phân quyền
│       ├── phu-thu.ts            # CRUD phụ thu
│       ├── pricing.ts            # Core: so-sanh, tim-gia-goc, cap-nhat-gia-goc, xoa-trung, them-ma-thieu-8-nhom, dashboard, tat-ca-gia-goc
│       ├── so-chi-tiet-ban-hang.ts # CRUD + import Excel sổ chi tiết bán hàng
│       └── sync.ts               # Sync endpoints: push/pull/status cho desktop offline
├── migrations/
│   ├── 0001_create_tables.sql    # 12 bảng core (nhan_vien, khach_hang, ma_misa, gia_ban, don_hang, ban...)
│   ├── 0002_pricing_tables.sql   # 5 bảng giá tham chiếu (cot_go, nhom_mau, ma_mau, veneers, nhua_pvc)
│   ├── 0003_sales_tables.sql     # 2 bảng: so_chi_tiet_ban_hang, don_hang_excel
│   ├── 0004_new_pricing_tables.sql # 12 bảng 8 nhóm nhỏ (chi, keo_nong, acrylic_foil, van_phu_acrylic, laminate_one, pvc_film, van_phu_pvc, nhua_phu_mau, nhua_laminate, osb_laminate, mirror)
│   ├── 0005_pricing_add_columns.sql # Thêm cột gia_goc, ma_sp vào các bảng
│   └── 0006_add_sync_columns.sql # Thêm updated_at, updated_by cho sync
├── schema.sql                    # Full schema reference
├── wrangler.toml                 # Cloudflare Workers config
├── package.json
└── tsconfig.json
```

---

## Cấu trúc Frontend (`frontend/`)

```
frontend/
├── electron/
│   ├── main.ts                   # Electron main process: BrowserWindow, IPC handlers, DB init, sync engine
│   ├── preload.ts                # contextBridge: expose dbQuery, apiGet/Post/Patch/Delete, sync control
│   ├── db.ts                     # sql.js WASM SQLite: local DB, sync_meta + sync_queue tables
│   └── sync-engine.ts            # Sync engine: push queue, pull loop, table creation on demand
├── src/
│   ├── main.tsx                  # ReactDOM entry
│   ├── App.tsx                   # Router config (HashRouter cho Electron, BrowserRouter cho web)
│   ├── global.css                # Global styles
│   ├── theme.ts                  # MUI theme
│   ├── lib/
│   │   ├── api.ts                # API client: auto-detect Electron IPC vs fetch
│   │   ├── auth.tsx              # AuthContext: login, permission check, x-user-id header
│   │   ├── bangGiaConfigs.ts     # Column configs cho 8 nhóm nhỏ (datagrid columns)
│   │   ├── format.ts             # Format helpers
│   │   └── useColumnResize.ts    # Resizable column hook
│   ├── components/
│   │   ├── Layout.tsx            # Sidebar + route-level permission guard
│   │   ├── LoginOverlay.tsx      # Login form (username + password)
│   │   ├── ConfirmDialog.tsx     # Confirmation dialog
│   │   ├── Modal.tsx             # Generic modal
│   │   └── DataGrid/
│   │       └── index.tsx         # Reusable DataGrid: sort, filter, paginate, extraFilters, export
│   └── modules/                  # 26 modules, mỗi module là 1 trang
│       ├── Welcome/              # / — trang chào
│       ├── Dashboard/            # /dashboard — thống kê + biểu đồ recharts
│       ├── DanhMucKhach/         # /khach-hang — quản lý khách hàng
│       ├── MaMisa/               # /ma-misa — mã MISA
│       ├── GiaBanMisa/           # /gia-ban-misa — giá bán MISA
│       ├── PhuThu/               # /phu-thu — phụ thu
│       ├── PhanBoKH/             # /phan-bo-kh — phân bổ khách hàng
│       ├── BangGiaCK/            # /bang-gia-ck — bảng giá chiết khấu
│       ├── SoChiTietBanHang/     # /so-chi-tiet-ban-hang — sổ chi tiết bán hàng
│       ├── DonHangExcel/         # /don-hang-excel — đơn hàng Excel import
│       ├── TinhGia/              # /tinh-gia — tính giá
│       ├── TinhGiaGoc/           # /tinh-gia-goc — tính giá gốc
│       ├── SoSanhGiaGoc/         # /so-sanh-gia-goc — so sánh giá gốc
│       ├── TinhTonKho/           # /tinh-ton-kho — tính tồn kho (upload Excel AMISS+CLOUD)
│       ├── TraCuuGiaGoc/         # /tinh-gia-8-nhom-nho/:slug — 8 nhóm nhỏ + prefix filters
│       ├── BangGiaNew/           # /bang-gia-new/:slug — 13 nhóm New (bao gồm mirror)
│       ├── BangGiaCotGo/         # /bang-gia-cot-go — bảng giá cốt gỗ
│       ├── BangGiaNhomMau/       # /bang-gia-nhom-mau — bảng giá nhóm màu
│       ├── BangGiaMaMau/         # /bang-gia-ma-mau — bảng giá mã màu
│       ├── BangGiaNhuaPVC/       # /bang-gia-nhua-pvc — bảng giá nhựa PVC
│       ├── BangGiaVeneers/       # /bang-gia-veneers — bảng giá Veneer
│       ├── GiaVanTron/           # /gia-van-tron — tính giá ván trộn
│       ├── ImportExport/         # /import-export — import/export tất cả 26 bảng
│       ├── Audit/                # /audit — audit trail viewer
│       ├── QuanLyThang/          # /quan-ly-thang — quản lý tháng
│       ├── PhanQuyen/            # /phan-quyen — user CRUD + permission toggles
│       └── ... (các module nhỏ CRUD còn lại)
├── release/                      # electron-builder output (.exe)
│   └── Giá Bán Mới Setup *.exe
├── vite.config.ts                # Electron build config (sql.js externalized, custom app:// protocol)
├── vite.web.config.ts            # Web-only build config (Cloudflare Pages)
├── index.html
├── package.json
└── tsconfig.json
```

---

## Database Schema (32 tables — D1 SQLite)

### Core
| Bảng | Mô tả | Số cột |
|------|-------|--------|
| `nhan_vien` | Nhân viên | 9 |
| `khach_hang` | Khách hàng | 17 |
| `ma_misa` | Mã MISA (hàng hóa) | 7 |
| `phu_thu` | Phụ thu | 8 |
| `thanhthuy_gg` | ThanhThuy-GG | 6 |
| `thanhthuy_gvt` | ThanhThuy-GVT | 7 |
| `phan_bo_kh` | Phân bổ KH | 7 |
| `bang_gia_ck` | Bảng giá chiết khấu | 11 |
| `gia_ban` | Giá bán (core) | 17 |
| `gia_ban_tier` | Giá bán theo tier | 8 |
| `don_hang` | Đơn hàng | 48 |
| `ban` | Bán (sales ledger) | 57 |
| `audit_log` | Audit log | 8 |

### Pricing reference
| Bảng | Mô tả | Số cột |
|------|-------|--------|
| `bang_gia_cot_go` | Giá theo cốt gỗ | 8 |
| `bang_gia_nhom_mau` | Nhóm màu | 8 |
| `bang_gia_ma_mau` | Mã màu | 8 |
| `bang_gia_veneers` | Veneer | 9 |
| `bang_gia_nhua_pvc` | Nhựa PVC | 8 |

### 8 nhóm nhỏ
| Bảng | Mô tả | ma_sp prefix |
|------|-------|-------------|
| `bang_gia_chi` | Chỉ (edge banding) | CHI% |
| `bang_gia_keo_nong` | Keo dán chỉ | ZKEO% |
| `bang_gia_acrylic_foil` | Acrylic foil | AC% |
| `bang_gia_van_phu_acrylic` | Ván phủ Acrylic | AC% |
| `bang_gia_laminate_one` | Laminate One | LP% |
| `bang_gia_pvc_film` | PVC Film | PVC% |
| `bang_gia_van_phu_pvc` | Ván phủ PVC | PVC% |
| `bang_gia_nhua_phu_mau` | Ván phủ Melamine | GM% |
| `bang_gia_nhua_laminate` | Ván phủ Laminate | LP% |
| `bang_gia_osb_laminate` | OSB Laminate | LP% |
| `bang_gia_mirror` | Mirror/Siêu bóng gương | *(trên BangGiaNewPage)* |

### Sales import
| Bảng | Mô tả |
|------|-------|
| `so_chi_tiet_ban_hang` | Sổ chi tiết bán hàng (Excel import) |
| `don_hang_excel` | Đơn hàng Excel |

### Auth
| Bảng | Mô tả |
|------|-------|
| `phan_quyen` | Phân quyền người dùng |

---

## D1 Index Guidelines

**Luôn luôn** thêm index khi tạo table mới hoặc thêm column mới dùng trong WHERE/JOIN/ORDER BY.

### Free tier limits (Important!)
- **Reads:** 5M/day (5 machines × ~100 requests/machine/day × ~15 queries/request = ~7,500 reads/day → an toàn)
- **Writes:** 100K/day (imports 1-2 lần/ngày × ~2K rows = ~4K writes/day → dư)
- **Backup:** 1 backup/ngày × ~45MB = ~45MB/ngày

### Migration pattern
```sql
-- Luôn dùng IF NOT EXISTS để migration idempotent
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);

-- Composite index cho multi-column WHERE
CREATE INDEX IF NOT EXISTS idx_table_col1_col2 ON table_name(col1, col2);
```

### Current indexes (0097)
| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `so_chi_tiet_ban_hang` | `idx_sctbh_ma_hang` | `ma_hang` | Product lookup |
| `so_chi_tiet_ban_hang` | `idx_sctbh_ma_kh` | `ma_kh` | Customer lookup |
| `so_chi_tiet_ban_hang` | `idx_sctbh_kh_ngay` | `ma_kh, ngay` | Progressive revenue calc |
| `danh_sach_khach` | `idx_dskh_nhom` | `nhom` | Group filter |
| `danh_sach_khach` | `idx_dskh_vung` | `vung` | Region filter |
| `khach_hang` | `idx_kh_sales_phu_trach` | `sales_phu_trach_id` | Permission cleanup |
| `check_chiet_khau_test` | `idx_cck_ma_ngay` | `ma_hang, ngay` | CK calculation |
| `check_chiet_khau_test` | `idx_cck_created_owner` | `created_at, owner_user_id` | TTL cleanup |
| `so_doi_chieu` | `idx_sdc_ma_ngay_ct` | `ma_hang, ngay_chung_tu, so_chung_tu` | Sync lookup |
| `so_doi_chieu` | `idx_sdc_created_owner` | `created_at, owner_user_id` | TTL cleanup |

### Rules
1. **Query前三思:** Phân tích query sẽ dùng `WHERE`, `JOIN`, `ORDER BY` gì
2. **Index trước khi deploy:** Không deploy code dùng WHERE trên column chưa có index
3. **Verify bằng EXPLAIN QUERY PLAN:** Luôn check D1 dùng đúng index
4. **Tránh over-indexing:** Index tăng write time, chỉ tạo cho columns filter thường xuyên
5. **PRAGMA optimize:** Cuối migration chạy `PRAGMA optimize;` để D1 cập nhật statistics

---

## API Endpoints

### Health & Debug
- `GET /api/health` — health check
- `GET /api/db-check` — danh sách tables

### Auth
- `POST /api/auth/login` — đăng nhập (SHA-256 hash)
- `GET /api/auth/me` — thông tin user hiện tại
- `GET /api/auth/users` — danh sách user
- `POST /api/auth/users` — tạo user
- `PATCH /api/auth/users/:id` — cập nhật user
- `DELETE /api/auth/users/batch` — xóa user hàng loạt
- `GET /api/auth/permissions` — danh sách quyền
- `PATCH /api/auth/permissions` — cập nhật quyền

### Core CRUD (generic pattern via crud.ts)
- `GET/POST /api/khach-hang` — khách hàng
- `GET/POST /api/ma-misa` — mã MISA
- `GET/POST /api/phu-thu` — phụ thu
- `GET/POST /api/phan-bo-kh` — phân bổ KH
- `GET/POST /api/bang-gia-ck` — bảng giá chiết khấu
- `GET/POST /api/bang-gia-cot-go` — bảng giá cốt gỗ
- `GET/POST /api/bang-gia-nhom-mau` — nhóm màu
- `GET/POST /api/bang-gia-ma-mau` — mã màu
- `GET/POST /api/bang-gia-veneers` — veneer
- `GET/POST /api/bang-gia-nhua-pvc` — nhựa PVC
- `GET/POST /api/so-chi-tiet-ban-hang` — sổ chi tiết bán hàng
- `GET/POST /api/don-hang-excel` — đơn hàng Excel

### Bảng giá New (8 nhóm nhỏ + mirror)
Các route `/api/bang-gia-new/:slug` với CRUD tương ứng cho từng bảng. Slug map:
- `veneer` → `bang_gia_veneers`
- `chi` → `bang_gia_chi`
- `keo-nong` → `bang_gia_keo_nong`
- `acrylic-foil` → `bang_gia_acrylic_foil`
- `van-phu-acrylic` → `bang_gia_van_phu_acrylic`
- `laminate-one` → `bang_gia_laminate_one`
- `nhua-pvc` → `bang_gia_nhua_pvc`
- `pvc-film` → `bang_gia_pvc_film`
- `van-phu-pvc` → `bang_gia_van_phu_pvc`
- `nhua-phu-mau` → `bang_gia_nhua_phu_mau`
- `nhua-laminate` → `bang_gia_nhua_laminate`
- `osb-laminate` → `bang_gia_osb_laminate`
- `mirror` → `bang_gia_mirror`

### Pricing
- `GET /api/pricing/tim-gia-goc?ma_sp=...` — tra giá gốc
- `GET /api/pricing/so-sanh` — so sánh giá gốc (paginated, filter, stats)
- `POST /api/pricing/cap-nhat-gia-goc` — copy don_gia → gia_ban.gia_goc
- `POST /api/pricing/xoa-trung-gia-ban` — xóa trùng (child-first)
- `GET/POST /api/pricing/them-ma-thieu-8-nhom` — đồng bộ mã thiếu
- `GET /api/pricing/dashboard` — thống kê dashboard
- `GET /api/pricing/tat-ca-gia-goc` — all ma_sp + gia_goc (cho TinhTonKho)

### Tính giá
- `POST /api/gia-van-tron/tinh` — tính giá ván trộn
- `POST /api/gia-van-tron/bo-sung` — bổ sung dữ liệu thiếu

### Import/Export
- `GET /api/export/:table` — export Excel/JSON
- `POST /api/import/:table/preview` — preview import
- `POST /api/import/:table/confirm` — confirm import

### Audit
- `GET /api/audit` — xem audit trail

### Sync (Desktop offline)
- `POST /api/sync/push` — đẩy thay đổi local lên
- `GET /api/sync/pull?since=...&user_id=...` — kéo thay đổi mới
- `GET /api/sync/status` — trạng thái sync

---

## Frontend Routes

| Route | Module | Permission |
|-------|--------|------------|
| `/` | Welcome | — |
| `/dashboard` | Dashboard | menu:/dashboard |
| `/khach-hang` | DanhMucKhach | menu:/khach-hang |
| `/ma-misa` | MaMisa | menu:/ma-misa |
| `/gia-ban-misa` | GiaBanMisa | menu:/gia-ban-misa |
| `/phu-thu` | PhuThu | menu:/phu-thu |
| `/phan-bo-kh` | PhanBoKH | menu:/phan-bo-kh |
| `/bang-gia-ck` | BangGiaCK | menu:/bang-gia-ck |
| `/so-chi-tiet-ban-hang` | SoChiTietBanHang | menu:/so-chi-tiet-ban-hang |
| `/don-hang-excel` | DonHangExcel | menu:/don-hang-excel |
| `/tinh-gia` | TinhGia | menu:/tinh-gia |
| `/tinh-gia-goc` | TinhGiaGoc | menu:/tinh-gia-goc |
| `/so-sanh-gia-goc` | SoSanhGiaGoc | menu:/so-sanh-gia-goc |
| `/tinh-gia-8-nhom-nho/:slug` | TraCuuGiaGoc | menu:/tinh-gia-8-nhom-nho |
| `/import-export` | ImportExport | menu:/import-export |
| `/audit` | Audit | menu:/audit |
| `/quan-ly-thang` | QuanLyThang | menu:/quan-ly-thang |
| `/phan-quyen` | PhanQuyen | menu:/phan-quyen |
| `/bang-gia-cot-go` | BangGiaCotGo | menu:/bang-gia-cot-go |
| `/bang-gia-new/:slug` | BangGiaNew | menu:/bang-gia-new |
| `/bang-gia-nhom-mau` | BangGiaNhomMau | menu:/bang-gia-nhom-mau |
| `/bang-gia-ma-mau` | BangGiaMaMau | menu:/bang-gia-ma-mau |
| `/gia-van-tron` | GiaVanTron | menu:/gia-van-tron |
| `/tinh-ton-kho` | TinhTonKho | menu:/tinh-ton-kho |

---

## Quy trình Audit

1. **Audit trail** — bảng `audit_log` ghi lại mọi thay đổi dữ liệu (ai, bảng nào, dòng nào, giá trị cũ/mới, thời gian)
2. **Frontend** — trang `/audit` (Audit/index.tsx) cho phép xem và lọc audit log theo:
   - Thời gian (date range)
   - Nhân viên
   - Bảng
   - Hành động

3. **Sync audit** — Desktop sync queue ghi vào `sync_queue` local, push lên backend, backend ghi audit log riêng
4. **Mọi table đều có** `created_at`, `updated_at`, `updated_by` (đã thêm qua migration 0006 cho các bảng thiếu)
5. **Route guard** — Layout.tsx kiểm tra quyền trước khi render trang, redirect về "Không có quyền truy cập"

---

## Cấu trúc Mã MISA - OSB

Cách đọc mã sản phẩm OSB trong bảng `ma_misa` (dùng cho bảng `bang_gia_chuan_tinh_gia_osb`):

```
[T][OSB / OSB2][PINE][độ dày][E0 / E2]
```

| Thành phần | Ý nghĩa | Giá trị |
|-----------|---------|---------|
| `T` | Thông (gỗ thông) | cố định `T` |
| `OSB` | Cốt ván OSB | `OSB` (gỗ thông Full pine) hoặc `OSB2` (cột OSB 2) |
| `PINE` | Màu sắc | chỉ có ở dòng gỗ thông |
| Độ dày | Độ dày cốt ván | `09`, `12`, `18`... |
| `E0` / `E2` | Chứng nhận gỗ | `E0` = dòng Pine, `E2` = dòng OSB2 |

**Ví dụ:**
- `TOSBPINE18E0` → "Ván Dăm Định Hướng 18mm x1220x2440 (Thông) E0" (T + OSB + PINE + 18 + E0)
- `TOSB209E2` → "Ván dăm Định Hướng OSB2 9mm x1220x2440 E2" (T + OSB2 + 09 + E2)

### Các mã MISA OSB hiện có

| ma_sp | Mô tả | gia_goc |
|-------|-------|---------|
| `TOSBPINE09E0` | Ván Dăm Định Hướng 9mm x1220x2440 (Thông) E0 | 310,000 |
| `TOSBPINE12E0` | Ván Dăm Định Hướng 12mm x1220x2440 (Thông) E0 | 450,000 |
| `TOSBPINE18E0` | Ván Dăm Định Hướng 18mm x1220x2440 (Thông) E0 | 570,000 |
| `TOSB209E2` | Ván dăm Định Hướng OSB2 9mm x1220x2440 E2 | 260,000 |
| `TOSB211E2` | Ván dăm Định Hướng OSB2 11mm x1220x2440 E2 | (null) |
| `TOSB212E2` | Ván dăm Định Hướng OSB2 12mm x1220x2440 E2 | 313,000 |
| `TOSB218E2` | Ván Dăm Định Hướng 18mm x1220x2440 E2 | 402,000 |
| `TOSB218E2L` | Ván dăm Định Hướng OSB2 18mm x1220x2440 E2 (Ít keo) | 402,000 |
| `TOSB218E2LL` | Ván Dăm Định Hướng 18mm x1220x2440 E2 (Nhiều keo) | 402,000 |
| `TOSB309E2` | Ván dăm Định Hướng OSB3 (mặt thông) 9mm x1220x2440 E2 | 260,000 |
| `TOSB311E2` | Ván dăm Định Hướng OSB3 (mặt thông) 11mm x1220x2440 E2 | (null) |
| `TOSB312E2` | Ván dăm Định Hướng OSB3 (mặt thông) 12mm x1220x2440 E2 | 313,000 |
| `TOSB318E2` | Ván Dăm Định Hướng 18mm x1220x2440 (Thông) E2 | 402,000 |

> **Lưu ý:** MISA chỉ có OSB2 ở các độ dày 9/11/12/18mm. Các mã `TOSB208E2`, `TOSB217E2`, `TOSB219E2` **không tồn tại** trong `ma_misa` → với các độ dày 8/17/19mm phải nhập tay mã SP, không auto-gán được.

### Cách gán mã SP (thủ công)

1. Trang `/tinh-gia-osb`, dòng chưa có mã SP hiện nút **"Gán SP"**
2. Modal mở ra có 2 cách:
   - **Chọn từ danh sách** — tìm trong các mã MISA có sẵn
   - **Nhập tay** — nhập mã SP + mô tả mới (dùng khi MISA không có sẵn mã)
3. Sau khi lưu, bấm **"Tính toán lại"** — mã SP được preserve theo khóa `loai|do_day|nhom`

---

## Quick Commands

```bash
# Backend local
cd backend && npx wrangler dev --remote

# Frontend local (web)
cd frontend && npm run dev

# Frontend local (desktop)
cd frontend && npm run electron:dev

# Build web (deploy lên Cloudflare Pages)
cd frontend && npm run build

# Build desktop (ra file .exe)
cd frontend && npm run electron:build
```

## Deploy

- **Backend**: `cd backend && npx wrangler deploy`
- **Frontend web**: `cd frontend && npm run build` → upload `dist/` lên Cloudflare Pages
- **Frontend desktop**: `cd frontend && npm run electron:build` → `release/Giá Bán Mới Setup 0.1.0.exe`

## Lưu ý audit

- `crud.ts` — generic CRUD với defaultFilters (prefix matching), extraFilterMap, alias prefixing
- Data format: ngày tháng dạng `dd/MM/yyyy` string trong DB
- Tất cả route đều kiểm tra authentication qua `x-user-id` header
- 401/404 không logout — chỉ mất kết nối mạng mới logout
