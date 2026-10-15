import type { Generic } from "@/lib/catalog";

const SECTIONS: [keyof Generic, string][] = [
  ["indication_desc", "Indications"],
  ["dosage", "Dosage"],
  ["administration", "How to take"],
  ["side_effects", "Side effects"],
  ["precautions", "Precautions & warnings"],
  ["contraindications", "Contraindications"],
  ["pregnancy", "Pregnancy & breastfeeding"],
  ["interaction", "Interactions"],
  ["pediatric", "Use in children"],
  ["overdose", "Overdose"],
  ["pharmacology", "Pharmacology"],
  ["storage", "Storage"],
];

/** Collapsible drug information for a generic, using native <details> (no JS). */
export function Monograph({ generic }: { generic: Generic }) {
  const sections = SECTIONS.filter(([k]) => generic[k]);
  if (!sections.length) return null;
  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      {sections.map(([key, title], i) => (
        <details key={key} open={i === 0} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {title}
            <span className="text-gray-400 transition group-open:rotate-45">+</span>
          </summary>
          <div className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-gray-700">
            {String(generic[key])}
          </div>
        </details>
      ))}
      <p className="bg-gray-50 px-4 py-3 text-[11px] text-gray-500">
        Source: open MedEx-derived dataset. For reference only — follow your doctor&apos;s prescription.
      </p>
    </div>
  );
}
