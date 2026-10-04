"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";
import type { KitchenBoardUnit } from "@/lib/api";

type Props = {
  units: KitchenBoardUnit[];
  renderCard: (unit: KitchenBoardUnit) => ReactNode;
  empty: ReactNode;
  className?: string;
};

/** Windowed list: only visible cards are mounted, so a 400-order day stays smooth. */
export function VirtualColumn({ units, renderCard, empty, className }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions; the compiler skips this component.
  const virtualizer = useVirtualizer({
    count: units.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 6,
    getItemKey: (index) => units[index].id,
  });

  if (units.length === 0) return <div className={className}>{empty}</div>;
  return (
    <div ref={parentRef} className={className} style={{ overflowY: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
            className="pb-3"
          >
            {renderCard(units[item.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
