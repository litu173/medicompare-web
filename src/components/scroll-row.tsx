"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal chip row: swipe on touch, arrow buttons for mouse and keyboard users,
 * and the vertical mouse wheel scrolls it sideways.
 */
export function ScrollRow({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return; // let the page scroll once the row is at its end
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [update]);

  const scrollBy = (dir: number) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.7, behavior: "smooth" });

  const arrow =
    "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md hover:bg-gray-50";

  return (
    <div className="relative -mx-4" role="group" aria-label={label}>
      <div
        ref={ref}
        onScroll={update}
        className="no-scrollbar flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 py-0.5"
      >
        {children}
      </div>
      {edges.left && (
        <>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-ivory to-transparent" />
          <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)} className={`${arrow} left-1`}>
            <ChevronLeft className="size-4" />
          </button>
        </>
      )}
      {edges.right && (
        <>
          <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ivory to-transparent" />
          <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)} className={`${arrow} right-1`}>
            <ChevronRight className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
