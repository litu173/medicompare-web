// Per-unit price used to rank equivalent brands. Shared by the importer and admin price edits.

export type PackPrice = { label: string; qty: number; price: number };

export function unitNoun(form: string) {
  const f = form.toLowerCase();
  if (f.includes("capsule")) return "capsule";
  if (f.includes("tablet")) return "tablet";
  if (f.includes("suppository")) return "suppository";
  if (f.includes("sachet") || f.includes("powder")) return "sachet";
  if (f.includes("patch")) return "patch";
  return "piece";
}

/**
 * Price of one comparable unit of a pack:
 *  "1 tablet" ৳5 → ৳5/tablet · "Box of 30 tablets" ৳150 → ৳5/tablet · "100 ml bottle" ৳40 → ৳0.40/ml
 *  "Pack of 5 × 100 ml bottle" → per ml · "100's blister" (qty 100) → per tablet · "500 mg vial" → per vial
 */
export function packUnitPrice(p: PackPrice, form: string): { value: number; unit: string } | null {
  if (!(p.price > 0) || !(p.qty > 0)) return null;
  const perItem = p.price / p.qty;
  const label = p.label.replace(/^Pack of \d+ × /, "");
  if (/^1 (tablet|capsule|suppository|sachet|patch|piece)$/.test(label) || /^Box of \d+ /.test(label)) {
    return { value: perItem, unit: unitNoun(form) };
  }
  const vol = label.match(/^([\d.]+)\s*(ml|gm)\b/i);
  if (vol && Number(vol[1]) > 0) return { value: perItem / Number(vol[1]), unit: vol[2].toLowerCase() };
  if (/^\d+(?:'s\b|\s+(?:tablet|capsule)s?\b)/i.test(label) && p.qty > 1)
    return { value: perItem, unit: unitNoun(form) };
  return { value: perItem, unit: label.split(" ").pop() || "unit" };
}

/** Cheapest comparable unit price across a medicine's packs. */
export function comparePrice(packs: PackPrice[], form: string) {
  let best: { value: number; unit: string } | null = null;
  for (const p of packs) {
    const u = packUnitPrice(p, form);
    if (u && (!best || u.value < best.value)) best = u;
  }
  return best ? { value: Math.round(best.value * 10000) / 10000, unit: best.unit } : null;
}
