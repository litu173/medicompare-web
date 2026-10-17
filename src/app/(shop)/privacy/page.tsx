import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL_UPDATED, PRIVACY } from "@/content/legal";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" bn="গোপনীয়তা নীতি" updated={LEGAL_UPDATED} sections={PRIVACY} />;
}
