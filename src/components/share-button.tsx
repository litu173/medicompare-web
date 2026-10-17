"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

const LANDING = "https://litu173.github.io/sashroy/";

/** Native share sheet on phones; copies the text and link elsewhere. */
export function ShareButton({
  text,
  label = "Share",
  variant = "light",
}: {
  text: string;
  label?: string;
  variant?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const full = `${text} ${LANDING}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url: LANDING, title: "Sashroy" });
        return;
      }
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* dismissed */
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className={
        variant === "dark"
          ? "inline-flex h-12 items-center gap-2 rounded-2xl bg-night px-5 font-bold text-white hover:bg-night-2"
          : "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
      }
    >
      <Share2 className="size-4" /> {copied ? "Link copied" : label}
    </button>
  );
}
