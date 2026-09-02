import type { ItemType } from "@/types/database";

export function TypeBadge({ type }: { type: ItemType }) {
  const isBusiness = type === "business";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        isBusiness ? "bg-business-soft text-business" : "bg-personal-soft text-personal"
      }`}
    >
      {isBusiness ? "Business" : "Personal"}
    </span>
  );
}
