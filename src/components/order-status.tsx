import { Check, X } from "lucide-react";
import { STATUS_INFO } from "@/lib/bd";

const STEPS = ["placed", "confirmed", "packed", "shipped", "delivered"];

export function fmtTime(sqlite: string) {
  return new Date(sqlite.replace(" ", "T") + "Z").toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "delivered"
      ? "bg-brand-100 text-brand-700"
      : status === "cancelled"
        ? "bg-red-100 text-red-800"
        : status === "shipped"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-900";
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {STATUS_INFO[status]?.label ?? status}
    </span>
  );
}

/** Vertical tracker: each step shows when it happened; the current step is highlighted. */
export function StatusTracker({
  status,
  events,
}: {
  status: string;
  events: { status: string; note: string | null; created_at: string }[];
}) {
  const at = new Map(events.map((e) => [e.status, e]));
  if (status === "cancelled") {
    const e = at.get("cancelled");
    return (
      <div className="flex gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-900">
        <X className="size-5 shrink-0" />
        <div>
          <p className="font-semibold">Order cancelled{e ? ` · ${fmtTime(e.created_at)}` : ""}</p>
          {e?.note && <p>Reason: {e.note}</p>}
        </div>
      </div>
    );
  }
  const idx = STEPS.indexOf(status);
  return (
    <ol className="relative">
      {STEPS.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        const e = at.get(s);
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${i < idx ? "bg-brand-600" : "bg-gray-200"}`}
              />
            )}
            <span
              className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-full ${
                done ? "bg-brand-600 text-white" : "border-2 border-gray-300 bg-white"
              } ${current ? "ring-4 ring-brand-100" : ""}`}
            >
              {done && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <div className="-mt-0.5 min-w-0">
              <p className={`text-sm ${done ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                {STATUS_INFO[s].label}
                {e && <span className="ml-2 font-normal text-gray-600">{fmtTime(e.created_at)}</span>}
              </p>
              {current && <p className="text-sm text-gray-700">{STATUS_INFO[s].detail}</p>}
              {e?.note && <p className="text-sm text-gray-700">{e.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
