/** Class names for filter chips (usable from server and client components). */
export const chipCls = (active = false) =>
  `shrink-0 snap-start rounded-full px-4 py-2.5 text-sm font-semibold ${
    active ? "bg-night text-white" : "border border-line bg-white text-gray-900 hover:border-brand-600"
  }`;
