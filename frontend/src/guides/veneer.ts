import { GuideTabDef } from '../components/GuideTabs'

export const veneerGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã VENEER',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mã SP veneer bám theo loại gỗ veneer và bề mặt (1 mặt A / 1 mặt B / 2 mặt AB/AA). Nút "Gán Mã SP từ danh mục MISA" tự gán theo khóa loại + bề mặt.',
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
              'Nút "Gán SP" tìm mã MISA theo từ khóa: loại + bề mặt (searchStr = loai + be_mat).',
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
              'Mỗi dòng = một loại veneer (mặt). Giá gồm 3 mức: giá 1 mặt A, giá 1 mặt B, giá 2 mặt AB/AA — nhập trực tiếp theo bề mặt, không có công thức cộng/trừ.',
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
              { label: 'Giá 1 mặt A', formula: 'gia_1m_a (nhập trực tiếp)' },
              { label: 'Giá 1 mặt B', formula: 'gia_1m_b (nhập trực tiếp)' },
              { label: 'Giá 2 mặt AB/AA', formula: 'gia_2m (nhập trực tiếp)' },
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
              'Bấm "Gán Mã SP từ danh mục MISA" để tự gán mã cho khối VENEER.',
              'Các dòng còn trống gán thủ công qua nút "Gán SP" (loại + bề mặt).',
            ],
          },
        ],
      },
    ],
  },
]

export const matPhuKhacGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã MẶT PHỦ KHÁC',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mặt phủ khác là các loại mặt phủ đặc biệt. Nút "Gán SP" tìm mã MISA theo tên của từng mặt phủ (searchStr = ten).',
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
              'Giá 1 mặt / 2 mặt được nhập trực tiếp theo từng mặt phủ khác, không có công thức tính.',
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
              'Tại dòng cần gán, bấm nút "Gán SP" trong cột Mã SP.',
              'Chọn mã khớp từ danh sách gợi ý MISA theo tên mặt phủ.',
            ],
          },
        ],
      },
    ],
  },
]