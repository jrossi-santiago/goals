/** Computes a sort_order value that places an item between its neighbors (Trello-style fractional ordering). */
export function sortOrderBetween(prev: number | undefined, next: number | undefined): number {
  if (prev === undefined && next === undefined) return 1024;
  if (prev === undefined) return (next as number) - 1024;
  if (next === undefined) return prev + 1024;
  return (prev + next) / 2;
}
