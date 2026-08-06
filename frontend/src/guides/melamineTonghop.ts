import { GuideTabDef } from '../components/GuideTabs'

export const melamineTonghopGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Tổng quan',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mã SP của dòng ván phủ Melamine tổng hợp bám theo loại cốt và quy tắc phát sinh mã chuẩn ME/MEVN/MEGG… Hệ thống tự đề xuất mã dựa trên (loại cốt, độ dày, mã màu, số mặt).',
            ],
          },
          {
            type: 'genericTable',
            table: {
              columns: ['Loại cốt', 'Tiền tố mã', 'Ghi chú'],
              rows: [
                ['Plywood (EV/SW Pty Cp2/E0)', 'PLY', 'Ván Plywood'],
                ['Lõi đen (0,65g)', 'LD', 'Ván nhựa lõi đen'],
                ['DURABO (0,6g / 0,5g)', 'DURA', 'Ván nhựa Durabo'],
                ['Gỗ ghép', 'GGCS', 'Gỗ ghép'],
                ['OSB', '—', 'Không có mã, bỏ trống'],
              ],
            },
          },
        ],
      },
      {
        title: 'Cách phát hiệu mã thủ công',
        content: [
          {
            type: 'steps',
            steps: [
              'Bấm "Gán SP" tại dòng cần gán (searchStr = bảng + loại cốt + độ dày + mã màu + số mặt).',
              'Hệ thống tìm mã MISA khớp theo từ khóa, hoặc bạn nhập mã thủ công (Mã SP + Mô tả).',
              'Lưu lại — mã chưa có sẽ được tự thêm vào bảng mã MISA.',
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
              'Giá một dòng = giá ván theo (nhóm màu + mã màu) của loại cốt tương ứng, cộng/trừ phần giảm trừ khi phủ 1 mặt.',
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
              { label: 'Plywood', formula: 'gia = getGiaMelamine(nhom, maMau, plywood)', example: 'giá theo nhãn SÁNG/TRUNG/TỐI hoặc đơn sắc 101/104/106' },
              { label: 'Ván nhựa/OSB/Gỗ ghép', formula: 'gia_2m = getGiaMelamine(...)', example: '2 mặt' },
              { label: 'Giảm trừ phủ 1 mặt', formula: 'gia_1m = gia_2m - giam_tru', example: 'chỉ tạo khi gia_1m > 0' },
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
              'Nhóm màu SÁNG/TRUNG dùng gia_sang_trung; TỐI dùng gia_toi; đơn sắc 101/104/106 dùng cột đơn sắc.',
              'Khi bấm "Tính toán lại", hệ thống giữ lại mã SP đã gán theo khóa ma_màu|bang|loai_cot|do_day|so_mat.',
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
              'Bấm "Gán Mã SP từ danh mục MISA" để tự gán mã cho các dòng khớp danh mục.',
              'Với các dòng còn trống, bấm "Gán SP" từng dòng để chọn/nhập mã thủ công.',
              'Kiểm tra lại — mã vẫn giữ nguyên sau khi tính lại.',
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
              'Loại cốt OSB không có mã sẵn → để trống hoặc gán thủ công khi kế toán cung cấp mã.',
              'Nút "Gán SP" trong cột Mã SP cũng cho phép tạo mã mới trong bảng mã MISA.',
            ],
          },
        ],
      },
    ],
  },
]