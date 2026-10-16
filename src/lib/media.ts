import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const PRODUCT_IMAGE_DIR = path.join(process.cwd(), "data/uploads/products");
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024;

export class MediaError extends Error {}

/** Stores an uploaded pack photo as <medicineId>-<random>.<ext>; returns the file name. */
export async function saveProductImage(medicineId: number, file: File) {
  const ext = TYPES[file.type];
  if (!ext) throw new MediaError("Photo must be a JPG, PNG or WEBP image.");
  if (file.size > MAX_BYTES) throw new MediaError("Photo must be 4 MB or smaller.");
  await fs.mkdir(PRODUCT_IMAGE_DIR, { recursive: true });
  const name = `${medicineId}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(PRODUCT_IMAGE_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function deleteProductImage(name: string | null) {
  if (!name || !/^[0-9]+-[a-f0-9]+\.(jpg|png|webp)$/.test(name)) return;
  await fs.rm(path.join(PRODUCT_IMAGE_DIR, name), { force: true });
}
