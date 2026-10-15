"use client";

import { useActionState } from "react";
import { trackOrder } from "@/app/actions/account";
import { Field, inputCls } from "@/components/auth-forms";

export default function TrackPage() {
  const [state, action, pending] = useActionState(trackOrder, undefined);
  return (
    <form action={action} className="mx-auto max-w-sm space-y-4 pt-8">
      <div>
        <h1 className="text-2xl font-bold">Track your order</h1>
        <p className="mt-1 text-sm text-gray-600">Enter the order ID and the mobile number used at checkout.</p>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Field label="Order ID">
        <input name="code" required placeholder="MC…" className={`${inputCls} uppercase`} />
      </Field>
      <Field label="Mobile number">
        <input name="phone" type="tel" inputMode="tel" required placeholder="01XXXXXXXXX" className={inputCls} />
      </Field>
      <button
        disabled={pending}
        className="h-12 w-full rounded-xl bg-brand-600 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Looking up…" : "Track order"}
      </button>
    </form>
  );
}
