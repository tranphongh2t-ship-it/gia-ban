import { GuideTabDef } from '../components/GuideTabs'

export const pvcPetgGuideTabs: GuideTabDef[] = [
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
              'Mã SP của ván phủ PVC Film - PETG gồm 2 họ mã: NP (ván nhựa / ván phủ Film) và MP (ván MDF phủ Film).',
            ],
          },
        ],
      },
      {
        title: 'Họ NP — Ván nhựa (Durabo & than tre)',
        content: [
          {
            type: 'codeTable',
            codeTable: [
              {
                code: 'NP08055NW061',
                parts: [
                  { token: 'NP', meaning: 'Ván nhựa phủ Film' },
                  { token: '08', meaning: 'Độ dày 8mm' },
                  { token: '055', meaning: 'Trọng lượng 0,55 g' },
                  { token: 'NW06', meaning: 'Mã màu (bỏ khoảng trắng)' },
                  { token: '1', meaning: '1 mặt (phủ một mặt)' },
                ],
              },
              {
                code: 'NP1705PM332',
                note: 'Ví dụ ván Durabo 17mm 0,5g, mã màu PM 33, phủ 2 mặt',
                parts: [
                  { token: 'NP', meaning: 'Ván nhựa phủ Film' },
                  { token: '17', meaning: 'Độ dày 17mm' },
                  { token: '05', meaning: 'Trọng lượng 0,5 g' },
                  { token: 'PM33', meaning: 'Mã màu (bỏ khoảng trắng)' },
                  { token: '2', meaning: '2 mặt (phủ hai mặt)' },
                ],
              },
              {
                code: 'NP08065SS282',
                note: 'Ví dụ ván nhựa than tre 8mm 0,65g, mã màu SS28, phủ 2 mặt',
                parts: [
                  { token: 'NP', meaning: 'Ván nhựa phủ Film' },
                  { token: '08', meaning: 'Độ dày 8mm' },
                  { token: '065', meaning: 'Trọng lượng 0,65 g' },
                  { token: 'SS28', meaning: 'Mã màu (bỏ khoảng trắng)' },
                  { token: '2', meaning: '2 mặt (phủ hai mặt)' },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Họ MP — Ván MDF',
        content: [
          {
            type: 'codeTable',
            codeTable: [
              {
                code: 'MP17PW202',
                note: 'Ví dụ MDF thường 17mm, mã màu PW 20, phủ 2 mặt',
                parts: [
                  { token: 'MP', meaning: 'Ván MDF phủ Film' },
                  { token: '17', meaning: 'Độ dày 17mm' },
                  { token: 'PW20', meaning: 'Mã màu (bỏ khoảng trắng)' },
                  { token: '2', meaning: '2 mặt (phủ hai mặt)' },
                ],
              },
              {
                code: 'MP08LMRSS282',
                note: 'Ví dụ MDF kháng ẩm VN 8mm, mã màu SS28, phủ 2 mặt',
                parts: [
                  { token: 'MP', meaning: 'Ván MDF phủ Film' },
                  { token: '08', meaning: 'Độ dày 8mm' },
                  { token: 'LMR', meaning: 'Kháng ẩm (LMR = chống ẩm)' },
                  { token: 'SS28', meaning: 'Mã màu (bỏ khoảng trắng)' },
                  { token: '2', meaning: '2 mặt (phủ hai mặt)' },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Mã theo từng loại ván',
        content: [
          {
            type: 'genericTable',
            table: {
              columns: ['Loại ván', 'Quy tắc mã', 'Ví dụ'],
              rows: [
                ['DURABO 0.5', 'NP{độ dày}05{màu}{số mặt}', 'NP1705PM332'],
                ['DURABO 0.55', 'NP{độ dày}055{màu}{số mặt}', 'NP08055NW061'],
                ['DURABO 0.6', 'NP{độ dày}06{màu}{số mặt}', 'NP1206NW012'],
                ['Ván nhựa than tre 0.65', 'NP{độ dày}065{màu}{số mặt}', 'NP08065SS282'],
                ['MDF thường', 'MP{độ dày}{màu}{số mặt}', 'MP17PW202'],
                ['MDF kháng ẩm VN', 'MP{độ dày}LMR{màu}{số mặt}', 'MP08LMRSS282'],
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
              'Mã màu lấy từ bảng màu (bỏ khoảng trắng): NW 06 → NW06, PM 33 → PM33, SS28 → SS28.',
              'Độ dày viết 2 chữ số: 5mm → 05, 8mm → 08, 12mm → 12, 17mm → 17.',
              'Số mặt là chữ số cuối cùng của mã (1 hoặc 2).',
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
              'Giá được tổ chức theo 2 trục: Nhóm màu (Ưu đãi / Standard / Premium / PETG) và Số mặt (1 mặt / 2 mặt). Mỗi ô = giá của 1 mã màu ở độ dày và loại ván tương ứng.',
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
              { label: 'Ưu đãi 1 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_uu_dai_1m' },
              { label: 'Ưu đãi 2 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_uu_dai_2m' },
              { label: 'Standard 1 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_standard_1m' },
              { label: 'Standard 2 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_standard_2m' },
              { label: 'Premium 1 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_premium_1m' },
              { label: 'Premium 2 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_premium_2m' },
              { label: 'PETG 1 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_petg_1m' },
              { label: 'PETG 2 mặt', formula: 'bang_gia_chuan_van_phu_pvc_petg.gia_petg_2m' },
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
              'Giá được nhập trong màn hình Bảng giá chuẩn (loại ván x độ dày), không sửa trực tiếp tại bảng này.',
              'Khi bấm "Tính toán lại", bảng được tạo lại từ bảng giá chuẩn nhưng giữ nguyên mã SP đã gán.',
              'Nhóm màu thuộc bảng màu (bang_gia_chuan_pvc_film_dura): Ưu đãi, Standard, Premium, PETG.',
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
              'Mở trang Tính Giá Ván Phủ PVC FILM - PETG, bấm "Tính toán lại" để tạo bảng giá mới.',
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
              'Có thể dùng nút gán tự động hàng loạt để sinh mã theo đúng quy tắc cấu trúc bên trên (nếu được bật).',
            ],
          },
        ],
      },
    ],
  },
]
