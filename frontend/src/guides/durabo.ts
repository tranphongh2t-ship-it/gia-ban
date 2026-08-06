import { GuideTabDef } from '../components/GuideTabs'

export const duraboGuideTabs: GuideTabDef[] = [
  {
    key: 'ma-sp',
    label: 'Mã SP (MISA)',
    sections: [
      {
        title: 'Cấu trúc mã SP',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Mã SP ván nhựa DURABO thuộc họ NT (Ván nhựa Durabo), quy tắc: NT + độ dày (2 chữ số) + trọng lượng + hậu tố (mặt bảo hộ / siêu bóng / lõi).',
            ],
          },
        ],
      },
      {
        title: 'DURABO ECO (0.32–0.37D ko BH)',
        content: [
          {
            type: 'codeTable',
            codeTable: [
              {
                code: 'NT05ECO',
                parts: [
                  { token: 'NT', meaning: 'Ván nhựa Durabo' },
                  { token: '05', meaning: 'Độ dày 5mm (2 chữ số)' },
                  { token: 'ECO', meaning: 'Dòng Durabo Eco (mặt xanh, không bảo hộ)' },
                ],
              },
            ],
          },
          {
            type: 'genericTable',
            table: {
              columns: ['Độ dày', 'Quy tắc mã', 'Ví dụ'],
              rows: [
                ['3mm', 'NT03ECO', 'NT03ECO'],
                ['5mm', 'NT05ECO', 'NT05ECO'],
                ['8mm', 'NT08ECO', 'NT08ECO'],
              ],
            },
          },
        ],
      },
      {
        title: 'DURABO (0.5D / 0.55D / 0.6D)',
        content: [
          {
            type: 'codeTable',
            codeTable: [
              {
                code: 'NT080551',
                note: 'Ví dụ Durabo 8mm 0,55g, bảo hộ 1 mặt cam',
                parts: [
                  { token: 'NT', meaning: 'Ván nhựa Durabo' },
                  { token: '08', meaning: 'Độ dày 8mm' },
                  { token: '055', meaning: 'Trọng lượng 0,55 g' },
                  { token: '51', meaning: 'Bảo hộ 1 mặt cam' },
                ],
              },
              {
                code: 'NT10062M',
                note: 'Ví dụ Durabo 10mm 0,6g, bảo hộ 2 mặt tím',
                parts: [
                  { token: 'NT', meaning: 'Ván nhựa Durabo' },
                  { token: '10', meaning: 'Độ dày 10mm' },
                  { token: '06', meaning: 'Trọng lượng 0,6 g' },
                  { token: '2M', meaning: 'Bảo hộ 2 mặt' },
                ],
              },
              {
                code: 'NT1705',
                note: 'Ví dụ Durabo 17mm 0,5g, không bảo hộ',
                parts: [
                  { token: 'NT', meaning: 'Ván nhựa Durabo' },
                  { token: '17', meaning: 'Độ dày 17mm' },
                  { token: '05', meaning: 'Trọng lượng 0,5 g' },
                ],
              },
            ],
          },
          {
            type: 'genericTable',
            table: {
              columns: ['Loại', 'Quy tắc mã', 'Ví dụ'],
              rows: [
                ['DURABO 0.5 ko BH', 'NT{độ dày}05', 'NT0905, NT1505, NT1705'],
                ['DURABO 0.5 ko BH (1m BH)', 'NT{độ dày}051M', 'NT08051M'],
                ['DURABO 0.55', 'NT{độ dày}055{mặt BH}', 'NT08055 (ko BH), NT080551 (1m)'],
                ['DURABO 0.6', 'NT{độ dày}06{mặt BH}', 'NT0806 (ko BH), NT10062M (2m)'],
              ],
            },
          },
        ],
      },
      {
        title: 'DURABO Siêu bóng',
        content: [
          {
            type: 'codeTable',
            codeTable: [
              {
                code: 'NT1706SB2',
                note: 'Ví dụ Durabo 17mm 0,6g, siêu bóng bảo hộ 2 mặt',
                parts: [
                  { token: 'NT', meaning: 'Ván nhựa Durabo' },
                  { token: '17', meaning: 'Độ dày 17mm' },
                  { token: '06', meaning: 'Trọng lượng 0,6 g' },
                  { token: 'SB', meaning: 'Siêu bóng' },
                  { token: '2', meaning: '2 mặt bảo hộ' },
                ],
              },
              {
                code: 'NT1706SB1BH1',
                note: 'Ví dụ Durabo 17mm 0,6g, siêu bóng 1m bảo hộ 1m',
                parts: [
                  { token: 'NT', meaning: 'Ván nhựa Durabo' },
                  { token: '17', meaning: 'Độ dày 17mm' },
                  { token: '06', meaning: 'Trọng lượng 0,6 g' },
                  { token: 'SB1', meaning: 'Siêu bóng 1 mặt' },
                  { token: 'BH1', meaning: 'Bảo hộ 1 mặt' },
                ],
              },
            ],
          },
          {
            type: 'genericTable',
            table: {
              columns: ['Loại', 'Quy tắc mã', 'Ví dụ'],
              rows: [
                ['Siêu bóng 1 mặt', 'NT{độ dày}06SB1BH1', 'NT1706SB1BH1'],
                ['Siêu bóng 2 mặt', 'NT{độ dày}06SB2', 'NT0806SB2, NT1706SB2'],
              ],
            },
          },
        ],
      },
      {
        title: 'Ván nhựa 3 lớp (Co-extrusion)',
        content: [
          {
            type: 'paragraphs',
            text: [
              'Lưu ý: lõi đen chỉ có trọng lượng 0.65–0.7D (KHÔNG có 0.55D). Lõi trắng có mã 0.65g.',
            ],
          },
          {
            type: 'genericTable',
            table: {
              columns: ['Loại', 'Quy tắc mã', 'Ví dụ'],
              rows: [
                ['Lõi đen', 'NT{độ dày}065B2M', 'NT08065B2M, NT17065B2M'],
                ['Lõi trắng', 'NT{độ dày}065T', 'NT17065T'],
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
              'Độ dày viết 2 chữ số: 3mm → 03, 5mm → 05, 8mm → 08, 17mm → 17.',
              'Trọng lượng viết 2–3 chữ số: 0,5g → 05, 0,55g → 055, 0,6g → 06, 0,65g → 065.',
              'Celuka (ván nhựa 1 lớp) và WPC Shield Board chưa có mã trong bảng mã MISA → phải gán thủ công qua nút "Gán SP".',
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
              'Mỗi dòng = một loại ván (độ dày + trọng lượng + mặt bảo hộ) theo bảng giá chuẩn. Giá hiển thị chính là giá ván trơn từ bảng giá chuẩn DURABO, không có công thức cộng/trừ.',
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
              { label: 'Giá ván trơn', formula: 'bang_gia_chuan_durabo.gia' },
              { label: 'Nhóm', formula: 'DURABO ECO / DURABO / Ván nhựa' },
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
              'Giá chuẩn được nhập trong màn hình Bảng giá chuẩn (Ván nhựa Durabo), không sửa trực tiếp tại bảng này.',
              'Giá ván trơn áp dụng cho đơn hàng tối thiểu 10 tấm/độ dày/loại và chẵn xấp (đối với DURABO và DURABO ECO).',
              'Khi bấm "Tính toán lại", bảng được tạo lại từ bảng giá chuẩn nhưng giữ nguyên mã SP đã gán.',
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
              'Mở trang Tính Giá Ván Nhựa DURABO, bấm "Tính toán lại" để tạo bảng giá mới.',
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
      {
        title: 'Gợi ý',
        content: [
          {
            type: 'notes',
            notes: [
              'DURABO ECO, DURABO, Siêu bóng và Co-extrusion (lõi đen/trắng) có mã NT sẵn trong MISA — gán theo quy tắc cấu trúc ở tab "Mã SP".',
              'Celuka Trắng và WPC Shield Board chưa có mã sẵn — gán thủ công khi có mã từ kế toán/MISA.',
            ],
          },
        ],
      },
    ],
  },
]
