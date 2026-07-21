# Hệ thống Giá Bán Mới

Thay thế file Excel `Gia Ban phan vung khach T6.2026.xlsx` (16 tab, ~1,5 triệu công thức) bằng web app nội bộ.

## Kiến trúc

- **Frontend**: React (Vite) + Cloudflare Pages
- **Backend**: Cloudflare Worker (Hono) + D1 (SQLite)
- **Auth**: Cloudflare Access (Zero Trust)

## Cấu trúc thư mục

```
gia-ban-app/
├── frontend/          # React (Vite)
│   └── src/
│       ├── components/DataGrid/
│       ├── modules/   # DanhMucKhach, MaMisa, GiaBan, Ban, DH, ...
│       ├── lib/       # api.ts, excelImportExport.ts
│       └── App.tsx
├── backend/           # Cloudflare Worker
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── logic/     # pricingEngine, discountLookup, revenueCalc
│   │   └── index.ts
│   ├── schema.sql     # 12 bảng D1
│   └── wrangler.toml
└── .github/workflows/ # CI/CD
```

## Phát triển

```bash
# Backend
cd backend
npm install
wrangler dev

# Frontend
cd frontend
npm install
npm run dev
```

## Deploy

Xem `.github/workflows/` — push lên nhánh `main` tự động deploy.
