// Rule v1 from the approved formula table. All calculations stay in integers.
export const RULE_VERSION = 'v1';
export function invoiceAmounts(labor: string, materials: string, points = '0') {
  const L = BigInt(labor), M = BigInt(materials), R = BigInt(points), total = L + M;
  if (L < 0n || M < 0n || R < 0n || R > total) throw new RangeError('Invalid invoice amounts');
  const cash = total - R;
  return { total: String(total), fee: String(L / 10n), cash_due: String(cash), reward: String(total ? L * cash / (50n * total) : 0n) };
}
