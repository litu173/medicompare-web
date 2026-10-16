"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { changeOrderStatus, OrderError, setPacked } from "@/lib/orders";
import { adjustStock, setImage, setLowStockAt, setPackPrice, setStockCount } from "@/lib/inventory";
import { deleteProductImage, MediaError, saveProductImage } from "@/lib/media";
import { saveSettings } from "@/lib/settings";
import { BD_PHONE } from "@/lib/bd";

export type ActionResult = { error?: string; ok?: string } | undefined;

async function requireAdmin() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") throw new Error("Forbidden");
  return user;
}

function fail(e: unknown): ActionResult {
  if (e instanceof OrderError || e instanceof MediaError) return { error: e.message };
  throw e;
}

const NOTES: Record<string, string> = {
  confirmed: "Order confirmed",
  packed: "Packed and checked",
  shipped: "Handed over for delivery",
  delivered: "Delivered",
  cancelled: "Order cancelled",
};

export async function updateStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireAdmin();
  const code = String(form.get("code"));
  const status = String(form.get("status"));
  const riderPhone = String(form.get("riderPhone") ?? "").replace(/[\s-]/g, "");
  if (status === "shipped" && riderPhone && !BD_PHONE.test(riderPhone)) {
    return { error: "Enter a valid mobile number for the delivery person." };
  }
  if (status === "cancelled" && !String(form.get("note") ?? "").trim()) {
    return { error: "Please give a reason for cancelling. The customer will see it." };
  }
  try {
    changeOrderStatus(code, status, {
      actor: user.name,
      note: String(form.get("note") ?? "").trim() || null,
      riderName: String(form.get("riderName") ?? ""),
      riderPhone,
      trackingNote: String(form.get("trackingNote") ?? ""),
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: NOTES[status] ?? "Updated" };
}

export async function togglePacked(form: FormData) {
  await requireAdmin();
  setPacked(String(form.get("code")), Number(form.get("itemId")), form.get("packed") === "1");
  revalidatePath(`/admin/orders/${form.get("code")}`);
}

export async function restock(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireAdmin();
  const id = Number(form.get("medicineId"));
  const mode = String(form.get("mode") ?? "add");
  const qty = Math.floor(Number(form.get("qty")));
  if (!Number.isFinite(qty) || qty < 0 || qty > 1_000_000) return { error: "Enter a valid quantity." };
  const note = String(form.get("note") ?? "").trim() || null;
  if (mode === "set") setStockCount(id, qty, user.id, note ?? undefined);
  else if (mode === "remove")
    adjustStock(id, -qty, "adjust", { userId: user.id, note: note ?? "Removed (damaged/expired)" });
  else {
    if (qty === 0) return { error: "Enter how many units arrived." };
    adjustStock(id, qty, "restock", { userId: user.id, note, ref: String(form.get("ref") ?? "").trim() || null });
  }
  revalidatePath("/admin", "layout");
  return {
    ok: mode === "set" ? `Stock set to ${qty}` : mode === "remove" ? `Removed ${qty}` : `Added ${qty} to stock`,
  };
}

export async function updateLowStock(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  setLowStockAt(Number(form.get("medicineId")), Math.floor(Number(form.get("lowStockAt")) || 0));
  revalidatePath("/admin", "layout");
  return { ok: "Alert level saved" };
}

export async function uploadPhoto(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(form.get("medicineId"));
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  try {
    const name = await saveProductImage(id, file);
    await deleteProductImage(setImage(id, name));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Photo saved. It now shows everywhere this medicine appears." };
}

export async function removePhoto(form: FormData) {
  await requireAdmin();
  await deleteProductImage(setImage(Number(form.get("medicineId")), null));
  revalidatePath("/", "layout");
}

export async function updatePrices(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  let n = 0;
  for (const [k, v] of form.entries()) {
    const m = k.match(/^price_(\d+)$/);
    if (!m) continue;
    const price = Number(v);
    if (!(price > 0) || price > 1_000_000) return { error: "Prices must be positive numbers." };
    setPackPrice(Number(m[1]), Math.round(price * 100) / 100);
    n++;
  }
  revalidatePath("/", "layout");
  return { ok: `Saved ${n} price${n === 1 ? "" : "s"}` };
}

export async function updateSettings(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const num = (k: string) => Number(form.get(k));
  const vals = {
    deliveryInsideDhaka: num("deliveryInsideDhaka"),
    deliveryOutsideDhaka: num("deliveryOutsideDhaka"),
    freeDeliveryOver: num("freeDeliveryOver"),
  };
  if (Object.values(vals).some((v) => !Number.isFinite(v) || v < 0)) return { error: "Fees must be 0 or more." };
  saveSettings({ ...vals, supportPhone: String(form.get("supportPhone") ?? "").trim() });
  revalidatePath("/admin/settings");
  return { ok: "Settings saved" };
}
