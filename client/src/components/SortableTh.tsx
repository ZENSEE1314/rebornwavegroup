import type { ReactNode } from "react";
import { nextSort, type SortState } from "@/lib/table-sort";

interface Props { sortKey: string; sort: SortState; onSort: (next: SortState) => void; className: string; children: ReactNode }

// A column title you can click to sort by it (▲ ascending, ▼ descending).
export default function SortableTh({ sortKey, sort, onSort, className, children }: Props) {
  const isActive = sort?.key === sortKey;
  const alignRight = className.includes("text-right");
  const alignCenter = className.includes("text-center");
  return (
    <th className={className} aria-sort={isActive ? (sort!.direction === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(nextSort(sort, sortKey))} className={`inline-flex w-full items-center gap-1 p-0 uppercase tracking-wide font-semibold hover:text-amber-300 ${alignRight ? "justify-end" : alignCenter ? "justify-center" : ""} ${isActive ? "text-amber-300" : ""}`}>
        <span>{children}</span><span aria-hidden="true" className="text-[9px]">{isActive ? (sort!.direction === 1 ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}
