import { GuideTabDef } from '../components/GuideTabs'

export const osbGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã MISA',
        content: [
          {
            type: 'codeTable',
            codeTable: [
              {
                code: 'TOSBPINE18E0',
                parts: [
                  { token: 'T', meaning: 'Tiền tố chung, phân biệt hàng thường vs hàng XK' },
                  { token: 'OSB', meaning: 'Nhóm tấm: OSB (Pine) hoặc OSB2 (khác Pine)' },
                  { token: 'PINE', meaning: 'Gỗ Pine (chỉ có ở OSB). OSB2 không có đoạn này' },
                  { token: '18', meaning: 'Độ dày tấm (mm), 2 chữ số' },
                  { token: 'E0', meaning: 'Cấp phát thải formandehit: E0 (Pine) hoặc E2 (OSB2)' },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Mã theo từng loại tấm',
        content: [
          {
            type: 'genericTable',
            table: {
              columns: ['Loại tấm', 'Quy tắc mã', 'Ví dụ'],
              rows: [
                ['OSB (Pine)', 'TOSBPINE{độ dày}E0', 'TOSBPINE12E0'],
                ['OSB (Pine)', 'TOSBPINE{độ dày}E0', 'TOSBPINE18E0'],
                ['OSB2 (không Pine)', 'TOSB2{độ dày}E2', 'TOSB209E2'],
                ['OSB2 (không Pine)', 'TOSB2{độ dày}E2', 'TOSB217E2'],
              ],
            },
          },
        ],
      },
      {
        title: 'Lưu ý',
        content: [
          {
            type: 'notes',
            notes: [
              'MISA chỉ có OSB2 độ dày 9/11/12/18mm. Các độ dày khác (8/17/19mm) không có sẵn → phải gán thủ công qua nút "Gán SP".',
              'Mã gán thủ công được lưu lại trong bảng mã MISA với trạng thái "manual" và không bị mất khi bấm "Tính toán lại".',
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
        title: 'Các loại giá',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mỗi độ dày có 5 loại giá, tính từ Giá gốc. Sau khi chỉnh "Giá gốc", các giá còn lại được tính lại theo công thức bên dưới:',
            ],
          },
        ],
      },
      {
        title: 'Công thức',
        content: [
          {
            type: 'formulaTable',
            formulas: [
              { label: 'Giá gốc', formula: 'Giá nhập vào', example: '450.000' },
              { label: 'Đã CK 10%', formula: 'Giá gốc × 90%', example: '450.000 × 0,90 = 405.000' },
              { label: 'Đã CK 15%', formula: 'Giá gốc × 85%', example: '450.000 × 0,85 = 382.500' },
              { label: 'Chưa CK 10%', formula: 'Giá gốc × 99%', example: '450.000 × 0,99 = 445.500' },
              { label: 'Chưa CK 15%', formula: 'Giá gốc × 93,5%', example: '450.000 × 0,935 = 420.750' },
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
              'Khi bấm "Tính toán lại", toàn bộ bảng được tạo lại từ bảng giá chuẩn (bang_gia_chuan_osb) nhưng giữ nguyên mã SP đã gán.',
              'Giá chuẩn được nhập trong màn hình Bảng giá chuẩn, không sửa trực tiếp tại bảng này.',
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
              'Mở trang Tính giá OSB, bấm "Tính toán lại" để tạo bảng giá mới.',
              'Tại dòng cần gán mã, bấm nút "Gán SP" (hoặc "Sửa SP" nếu đã có mã).',
              'Tìm mã phù hợp trong danh sách MISA có sẵn, hoặc nhập mã mới ở phần "Nhập mã thủ công" (Mã SP + Mô tả).',
              'Bấm "Lưu" để lưu mã. Nếu mã chưa tồn tại, hệ thống tự thêm vào bảng mã MISA.',
              'Kiểm tra lại sau khi bấm "Tính toán lại" — mã đã gán vẫn được giữ nguyên.',
            ],
          },
        ],
      },
      {
        title: 'Quy tắc gán mã',
        content: [
          {
            type: 'genericTable',
            table: {
              columns: ['Trạng thái', 'Hành động'],
              rows: [
                ['Mã trống', 'Bấm "Gán SP" để chọn/nhập mã'],
                ['Đã có mã', 'Bấm "Sửa SP" để đổi mã khác'],
                ['Mã không có trong MISA', 'Nhập mã thủ công — hệ thống tự thêm vào bảng mã'],
              ],
            },
          },
        ],
      },
    ],
  },
]
