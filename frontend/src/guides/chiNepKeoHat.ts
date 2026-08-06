import { GuideTabDef } from '../components/GuideTabs'

export const chiNepKeoHatGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã CHỈ NẸP',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Chỉ nẹp chia 4 nhóm: PVC (nhập khẩu cao cấp), VENEER, ACRYLIC (nhập khẩu), ABS/PVC bóng. Nút "Gán Mã SP từ danh mục MISA" chỉ áp dụng cho nhóm PVC.',
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
              'Nút "Gán SP" tìm mã MISA theo từ khóa: mã SP hiện tại + kích thước (searchStr = ma_sp + kich_thuoc).',
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
              'Giá chỉ nẹp nhập trực tiếp theo kích thước từng dòng, không có công thức cộng/trừ.',
            ],
          },
        ],
      },
      {
        title: 'KEO HẠT',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Keo hạt nóng chảy có 2 mức giá: giá 1 ký và giá bao 25 ký — nhập trực tiếp, không có công thức.',
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
              { label: 'Chỉ nẹp', formula: 'gia (nhập trực tiếp)' },
              { label: 'Keo hạt', formula: 'gia_1kg / gia_25kg (nhập trực tiếp)' },
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
              'Nhóm PVC: bấm "Gán Mã SP từ danh mục MISA" để tự gán hàng loạt.',
              'Các nhóm VENEER / ACRYLIC / ABS_PVC: gán thủ công qua nút "Gán SP" từng dòng.',
            ],
          },
        ],
      },
    ],
  },
]