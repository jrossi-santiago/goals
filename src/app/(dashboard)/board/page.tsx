import { createClient } from "@/lib/supabase/server";
import { BoardView } from "@/components/board/BoardView";
import type { Task, CalendarEvent } from "@/types/database";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();
  const { view } = await searchParams;

  const [{ data: tasks }, { data: events }] = await Promise.all([
    supabase.from("tasks").select("*").order("sort_order", { ascending: true }),
    supabase.from("events").select("*").order("start_at", { ascending: true }),
  ]);

  return (
    <BoardView
      initialTasks={(tasks as Task[]) ?? []}
      initialEvents={(events as CalendarEvent[]) ?? []}
      initialView={view === "calendar" ? "calendar" : "kanban"}
    />
  );
}
