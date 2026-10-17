import { createElement } from "react";
import { Droplet, Droplets, FlaskRound, Package, Pill, SprayCan, Syringe, Tablets, Wind } from "lucide-react";

function iconFor(form: string): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  const f = form.toLowerCase();
  if (f.includes("capsule")) return Pill;
  if (f.includes("tablet")) return Tablets;
  if (/(injection|infusion|syringe)/.test(f)) return Syringe;
  if (/(drop|ophthalmic|ear )/.test(f)) return Droplet;
  if (/(inhaler|inhalation|nebuli|respirator)/.test(f)) return Wind;
  if (/spray/.test(f)) return SprayCan;
  if (/(cream|ointment|gel|lotion|paste|shampoo)/.test(f)) return Droplets;
  if (/(syrup|suspension|solution|liquid|emulsion|mouthwash)/.test(f)) return FlaskRound;
  return Package;
}

const SIZES = { sm: "size-12", md: "size-16", lg: "size-28 sm:size-36" } as const;

/**
 * The product's own uploaded pack photo. Without one, a neutral dosage-form icon is shown instead of
 * a stock image, so customers are never shown a picture of a different product.
 */
export function MedicineThumb({
  image,
  form,
  alt,
  size = "sm",
}: {
  image: string | null | undefined;
  form: string | null | undefined;
  alt: string;
  size?: keyof typeof SIZES;
}) {
  const box = `${SIZES[size]} shrink-0 overflow-hidden ${size === "lg" ? "rounded-[26px]" : "rounded-2xl"} bg-white`;
  if (image) {
    return (
      <span className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our own media route */}
        <img src={image} alt={alt} loading="lazy" className="size-full object-contain" />
      </span>
    );
  }
  return (
    <span
      className={`${box} grid place-items-center bg-gradient-to-br from-brand-50 to-[#f4efe3]`}
      role="img"
      aria-label={`${alt} (no photo yet)`}
    >
      {createElement(iconFor(form ?? ""), {
        className: size === "lg" ? "size-11 text-brand-600" : "size-6 text-brand-600",
        strokeWidth: 1.5,
      })}
    </span>
  );
}
