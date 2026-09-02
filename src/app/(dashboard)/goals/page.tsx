import { createClient } from "@/lib/supabase/server";
import { GoalsView } from "@/components/goals/GoalsView";
import type { Goal } from "@/types/database";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return <GoalsView initialGoals={(data as Goal[]) ?? []} />;
}
