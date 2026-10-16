import { getSettings } from "@/lib/settings";
import { ActionForm, adminInput } from "@/components/admin/action-form";
import { updateSettings } from "@/app/actions/admin";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  const s = getSettings();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Store settings</h1>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <ActionForm action={updateSettings} submit="Save settings">
          <h2 className="font-semibold">Delivery charges (৳)</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium">
              Inside Dhaka
              <input
                name="deliveryInsideDhaka"
                type="number"
                min={0}
                defaultValue={s.deliveryInsideDhaka}
                className={`${adminInput} mt-1`}
              />
            </label>
            <label className="block text-sm font-medium">
              Outside Dhaka
              <input
                name="deliveryOutsideDhaka"
                type="number"
                min={0}
                defaultValue={s.deliveryOutsideDhaka}
                className={`${adminInput} mt-1`}
              />
            </label>
            <label className="block text-sm font-medium">
              Free over
              <input
                name="freeDeliveryOver"
                type="number"
                min={0}
                defaultValue={s.freeDeliveryOver}
                className={`${adminInput} mt-1`}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Customer help line (printed on packing slips)
            <input
              name="supportPhone"
              type="tel"
              defaultValue={s.supportPhone}
              className={`${adminInput} mt-1`}
              placeholder="01XXXXXXXXX"
            />
          </label>
        </ActionForm>
      </section>
      <section className="rounded-2xl bg-white p-4 text-sm text-gray-800 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-1 font-semibold">Admin access</h2>
        <p>
          Admins are the emails listed in <code className="rounded bg-gray-100 px-1">ADMIN_EMAILS</code> in the
          server&apos;s <code className="rounded bg-gray-100 px-1">.env.local</code>. Create an admin login with{" "}
          <code className="rounded bg-gray-100 px-1">npm run db:admin</code>.
        </p>
      </section>
    </div>
  );
}
