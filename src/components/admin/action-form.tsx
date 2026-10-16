"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ActionResult } from "@/app/actions/admin";

/** Form bound to a server action that shows its success or error message and a pending state. */
export function ActionForm({
  action,
  children,
  submit,
  submitClass = "bg-brand-600 hover:bg-brand-700 text-white",
  pendingText = "Saving…",
  className = "space-y-3",
  confirm,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submit: React.ReactNode;
  submitClass?: string;
  pendingText?: string;
  className?: string;
  /** Ask before submitting (for irreversible steps). */
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}
      {state?.ok && !pending && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          <CheckCircle2 className="size-4 shrink-0" /> {state.ok}
        </p>
      )}
      <button
        disabled={pending}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold disabled:opacity-60 ${submitClass}`}
      >
        {pending ? pendingText : submit}
      </button>
    </form>
  );
}

export const adminInput =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-[16px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20";
