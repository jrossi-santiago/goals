"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { KANBAN_COLUMNS } from "@/types/database";
import type { Task, ItemType, KanbanColumn } from "@/types/database";

export function TaskModal({
  task,
  defaultColumn,
  onClose,
  onSave,
  onDelete,
}: {
  task?: Task | null;
  defaultColumn?: KanbanColumn;
  onClose: () => void;
  onSave: (input: Partial<Task>) => void;
  onDelete?: (id: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [type, setType] = useState<ItemType>(task?.type ?? "personal");
  const [column, setColumn] = useState<KanbanColumn>(task?.column ?? defaultColumn ?? "backlog");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    onSave({
      title: title.trim(),
      notes: notes.trim() || null,
      type,
      column,
      due_date: dueDate || null,
    });
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-medium">{task ? "Edit task" : "New task"}</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="Book physio appointment"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="Optional detail…"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Column</label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value as KanbanColumn)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {KANBAN_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">
            Due date <span className="text-ink-soft/70">(shows on Calendar)</span>
          </label>
          <input
            type="date"
            value={dueDate ?? ""}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <div>
            {task && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="text-xs text-red-600 underline underline-offset-2"
              >
                Delete task
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
