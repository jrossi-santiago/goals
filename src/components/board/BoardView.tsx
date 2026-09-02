"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { CalendarView } from "@/components/board/CalendarView";
import { TaskModal } from "@/components/board/TaskModal";
import { EventModal } from "@/components/board/EventModal";
import { sortOrderBetween } from "@/lib/sortOrder";
import type { Task, CalendarEvent, KanbanColumn, ItemType } from "@/types/database";

type View = "kanban" | "calendar";

export function BoardView({
  initialTasks,
  initialEvents,
  initialView = "kanban",
}: {
  initialTasks: Task[];
  initialEvents: CalendarEvent[];
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null | "new">(null);
  const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined);
  const supabase = useMemo(() => createClient(), []);

  // ---- Tasks ----

  async function quickAdd(column: KanbanColumn, title: string) {
    const columnTasks = tasks.filter((t) => t.column === column);
    const maxOrder = columnTasks.reduce((m, t) => Math.max(m, t.sort_order), 0);
    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      user_id: "",
      title,
      notes: null,
      type: "personal",
      column,
      sort_order: sortOrderBetween(maxOrder || undefined, undefined),
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks((t) => [...t, optimistic]);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        type: "personal",
        column,
        sort_order: optimistic.sort_order,
      })
      .select()
      .single();

    if (error || !data) {
      setTasks((t) => t.filter((x) => x.id !== optimistic.id));
      return;
    }
    setTasks((t) => t.map((x) => (x.id === optimistic.id ? (data as Task) : x)));
  }

  function moveTask(taskId: string, column: KanbanColumn, index: number) {
    setTasks((prev) => {
      const target = prev.find((t) => t.id === taskId);
      if (!target) return prev;
      const columnTasks = prev
        .filter((t) => t.column === column && t.id !== taskId)
        .sort((a, b) => a.sort_order - b.sort_order);

      const prevTask = columnTasks[index - 1];
      const nextTask = columnTasks[index];
      const newOrder = sortOrderBetween(prevTask?.sort_order, nextTask?.sort_order);

      supabase.from("tasks").update({ column, sort_order: newOrder }).eq("id", taskId).then();

      return prev.map((t) => (t.id === taskId ? { ...t, column, sort_order: newOrder } : t));
    });
  }

  async function saveTask(input: Partial<Task>) {
    if (!editingTask) return;
    const id = editingTask.id;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, ...input } : x)));
    setEditingTask(null);
    await supabase.from("tasks").update(input).eq("id", id);
  }

  async function deleteTask(id: string) {
    setTasks((t) => t.filter((x) => x.id !== id));
    setEditingTask(null);
    await supabase.from("tasks").delete().eq("id", id);
  }

  async function changeTaskDate(taskId: string, dateStr: string) {
    setTasks((t) => t.map((x) => (x.id === taskId ? { ...x, due_date: dateStr } : x)));
    await supabase.from("tasks").update({ due_date: dateStr }).eq("id", taskId);
  }

  // ---- Events ----

  async function saveEvent(input: {
    title: string;
    notes: string | null;
    type: ItemType;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
  }) {
    if (editingEvent === "new") {
      const optimistic: CalendarEvent = {
        id: `temp-${Date.now()}`,
        user_id: "",
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setEvents((e) => [...e, optimistic]);
      setEditingEvent(null);
      const { data, error } = await supabase.from("events").insert(input).select().single();
      if (error || !data) {
        setEvents((e) => e.filter((x) => x.id !== optimistic.id));
        return;
      }
      setEvents((e) => e.map((x) => (x.id === optimistic.id ? (data as CalendarEvent) : x)));
      return;
    }

    if (editingEvent) {
      const id = editingEvent.id;
      setEvents((e) => e.map((x) => (x.id === id ? { ...x, ...input } : x)));
      setEditingEvent(null);
      await supabase.from("events").update(input).eq("id", id);
    }
  }

  async function deleteEvent(id: string) {
    setEvents((e) => e.filter((x) => x.id !== id));
    setEditingEvent(null);
    await supabase.from("events").delete().eq("id", id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Plan the week, then see it on the calendar.</p>
        <div className="flex rounded-full border border-line p-0.5 text-sm">
          {(["kanban", "calendar"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 capitalize transition ${
                view === v ? "bg-ink text-paper" : "text-ink-soft"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          onOpenTask={(t) => setEditingTask(t)}
          onQuickAdd={quickAdd}
          onMoveTask={moveTask}
        />
      ) : (
        <CalendarView
          tasks={tasks}
          events={events}
          onOpenTask={(t) => setEditingTask(t)}
          onOpenEvent={(e) => setEditingEvent(e)}
          onAddEvent={(dateStr) => {
            setNewEventDate(dateStr);
            setEditingEvent("new");
          }}
          onTaskDateChange={changeTaskDate}
        />
      )}

      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      {editingEvent && (
        <EventModal
          event={editingEvent === "new" ? null : editingEvent}
          defaultDate={newEventDate}
          onClose={() => setEditingEvent(null)}
          onSave={saveEvent}
          onDelete={deleteEvent}
        />
      )}
    </div>
  );
}
