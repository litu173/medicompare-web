import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL_UPDATED, TERMS } from "@/content/legal";

export const metadata: Metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return <LegalPage title="Terms & conditions" bn="শর্তাবলী" updated={LEGAL_UPDATED} sections={TERMS} />;
}
