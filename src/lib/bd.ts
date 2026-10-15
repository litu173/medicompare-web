// Bangladesh divisions and districts (64) for address forms.
export const DIVISIONS: Record<string, string[]> = {
  Dhaka: [
    "Dhaka",
    "Gazipur",
    "Narayanganj",
    "Narsingdi",
    "Manikganj",
    "Munshiganj",
    "Faridpur",
    "Gopalganj",
    "Madaripur",
    "Rajbari",
    "Shariatpur",
    "Kishoreganj",
    "Tangail",
  ],
  Chattogram: [
    "Chattogram",
    "Cox's Bazar",
    "Cumilla",
    "Brahmanbaria",
    "Chandpur",
    "Feni",
    "Lakshmipur",
    "Noakhali",
    "Khagrachhari",
    "Rangamati",
    "Bandarban",
  ],
  Rajshahi: ["Rajshahi", "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Sirajganj"],
  Khulna: [
    "Khulna",
    "Bagerhat",
    "Satkhira",
    "Jashore",
    "Jhenaidah",
    "Magura",
    "Narail",
    "Kushtia",
    "Chuadanga",
    "Meherpur",
  ],
  Barishal: ["Barishal", "Barguna", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Sylhet: ["Sylhet", "Habiganj", "Moulvibazar", "Sunamganj"],
  Rangpur: ["Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon"],
  Mymensingh: ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
};

export const DELIVERY = {
  insideDhaka: 60,
  outsideDhaka: 120,
  freeOver: 1000,
};

export function deliveryFee(district: string, subtotal: number) {
  if (subtotal >= DELIVERY.freeOver) return 0;
  return district === "Dhaka" ? DELIVERY.insideDhaka : DELIVERY.outsideDhaka;
}

export const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", note: "Pay when you receive", enabled: true },
  { id: "bkash", label: "bKash", note: "Coming soon", enabled: false },
  { id: "nagad", label: "Nagad", note: "Coming soon", enabled: false },
  { id: "card", label: "Card (Visa / Mastercard)", note: "Coming soon", enabled: false },
] as const;

export const ORDER_STATUSES = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;

export const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
