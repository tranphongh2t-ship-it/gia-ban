import { GuideTabDef } from '../components/GuideTabs'

export const acrylicGuideTabs: GuideTabDef[] = [
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
              'Mã SP ván phủ Acrylic tìm theo tiền tố AC* (Acrylic), NA* hoặc MA* (nhóm phủ nhựa/MDF Acrylic). Hệ thống không tự gán — bạn dùng nút "Gán SP" để chọn mã từ danh mục MISA.',
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
              'Nút "Gán SP" tìm mã MISA theo từ khóa: mã màu + loại phủ + loại ván (searchStr = ma_mau + phu + board_type).',
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
              'Mỗi dòng = một mã màu Acrylic × một loại ván (board_type) cùng series. Giá lấy từ cột tương ứng với loại màu (Đơn sắc / Ánh kim / Vân gỗ).',
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
              { label: 'Đơn sắc', formula: 'gia = board.gia_ds' },
              { label: 'Ánh kim', formula: 'gia = board.gia_ak' },
              { label: 'Vân gỗ', formula: 'gia = board.gia_vg' },
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
              'Cùng một mã màu có thể có nhiều dòng theo từng loại ván (Ván nhựa / MDF MR…).',
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
      {
        title: 'Gợi ý',
        content: [
          {
            type: 'notes',
            notes: [
              'Vì không có auto-assign, hãy gán mã cho các dòng có mã màu trùng nhau để tiết kiệm thời gian.',
            ],
          },
        ],
      },
    ],
  },
]