import { GuideTabDef } from '../components/GuideTabs'

export const ggGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã Gỗ Ghép',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mã SP gỗ ghép bám theo nhóm (Gỗ Trơn / Phủ Veneer). Mã dùng tiền tố TGGCS* (gỗ cao su ghép), TGGTHONG* (gỗ thông ghép) và VNGG* (gỗ ghép nhập khẩu / phủ veneer).',
            ],
          },
        ],
      },
      {
        title: 'Cách phát hiện mã',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Hệ thống tự gán mã khớp theo khóa nhóm|loại|quy_cách qua bảng ánh xạ GO_GHEP_MA_MAP (TGGCS*, TGGTHONG*, VNGG*).',
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
              'Mỗi dòng = một quy cách của một loại gỗ ghép. Giá hiển thị chính là giá từ bảng giá chuẩn, không có công thức cộng/trừ.',
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
              { label: 'Gỗ Trơn', formula: 'gia = row[grade]', example: 'Cao Su AA / Cao Su AB (chia 2 dòng cùng giá), Xoan, Sồi…' },
              { label: 'Phủ Veneer', formula: 'gia = row[grade]', example: 'Xoan 1m/2m, Sồi KT 1m/2m, Óc Chó KT 1m/2m' },
              { label: 'Dòng 17-18mm', formula: 'chia làm 2 dòng 17mm + 18mm (cùng giá)' },
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
              'Khi bấm "Tính toán lại", mã SP đã gán được giữ theo khóa quy_cach|loai|nhom.',
              'Cột "Loại" giúp phân biệt cùng quy cách nhưng khác nhóm màu/loại gỗ.',
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
              'Bấm "Gán Mã SP từ danh mục MISA" để tự gán theo bảng ánh xạ.',
              'Các dòng trống gán thủ công qua nút "Gán SP" (nhập mã MISA mới được tự thêm).',
            ],
          },
        ],
      },
    ],
  },
]