"use client";

import { useActionState } from "react";
import { trackOrder } from "@/app/actions/account";
import { Field, inputCls } from "./auth-forms";

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrder, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Order ID">
          <input
            name="code"
            required
            placeholder="MC…"
            autoCapitalize="characters"
            className={`${inputCls} uppercase`}
          />
        </Field>
        <Field label="Mobile number">
          <input name="phone" type="tel" inputMode="tel" required placeholder="01XXXXXXXXX" className={inputCls} />
        </Field>
      </div>
      <button
        disabled={pending}
        className="h-12 w-full rounded-2xl bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Looking up…" : "Track order"}
      </button>
    </form>
  );
}
