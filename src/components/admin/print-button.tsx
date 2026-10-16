"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 font-semibold text-white hover:bg-gray-800 print:hidden"
    >
      <Printer className="size-4" /> Print
    </button>
  );
}
