"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileUp, Lock } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { useQuote } from "@/components/use-quote";
import { Field, GoogleButton, inputCls } from "@/components/auth-forms";
import { placeOrderAction } from "@/app/actions/checkout";
import { DIVISIONS, DELIVERY, PAYMENT_METHODS } from "@/lib/bd";
import { taka } from "@/lib/format";

type Address = {
  id: number;
  name: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  line: string;
  is_default: number;
};

export function CheckoutForm({
  user,
  addresses,
  googleEnabled,
}: {
  user: { name: string; email: string; phone: string | null } | null;
  addresses: Address[];
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const [state, action, pending] = useActionState(placeOrderAction, undefined);

  const initial = addresses.find((a) => a.is_default) ?? addresses[0];
  const [addrId, setAddrId] = useState<number | "new">(initial?.id ?? "new");
  const chosen = addresses.find((a) => a.id === addrId);
  const [division, setDivision] = useState(initial?.division ?? "Dhaka");
  const [district, setDistrict] = useState(initial?.district ?? "Dhaka");
  const [createAccount, setCreateAccount] = useState(false);
  const [rxName, setRxName] = useState<string | null>(null);
  const quote = useQuote(items, district);

  useEffect(() => {
    if (state?.code) {
      clear();
      router.replace(`/order/${state.code}?placed=1`);
    }
  }, [state, clear, router]);

  if (!ready) return <p className="pt-10 text-center text-sm text-gray-500">Loading…</p>;
  if (!items.length && !state?.code) {
    return (
      <div className="pt-16 text-center">
        <p className="font-semibold">Your cart is empty.</p>
        <Link href="/search" className="mt-4 inline-block text-brand-700 underline">
          Search medicines
        </Link>
      </div>
    );
  }

  const pickAddress = (id: number | "new") => {
    setAddrId(id);
    const a = addresses.find((x) => x.id === id);
    if (a) {
      setDivision(a.division);
      setDistrict(a.district);
    }
  };

  const fee = quote?.deliveryFee ?? (district === "Dhaka" ? DELIVERY.insideDhaka : DELIVERY.outsideDhaka);
  const subtotal = quote?.subtotal ?? items.reduce((s, i) => s + i.qty * i.price, 0);
  const sectionCls = "space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5";

  return (
    <form action={action} className="space-y-4 pb-28 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/cart" aria-label="Back to cart" className="-ml-1 rounded-lg p-1">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <input type="hidden" name="cart" value={JSON.stringify(items.map((i) => ({ packId: i.packId, qty: i.qty })))} />

      {!user && (
        <section className={sectionCls}>
          <p className="text-sm text-gray-700">
            <b>Checking out as a guest.</b> Have an account?{" "}
            <Link href="/login?next=/checkout" className="font-semibold text-brand-700">
              Sign in
            </Link>
          </p>
          {googleEnabled && <GoogleButton next="/checkout" />}
        </section>
      )}

      <section className={sectionCls}>
        <h2 className="font-semibold">Delivery address</h2>
        {addresses.length > 0 && (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex gap-3 rounded-xl border p-3 text-sm ${addrId === a.id ? "border-brand-600 bg-brand-50" : "border-gray-200"}`}
              >
                <input
                  type="radio"
                  name="addrPick"
                  checked={addrId === a.id}
                  onChange={() => pickAddress(a.id)}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <b>{a.name}</b> · {a.phone}
                  <br />
                  <span className="text-gray-600">
                    {a.line}, {a.area}, {a.district}
                  </span>
                </span>
              </label>
            ))}
            <label
              className={`flex gap-3 rounded-xl border p-3 text-sm ${addrId === "new" ? "border-brand-600 bg-brand-50" : "border-gray-200"}`}
            >
              <input
                type="radio"
                name="addrPick"
                checked={addrId === "new"}
                onChange={() => pickAddress("new")}
                className="accent-brand-600"
              />
              Deliver to a new address
            </label>
          </div>
        )}

        {/* Saved address fields are still submitted, just hidden. */}
        <div key={String(addrId)} className={chosen ? "hidden" : "space-y-3"}>
          <Field label="Recipient name">
            <input
              name="name"
              required
              autoComplete="name"
              defaultValue={chosen?.name ?? user?.name}
              className={inputCls}
            />
          </Field>
          <Field label="Mobile number">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              defaultValue={chosen?.phone ?? user?.phone ?? ""}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Division">
              <select
                name="division"
                value={division}
                onChange={(e) => {
                  setDivision(e.target.value);
                  setDistrict(DIVISIONS[e.target.value][0]);
                }}
                className={inputCls}
              >
                {Object.keys(DIVISIONS).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="District">
              <select
                name="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={inputCls}
              >
                {DIVISIONS[division].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Area / Thana">
            <input name="area" required placeholder="e.g. Dhanmondi" defaultValue={chosen?.area} className={inputCls} />
          </Field>
          <Field label="Address">
            <input
              name="line"
              required
              autoComplete="street-address"
              placeholder="House, road, flat"
              defaultValue={chosen?.line}
              className={inputCls}
            />
          </Field>
          {user && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="saveAddress" defaultChecked className="size-4 accent-brand-600" /> Save this
              address
            </label>
          )}
        </div>
        <Field label="Delivery note (optional)">
          <input name="note" placeholder="Landmark, preferred time…" className={inputCls} />
        </Field>
      </section>

      {!user && (
        <section className={sectionCls}>
          <Field label="Email (optional)" hint="We'll send your order confirmation here">
            <input name="email" type="email" autoComplete="email" required={createAccount} className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              name="createAccount"
              checked={createAccount}
              onChange={(e) => setCreateAccount(e.target.checked)}
              className="size-4 accent-brand-600"
            />
            Create an account for faster checkout next time
          </label>
          {createAccount && (
            <Field label="Password" hint="At least 8 characters">
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className={inputCls}
              />
            </Field>
          )}
        </section>
      )}

      <section className={sectionCls}>
        <h2 className="font-semibold">Prescription</h2>
        <p className="text-xs text-gray-500">
          Required for prescription-only medicines (antibiotics, etc.). JPG, PNG or PDF up to 5 MB.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-700 hover:bg-gray-50">
          <FileUp className="size-5 text-brand-600" />
          <span className="min-w-0 flex-1 truncate">{rxName ?? "Upload prescription (optional)"}</span>
          <input
            type="file"
            name="prescription"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => setRxName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </section>

      <section className={sectionCls}>
        <h2 className="font-semibold">Payment</h2>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${p.enabled ? "border-gray-200 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50" : "border-gray-100 text-gray-400"}`}
            >
              <input
                type="radio"
                name="payment"
                value={p.id}
                defaultChecked={p.id === "cod"}
                disabled={!p.enabled}
                className="accent-brand-600"
              />
              <span className="flex-1 font-medium">{p.label}</span>
              <span className="text-xs">{p.note}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <h2 className="font-semibold">Order summary</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => {
            const q = quote?.items.find((x) => x.packId === i.packId);
            return (
              <li key={i.packId} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {i.brandName} <span className="text-gray-500">× {i.qty}</span>
                  <span className="block truncate text-xs text-gray-500">{i.packLabel}</span>
                  {q && !q.available && <span className="block text-xs text-red-600">Only {q.maxQty} in stock</span>}
                </span>
                <span className="tabular-nums">{taka((q?.price ?? i.price) * i.qty)}</span>
              </li>
            );
          })}
        </ul>
        <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="tabular-nums">{taka(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery ({district === "Dhaka" ? "inside Dhaka" : "outside Dhaka"})</span>
            <span className="tabular-nums">{fee === 0 ? "Free" : taka(fee)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{taka(subtotal + fee)}</span>
          </div>
        </div>
      </section>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white p-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-3xl">
          {state?.error && (
            <p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <button
            disabled={pending || (quote ? !quote.allAvailable : false)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white disabled:opacity-60"
          >
            <Lock className="size-4" />
            {pending ? "Placing order…" : `Place order · ${taka(subtotal + fee)}`}
          </button>
        </div>
      </div>
    </form>
  );
}
