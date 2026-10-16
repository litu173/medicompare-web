"use client";

import { useActionState, useRef } from "react";
import { Plus } from "lucide-react";
import { restock } from "@/app/actions/admin";

/** Inline "+ add stock" box for the inventory list. */
export function QuickRestock({ medicineId }: { medicineId: number }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof restock>>, form: FormData) => {
    const r = await restock(prev, form);
    if (r?.ok) ref.current?.reset();
    return r;
  }, undefined);
  return (
    <form ref={ref} action={action} className="flex items-center gap-1">
      <input type="hidden" name="medicineId" value={medicineId} />
      <input type="hidden" name="mode" value="add" />
      <input
        name="qty"
        type="number"
        min={1}
        inputMode="numeric"
        required
        aria-label="Units received"
        placeholder="+ qty"
        className="h-10 w-20 rounded-lg border border-gray-300 px-2 text-[16px] tabular-nums outline-none focus:border-brand-600"
      />
      <button
        disabled={pending}
        aria-label="Add to stock"
        className="grid size-10 place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
      >
        <Plus className="size-4" />
      </button>
      {state?.ok && !pending && (
        <span className="sr-only" role="status">
          {state.ok}
        </span>
      )}
      {state?.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
