import { Check } from "lucide-react";

const STEPS = ["placed", "confirmed", "packed", "shipped", "delivered"];

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "delivered"
      ? "bg-brand-100 text-brand-700"
      : status === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}

export function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") return <p className="text-sm font-medium text-red-600">This order was cancelled.</p>;
  const idx = STEPS.indexOf(status);
  return (
    <ol className="flex items-start">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : i <= idx ? "bg-brand-600" : "bg-gray-200"}`} />
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full ${i <= idx ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-400"}`}
            >
              <Check className="size-3.5" />
            </span>
            <span
              className={`h-0.5 flex-1 ${i === STEPS.length - 1 ? "invisible" : i < idx ? "bg-brand-600" : "bg-gray-200"}`}
            />
          </div>
          <span className={`mt-1 text-[11px] capitalize ${i <= idx ? "font-medium text-gray-900" : "text-gray-400"}`}>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}
