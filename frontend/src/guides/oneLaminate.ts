import { GuideTabDef } from '../components/GuideTabs'

export const oneLaminateGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mã SP One Laminate (HPL) tìm theo tiền tố NL*, LE*, LP*, ML*, HL*, GL*, MLOK* — ứng với nhóm màu trong ngoặc (LE1, LP3…) của cột Nhóm. Hệ thống không tự gán — bạn dùng nút "Gán SP" để chọn mã từ danh mục MISA.',
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
              'Nút "Gán SP" tìm mã MISA theo từ khóa: mã màu + nhóm + loại ván + độ dày + số mặt.',
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
              'Mỗi dòng = một mã màu HPL × một loại ván (Ván nhựa hoặc OSB/Gỗ ghép/Ván ép). Giá lấy từ cột giá 1 mặt / 2 mặt tương ứng với nhóm màu.',
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
              { label: 'Giá 1 mặt', formula: 'gia = board[gia_1m_{nhóm}]', example: 'gia_1m_le1, gia_1m_le2, gia_1m_lp3…' },
              { label: 'Giá 2 mặt', formula: 'gia = board[gia_2m_{nhóm}]', example: 'gia_2m_le1, gia_2m_le2, gia_2m_lp3…' },
              { label: 'Giá foil', formula: 'gia_foil = c.gia_foil', example: 'hiển thị cột Giá foil' },
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
              'Cột Nguồn phân biệt nguồn ván: "Ván nhựa" (Ván nhựa phủ HPL) hay "OSB/Gỗ ghép/Ván ép".',
              'Sau khi "Tính toán lại", mã SP KHÔNG được giữ — phải gán lại qua nút "Gán SP".',
              'Không có nút gán tự động hàng loạt cho module này.',
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
              'Tại dòng cần gán, bấm nút "Gán SP" trong cột Mã SP.',
              'Chọn mã khớp từ danh sách gợi ý MISA, hoặc nhập mã thủ công (Mã SP + Mô tả).',
              'Lưu — mã mới sẽ được thêm vào bảng mã MISA.',
            ],
          },
        ],
      },
    ],
  },
]