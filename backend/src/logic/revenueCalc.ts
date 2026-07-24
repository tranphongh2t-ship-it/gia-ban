// ============================================================
// revenueCalc.ts — Cột Z (Z1-Z5)
// SPEC mục 4.7: tách 1 công thức khổng lồ thành 5 hàm nhỏ
// ============================================================

export interface RevenueInput {
  X: number  // Doanh số
  Y: number  // Giảm trừ
  AE: number // Giá trị chịu thuế
  AH: number // Thuế suất (%)
  P: number  // Đơn giá gốc
  U: number  // Phụ phí
  V: number  // Tỷ lệ CK (%)
  AC: number // Điều chỉnh khác
}

export interface RevenueResult {
  Z1: number // Doanh số sạch
  Z2: number // Giá trị thuế
  Z3: number // Đơn giá tính CK
  Z4: number // CK theo đơn giá
  Z5: number // Tổng cộng
}

export function calcZ1(X: number, Y: number): number {
  return X - Y
}

export function calcZ2(AE: number, AH: number): number {
  return AE * (AH / 100)
}

export function calcZ3(P: number, U: number): number {
  return P + U
}

export function calcZ4(Z3: number, V: number): number {
  return Z3 * (V / 100)
}

export function calcZ5(Z1: number, Z2: number, Z4: number, AC: number): number {
  return Z1 - Z2 - Z4 + AC
}

export function calculateAll(input: RevenueInput): RevenueResult {
  const Z1 = calcZ1(input.X, input.Y)
  const Z2 = calcZ2(input.AE, input.AH)
  const Z3 = calcZ3(input.P, input.U)
  const Z4 = calcZ4(Z3, input.V)
  const Z5 = calcZ5(Z1, Z2, Z4, input.AC)
  return { Z1, Z2, Z3, Z4, Z5 }
}
