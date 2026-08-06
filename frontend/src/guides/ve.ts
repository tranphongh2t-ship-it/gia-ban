import { GuideTabDef } from '../components/GuideTabs'

export const veGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã Ván Ép',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mã SP ván ép bám theo nhóm (Thanh Thúy / Nhập khẩu / Phủ film / Phủ veneer / Okume). Mã chủ yếu dùng tiền tố V2M* (ván ép thứ phổ), TVE0x (Thanh Thúy) và VNVE0x (ván ép nhập khẩu 2 mặt).',
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
              'Hệ thống tự gán mã khớp theo khóa nhóm|loại|quy_cách qua bảng ánh xạ VAN_EP_MA_MAP (mã V2M*, TVE0xBI/BD/EV/OK, TVE17SD/TVE18SD, VNVE0xSOIKT2M/VNVE0xWALNUTKT2M).',
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
              'Mỗi dòng = một quy cách (kích thước) của một loại ván ép. Giá hiển thị chính là giá từ bảng giá chuẩn, không có công thức cộng/trừ.',
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
              { label: 'Ván ép Thanh Thúy', formula: 'gia = row[kt_1000x2000 | kt_1220x2440]' },
              { label: 'Ván ép khác', formula: 'gia = row.gia' },
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
              'Nút "Gán SP" cho phép tìm mã MISA theo từ khóa hoặc nhập mã thủ công.',
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