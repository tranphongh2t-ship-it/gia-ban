import { GuideTabDef } from '../components/GuideTabs'

export const mirrorGuideTabs: GuideTabDef[] = [
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
              'Mã SP ván Mirror (MDF / Ván nhựa phủ gương) tìm theo từ khóa quy cách và loại. Hệ thống không tự gán — mỗi dòng có sẵn cột Mã SP / Mô tả SP hiển thị trực tiếp, gán bằng cách nhập mã MISA tại trang quản lý bảng giá chuẩn Mirror.',
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
              'Bảng Mirror là bảng nhập trực tiếp — giá 1 mặt / 2 mặt được nhập sẵn theo từng loại và quy cách, không có công thức tính toán.',
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
              { label: 'Giá 1 mặt', formula: 'gia_1m (nhập trực tiếp)' },
              { label: 'Giá 2 mặt', formula: 'gia_2m (nhập trực tiếp)' },
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
              'Trang này không có nút "Tính toán lại" — dữ liệu quản lý trực tiếp từ bảng giá chuẩn.',
              'Cột Giá 1 mặt / Giá 2 mặt chỉ hiển thị khi nguồn đó có dữ liệu tương ứng.',
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
              'Mở trang quản lý bảng giá chuẩn Mirror.',
              'Nhập mã SP và mô tả SP cho từng dòng theo quy cách/loại.',
              'Lưu — mã hiển thị lại tại trang Tính Giá Mirror.',
            ],
          },
        ],
      },
    ],
  },
]