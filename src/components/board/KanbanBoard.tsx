"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { KANBAN_COLUMNS } from "@/types/database";
import type { Task, KanbanColumn } from "@/types/database";
import { TypeBadge } from "@/components/ui/TypeBadge";

export function KanbanBoard({
  tasks,
  onOpenTask,
  onQuickAdd,
  onMoveTask,
}: {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onQuickAdd: (column: KanbanColumn, title: string) => void;
  onMoveTask: (taskId: string, column: KanbanColumn, index: number) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byColumn: Record<KanbanColumn, Task[]> = {
    backlog: [],
    this_week: [],
    doing: [],
    waiting: [],
    done: [],
  };
  for (const t of tasks) byColumn[t.column].push(t);
  for (const col of Object.keys(byColumn) as KanbanColumn[]) {
    byColumn[col].sort((a, b) => a.sort_order - b.sort_order);
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // over.id is either a task id or a column id (when dropping on empty column area)
    const overTask = tasks.find((t) => t.id === over.id);
    const overColumn = (over.data.current?.column as KanbanColumn | undefined) ?? overTask?.column;
    if (!overColumn) return;

    const columnTasks = byColumn[overColumn].filter((t) => t.id !== activeTask.id);
    let index = overTask ? columnTasks.findIndex((t) => t.id === overTask.id) : columnTasks.length;
    if (index === -1) index = columnTasks.length;

    onMoveTask(activeTask.id, overColumn, index);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {KANBAN_COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={byColumn[col.id]}
            onOpenTask={onOpenTask}
            onQuickAdd={(title) => onQuickAdd(col.id, title)}
          />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} dragging />}</DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  label,
  tasks,
  onOpenTask,
  onQuickAdd,
}: {
  id: KanbanColumn;
  label: string;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onQuickAdd: (title: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id, data: { column: id } });
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setAdding(false);
      return;
    }
    onQuickAdd(value.trim());
    setValue("");
    setAdding(false);
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-black/[0.02] p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-ink-soft">{label}</h3>
        <span className="text-xs text-ink-soft/70">{tasks.length}</span>
      </div>

      <div ref={setNodeRef} className="flex min-h-[40px] flex-1 flex-col gap-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onOpenTask(task)} />
          ))}
        </SortableContext>
      </div>

      {adding ? (
        <form onSubmit={submitAdd} className="mt-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={submitAdd}
            placeholder="Task title…"
            className="w-full rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 text-sm outline-none focus:border-ink"
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-soft hover:bg-paper-raised hover:text-ink"
        >
          + Add task
        </button>
      )}
    </div>
  );
}

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

function TaskCard({
  task,
  onClick,
  dragging,
}: {
  task: Task;
  onClick?: () => void;
  dragging?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`card w-full cursor-grab p-3 text-left active:cursor-grabbing ${dragging ? "rotate-1 shadow-lg" : ""}`}
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {task.notes && <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{task.notes}</p>}
      <div className="mt-2 flex items-center gap-2">
        <TypeBadge type={task.type} />
        {task.due_date && (
          <span className="text-[11px] text-ink-soft">
            {new Date(task.due_date + "T00:00:00").toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </button>
  );
}
