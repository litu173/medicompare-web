export function taka(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return "৳" + n.toLocaleString("en-BD", { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: 2 });
}

/** "per tablet", "per ml" … */
export function perUnit(unit: string | null | undefined) {
  return unit ? `/${unit}` : "";
}

export function savingsPct(price: number, reference: number) {
  if (!(reference > 0) || price >= reference) return 0;
  return Math.round(((reference - price) / reference) * 100);
}
