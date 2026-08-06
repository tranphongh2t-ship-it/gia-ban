import { GuideTabDef } from '../components/GuideTabs'

const base: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã Ván dăm / MDF HDF',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mã SP bám theo quy tắc MEOK* (ván dăm) và ME GHEP / ME* (MDF/HDF). Cấu trúc chung: tiền tố loại ván + mã lớp (grade) + mã màu + số mặt.',
            ],
          },
          {
            type: 'genericTable',
            table: {
              columns: ['Loại ván', 'Tiền tố mã', 'Ghi chú'],
              rows: [
                ['Ván dăm (Dăm Okal)', 'MEOK', 'các lớp E2, VECO E1, VECO CP2, VECO F4S, HMR E1'],
                ['MDF/HDF (Ván MDF HDF)', 'ME / ME GHEP', 'các lớp E2, CP2, HMR E1/E2, LMR, MMR, LDF, HDF V313…'],
                ['VECO E1 / ván không có mã', '—', 'để trống, gán thủ công'],
              ],
            },
          },
        ],
      },
      {
        title: 'Cách phát hiện mã',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Hệ thống tự gán theo khóa: độ dày | loại ván (ánh xạ VDO_LOAI_MAP / VMH_LOAI_MAP) | mã màu chuẩn hóa | số mặt. Ván dăm còn tự phát sinh mã MEOK* cho các dòng chưa có.',
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'cong-thuc',
    label: 'Công thức tính',
    sections: [
      {
        title: 'Cách tính',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mỗi dòng = một tổ hợp (quy cách × loại ván × mã màu × số mặt). Giá = giá phôi ván + phụ thu phủ (tùy loại màu và số mặt).',
            ],
          },
        ],
      },
      {
        title: 'Nguồn giá',
        content: [
          {
            type: 'formulaTable',
            formulas: [
              { label: 'Giá phôi ván', formula: 'board_gia = board[grade]', example: 'e2, veco_e1, veco_cp2, veco_f4s, hmr_e1 (Dăm Okal)' },
              { label: 'Phụ thu phủ', formula: 'phu_thu_gia = phuThu[loại màu][số mặt]', example: 'màu đặc biệt → superb_1m/_2m; ngược lại → phuThuKey_1m/_2m' },
              { label: 'Tổng giá gốc', formula: 'tong_gia = board_gia + phu_thu_gia', example: 'giá cột Tổng giá gốc' },
            ],
          },
        ],
      },
      {
        title: 'Lưu ý',
        content: [
          {
            type: 'notes',
            notes: [
              'Số mặt (1/2) làm thay đổi mức phụ thu phủ — cùng mã màu nhưng khác mặt sẽ khác giá.',
              'Sau khi "Tính toán lại", mã SP KHÔNG được giữ tự động — cần bấm "Gán Mã SP từ danh mục MISA" lại.',
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'gan-ma',
    label: 'Cách gán mã',
    sections: [
      {
        title: 'Các bước thực hiện',
        content: [
          {
            type: 'steps',
            steps: [
              'Bấm "Tính toán lại" để tạo bảng giá mới.',
              'Bấm "Gán Mã SP từ danh mục MISA" — ván dăm tự phát sinh mã MEOK*, MDF/HDF gán theo danh mục.',
              'Với dòng trống (ví dụ VECO E1), gán thủ công qua nút "Gán SP".',
              'Lưu ý: sau mỗi lần tính lại phải gán lại mã.',
            ],
          },
        ],
      },
      {
        title: 'Gợi ý',
        content: [
          {
            type: 'notes',
            notes: [
              'Bộ lọc "Mã SP: Đã gán/Chưa gán" giúp rà soát dòng còn trống nhanh.',
              'Mã tự phát sinh chỉ áp dụng cho ván dăm (MEOK); MDF/HDF chỉ gán mã có sẵn.',
            ],
          },
        ],
      },
    ],
  },
]

export function vdoGuideTabs(boardType: 'vdo' | 'vmh'): GuideTabDef[] {
  return base.map(tab => ({
    ...tab,
    sections: tab.sections.map(s => ({
      ...s,
      content: s.content.map((b: any) => {
        if (b.type === 'paragraphs' && b.text?.[0]?.includes('Cấu trúc mã')) {
          return {
            ...b,
            text: boardType === 'vmh'
              ? ['Mã SP ván MDF HDF bám theo quy tắc ME / ME GHEP. Cấu trúc chung: tiền tố loại ván + mã lớp (grade) + mã màu + số mặt.']
              : ['Mã SP ván dăm (Dăm Okal) bám theo quy tắc MEOK*. Cấu trúc chung: MEOK + mã lớp (grade) + mã màu + số mặt.'],
          }
        }
        return b
      }),
    })),
  }))
}