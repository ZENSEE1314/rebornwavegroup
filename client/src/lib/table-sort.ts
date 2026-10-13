// Click a column title to sort a table: first click ascending, second descending, third back to the normal order.
export type SortState = { key: string; direction: 1 | -1 } | null;
type Value = string | number | boolean | null | undefined;

export function nextSort(current: SortState, key: string): SortState {
  if (!current || current.key !== key) return { key, direction: 1 };
  return current.direction === 1 ? { key, direction: -1 } : null;
}

const isEmpty = (value: Value) => value === null || value === undefined || value === "";

/** Sorts a copy of the rows. Numbers sort as numbers, text without caring about case and with 2 before 10; empty cells always go last. */
export function sortRows<T>(rows: T[], sort: SortState, valueOf: (row: T, key: string) => Value): T[] {
  if (!sort) return rows;
  const { key, direction } = sort;
  return [...rows].sort((a, b) => {
    const left = valueOf(a, key);
    const right = valueOf(b, key);
    if (isEmpty(left) || isEmpty(right)) return Number(isEmpty(left)) - Number(isEmpty(right));
    if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
    if (typeof left === "boolean" || typeof right === "boolean") return (Number(left) - Number(right)) * direction;
    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) * direction;
  });
}

/** A search box: every word must appear somewhere in the row's text. */
export function matchesSearch(text: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = text.toLowerCase();
  return words.every((word) => haystack.includes(word));
}
