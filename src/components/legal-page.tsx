import type { LegalSection } from "@/content/legal";

export function LegalPage({
  title,
  bn,
  updated,
  sections,
}: {
  title: string;
  bn: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <article className="space-y-5 pt-6">
      <header>
        <p lang="bn" className="font-bangla text-gold-deep">
          {bn}
        </p>
        <h1 className="font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">Last updated {updated}</p>
      </header>
      {sections.map((s, i) => (
        <section key={s.title} className="rounded-[22px] bg-white p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold">
            <span className="mr-2 text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
            {s.title}
          </h2>
          <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-gray-700">
            {s.body.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
