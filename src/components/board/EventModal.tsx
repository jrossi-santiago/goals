"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { CalendarEvent, ItemType } from "@/types/database";

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return d.toTimeString().slice(0, 5);
}

export function EventModal({
  event,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}: {
  event?: CalendarEvent | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (input: {
    title: string;
    notes: string | null;
    type: ItemType;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
  }) => void;
  onDelete?: (id: string) => void;
}) {
  const initialDate = event ? toDateInput(event.start_at) : (defaultDate ?? toDateInput(new Date().toISOString()));
  const [title, setTitle] = useState(event?.title ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [type, setType] = useState<ItemType>(event?.type ?? "personal");
  const [date, setDate] = useState(initialDate);
  const [allDay, setAllDay] = useState(event?.all_day ?? true);
  const [startTime, setStartTime] = useState(event && !event.all_day ? toTimeInput(event.start_at) : "09:00");
  const [endTime, setEndTime] = useState(
    event?.end_at && !event.all_day ? toTimeInput(event.end_at) : "10:00"
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!date) {
      setError("Date is required.");
      return;
    }
    const start_at = allDay ? new Date(`${date}T00:00:00`).toISOString() : new Date(`${date}T${startTime}`).toISOString();
    const end_at = allDay ? null : new Date(`${date}T${endTime}`).toISOString();

    onSave({
      title: title.trim(),
      notes: notes.trim() || null,
      type,
      start_at,
      end_at,
      all_day: allDay,
    });
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-medium">{event ? "Edit event" : "New event"}</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            placeholder="Dentist checkup"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            >
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>

        {!allDay && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-soft">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink-soft">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
            placeholder="Optional detail…"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <div>
            {event && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="text-xs text-red-600 underline underline-offset-2"
              >
                Delete event
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
