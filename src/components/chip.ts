/** Class names for filter chips (usable from server and client components). */
export const chipCls = (active = false) =>
  `shrink-0 snap-start rounded-full px-3.5 py-2 text-sm font-medium ${
    active ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-800 hover:border-brand-600"
  }`;
