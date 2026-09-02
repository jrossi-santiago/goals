import { createClient } from "@/lib/supabase/server";
import { HomeView } from "@/components/home/HomeView";
import type { Goal, Task, CalendarEvent, VisionItem } from "@/types/database";
import { addDays, format } from "date-fns";

export default async function HomePage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAhead = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const weekAheadIso = addDays(new Date(), 7).toISOString();

  const [
    { data: visionImages },
    { data: goals },
    { data: weekTasks },
    { data: upcomingTasks },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase
      .from("vision_items")
      .select("*")
      .eq("type", "image")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("goals")
      .select("*")
      .eq("status", "active")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("*")
      .eq("column", "this_week")
      .order("sort_order", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .gte("due_date", today)
      .lte("due_date", weekAhead)
      .order("due_date", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .gte("start_at", new Date().toISOString())
      .lte("start_at", weekAheadIso)
      .order("start_at", { ascending: true }),
  ]);

  const imagesWithUrls = ((visionImages as VisionItem[]) ?? []).map((item) => {
    const { data } = supabase.storage.from("vision-images").getPublicUrl(item.image_path ?? "");
    return { ...item, imageUrl: data.publicUrl };
  });

  return (
    <HomeView
      visionImages={imagesWithUrls}
      goals={(goals as Goal[]) ?? []}
      weekTasks={(weekTasks as Task[]) ?? []}
      upcomingTasks={(upcomingTasks as Task[]) ?? []}
      upcomingEvents={(upcomingEvents as CalendarEvent[]) ?? []}
    />
  );
}
