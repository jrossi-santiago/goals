export type GoalStatus = "active" | "paused" | "done";
export type ItemType = "personal" | "business";
export type KanbanColumn = "backlog" | "this_week" | "doing" | "waiting" | "done";
export type VisionItemType = "image" | "text" | "note";

export interface Profile {
  id: string;
  email: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  status: GoalStatus;
  target_date: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  type: ItemType;
  column: KanbanColumn;
  sort_order: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  type: ItemType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisionItem {
  id: string;
  user_id: string;
  type: VisionItemType;
  content: string | null;
  image_path: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export const KANBAN_COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "this_week", label: "This week" },
  { id: "doing", label: "Doing" },
  { id: "waiting", label: "Waiting" },
  { id: "done", label: "Done" },
];
