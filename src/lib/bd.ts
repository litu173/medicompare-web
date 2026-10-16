export { DIVISIONS, THANAS } from "./geo";

/** Defaults; the live values are editable by admins (see settings.ts). */
export const DELIVERY = {
  insideDhaka: 60,
  outsideDhaka: 120,
  freeOver: 1000,
};

export const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", note: "Pay when you receive", enabled: true },
  { id: "bkash", label: "bKash", note: "Coming soon", enabled: false },
  { id: "nagad", label: "Nagad", note: "Coming soon", enabled: false },
  { id: "card", label: "Card (Visa / Mastercard)", note: "Coming soon", enabled: false },
] as const;

export const ORDER_STATUSES = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;

/** Customer-facing wording for each order status. */
export const STATUS_INFO: Record<string, { label: string; detail: string }> = {
  placed: { label: "Order placed", detail: "We've received your order and will call to confirm." },
  confirmed: { label: "Confirmed", detail: "Your order is confirmed and is being packed." },
  packed: { label: "Packed", detail: "Every item has been checked and packed." },
  shipped: { label: "Out for delivery", detail: "Your order is on the way." },
  delivered: { label: "Delivered", detail: "Delivered. Thank you for your order!" },
  cancelled: { label: "Cancelled", detail: "This order was cancelled." },
};

export const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
