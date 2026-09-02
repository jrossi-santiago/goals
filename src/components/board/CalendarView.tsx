"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import type { Task, CalendarEvent } from "@/types/database";

type CalItem =
  | { kind: "task"; id: string; title: string; date: Date; task: Task }
  | { kind: "event"; id: string; title: string; date: Date; allDay: boolean; event: CalendarEvent };

export function CalendarView({
  tasks,
  events,
  onOpenTask,
  onOpenEvent,
  onAddEvent,
  onTaskDateChange,
}: {
  tasks: Task[];
  events: CalendarEvent[];
  onOpenTask: (task: Task) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onAddEvent: (dateStr: string) => void;
  onTaskDateChange: (taskId: string, dateStr: string) => void;
}) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date());

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date;
      const arr = map.get(key) ?? [];
      arr.push({ kind: "task", id: t.id, title: t.title, date: parseISO(t.due_date), task: t });
      map.set(key, arr);
    }
    for (const e of events) {
      const d = new Date(e.start_at);
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push({ kind: "event", id: e.id, title: e.title, date: d, allDay: e.all_day, event: e });
      map.set(key, arr);
    }
    return map;
  }, [tasks, events]);

  function itemsFor(day: Date) {
    return (itemsByDay.get(format(day, "yyyy-MM-dd")) ?? []).sort((a, b) => {
      if (a.kind === "event" && !a.allDay && b.kind === "event" && !b.allDay) {
        return a.date.getTime() - b.date.getTime();
      }
      return a.kind === "event" && a.allDay ? -1 : 1;
    });
  }

  function handleDropOnDay(day: Date, e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/task-id");
    if (taskId) onTaskDateChange(taskId, format(day, "yyyy-MM-dd"));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((c) => (mode === "month" ? subMonths(c, 1) : subWeeks(c, 1)))}
            className="rounded-full border border-line px-2.5 py-1 text-sm hover:bg-black/5"
          >
            ←
          </button>
          <h2 className="w-40 text-center text-sm font-medium">
            {mode === "month" ? format(cursor, "MMMM yyyy") : `Week of ${format(startOfWeek(cursor), "MMM d")}`}
          </h2>
          <button
            onClick={() => setCursor((c) => (mode === "month" ? addMonths(c, 1) : addWeeks(c, 1)))}
            className="rounded-full border border-line px-2.5 py-1 text-sm hover:bg-black/5"
          >
            →
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="ml-1 rounded-full px-2.5 py-1 text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Today
          </button>
        </div>
        <div className="flex rounded-full border border-line p-0.5 text-sm">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 capitalize ${mode === m ? "bg-ink text-paper" : "text-ink-soft"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid
          cursor={cursor}
          itemsFor={itemsFor}
          onAddEvent={onAddEvent}
          onOpenTask={onOpenTask}
          onOpenEvent={onOpenEvent}
          onDropOnDay={handleDropOnDay}
        />
      ) : (
        <WeekRow
          cursor={cursor}
          itemsFor={itemsFor}
          onAddEvent={onAddEvent}
          onOpenTask={onOpenTask}
          onOpenEvent={onOpenEvent}
          onDropOnDay={handleDropOnDay}
        />
      )}
    </div>
  );
}

function MonthGrid({
  cursor,
  itemsFor,
  onAddEvent,
  onOpenTask,
  onOpenEvent,
  onDropOnDay,
}: {
  cursor: Date;
  itemsFor: (d: Date) => CalItem[];
  onAddEvent: (dateStr: string) => void;
  onOpenTask: (t: Task) => void;
  onOpenEvent: (e: CalendarEvent) => void;
  onDropOnDay: (d: Date, e: React.DragEvent) => void;
}) {
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div key={d} className="bg-paper-raised px-2 py-1.5 text-center text-[11px] font-medium text-ink-soft">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const items = itemsFor(day);
        const inMonth = isSameMonth(day, cursor);
        const isToday = isSameDay(day, today);
        return (
          <div
            key={day.toISOString()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropOnDay(day, e)}
            onClick={() => onAddEvent(format(day, "yyyy-MM-dd"))}
            className={`min-h-24 cursor-pointer bg-paper-raised p-1.5 transition hover:bg-black/5/40 sm:min-h-28 ${
              inMonth ? "" : "opacity-40"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                isToday ? "bg-ink text-paper" : "text-ink-soft"
              }`}
            >
              {format(day, "d")}
            </span>
            <div className="mt-1 flex flex-col gap-1">
              {items.slice(0, 3).map((item) => (
                <ItemPill key={`${item.kind}-${item.id}`} item={item} onOpenTask={onOpenTask} onOpenEvent={onOpenEvent} />
              ))}
              {items.length > 3 && (
                <span className="px-1 text-[10px] text-ink-soft">+{items.length - 3} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekRow({
  cursor,
  itemsFor,
  onAddEvent,
  onOpenTask,
  onOpenEvent,
  onDropOnDay,
}: {
  cursor: Date;
  itemsFor: (d: Date) => CalItem[];
  onAddEvent: (dateStr: string) => void;
  onOpenTask: (t: Task) => void;
  onOpenEvent: (e: CalendarEvent) => void;
  onDropOnDay: (d: Date, e: React.DragEvent) => void;
}) {
  const start = startOfWeek(cursor);
  const days = eachDayOfInterval({ start, end: addDays(start, 6) });
  const today = new Date();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const items = itemsFor(day);
        const isToday = isSameDay(day, today);
        return (
          <div
            key={day.toISOString()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropOnDay(day, e)}
            className="card min-h-32 p-2"
          >
            <button
              onClick={() => onAddEvent(format(day, "yyyy-MM-dd"))}
              className="mb-1.5 flex w-full items-center justify-between text-left"
            >
              <span className="text-xs font-medium text-ink-soft">{format(day, "EEE")}</span>
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-ink text-paper" : "text-ink-soft"
                }`}
              >
                {format(day, "d")}
              </span>
            </button>
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <ItemPill key={`${item.kind}-${item.id}`} item={item} onOpenTask={onOpenTask} onOpenEvent={onOpenEvent} />
              ))}
              {items.length === 0 && <p className="px-1 text-[11px] text-ink-soft/60">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemPill({
  item,
  onOpenTask,
  onOpenEvent,
}: {
  item: CalItem;
  onOpenTask: (t: Task) => void;
  onOpenEvent: (e: CalendarEvent) => void;
}) {
  const type = item.kind === "task" ? item.task.type : item.event.type;
  const draggable = item.kind === "task";

  return (
    <button
      draggable={draggable}
      onDragStart={(e) => {
        if (item.kind === "task") e.dataTransfer.setData("text/task-id", item.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (item.kind === "task") onOpenTask(item.task);
        else onOpenEvent(item.event);
      }}
      className={`truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ${
        type === "business" ? "bg-ink text-paper" : "border border-ink/30 text-ink-soft"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      title={item.title}
    >
      {item.kind === "event" && !item.allDay && (
        <span className="mr-1 opacity-70">{format(item.date, "HH:mm")}</span>
      )}
      {item.title}
    </button>
  );
}
