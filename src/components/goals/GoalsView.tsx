"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import type { Goal, GoalStatus } from "@/types/database";

const STATUS_LABEL: Record<GoalStatus, string> = {
  active: "Active",
  paused: "Paused",
  done: "Done",
};

const STATUS_DOT: Record<GoalStatus, string> = {
  active: "bg-personal",
  paused: "bg-[#c9a24a]",
  done: "bg-ink-soft",
};

type Filter = "all" | GoalStatus;

export function GoalsView({ initialGoals }: { initialGoals: Goal[] }) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const visible = goals
    .filter((g) => filter === "all" || g.status === filter)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  async function handleCreate(input: Partial<Goal>) {
    const optimistic: Goal = {
      id: `temp-${Date.now()}`,
      user_id: "",
      title: input.title ?? "",
      notes: input.notes ?? null,
      status: (input.status as GoalStatus) ?? "active",
      target_date: input.target_date ?? null,
      pinned: input.pinned ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setGoals((g) => [optimistic, ...g]);
    setShowForm(false);

    const { data, error } = await supabase
      .from("goals")
      .insert({
        title: optimistic.title,
        notes: optimistic.notes,
        status: optimistic.status,
        target_date: optimistic.target_date,
        pinned: optimistic.pinned,
      })
      .select()
      .single();

    if (error || !data) {
      setGoals((g) => g.filter((x) => x.id !== optimistic.id));
      return;
    }
    setGoals((g) => g.map((x) => (x.id === optimistic.id ? (data as Goal) : x)));
  }

  async function handleUpdate(id: string, patch: Partial<Goal>) {
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setEditing(null);
    await supabase.from("goals").update(patch).eq("id", id);
  }

  async function handleDelete(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id));
    setEditing(null);
    await supabase.from("goals").delete().eq("id", id);
  }

  async function togglePin(goal: Goal) {
    setGoals((g) => g.map((x) => (x.id === goal.id ? { ...x, pinned: !x.pinned } : x)));
    await supabase.from("goals").update({ pinned: !goal.pinned }).eq("id", goal.id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-hand text-4xl text-accent">Goals</h1>
          <p className="text-sm text-ink-soft">What you&apos;re working toward.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          + New goal
        </button>
      </div>

      <div className="mb-5 flex gap-1.5">
        {(["all", "active", "paused", "done"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? "bg-ink text-paper"
                : "border border-line bg-paper-raised text-ink-soft hover:text-ink"
            }`}
          >
            {f === "all" ? "All" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditing(goal)}
              onTogglePin={() => togglePin(goal)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <GoalForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <GoalForm
            goal={editing}
            onSubmit={(patch) => handleUpdate(editing.id, patch)}
            onCancel={() => setEditing(null)}
            onDelete={() => handleDelete(editing.id)}
          />
        </Modal>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onTogglePin,
}: {
  goal: Goal;
  onEdit: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div className="card animate-fade-in p-4">
      <div className="flex items-start justify-between gap-2">
        <button className="text-left" onClick={onEdit}>
          <h3 className="font-medium leading-snug">{goal.title}</h3>
        </button>
        <button
          onClick={onTogglePin}
          aria-label="Toggle pin"
          className={`shrink-0 text-lg leading-none ${goal.pinned ? "text-accent" : "text-line hover:text-ink-soft"}`}
        >
          ★
        </button>
      </div>
      {goal.notes && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{goal.notes}</p>}
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[goal.status]}`} />
        {STATUS_LABEL[goal.status]}
        {goal.target_date && (
          <>
            <span>·</span>
            <span>{new Date(goal.target_date + "T00:00:00").toLocaleDateString()}</span>
          </>
        )}
      </div>
    </div>
  );
}

function GoalForm({
  goal,
  onSubmit,
  onCancel,
  onDelete,
}: {
  goal?: Goal;
  onSubmit: (input: Partial<Goal>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [notes, setNotes] = useState(goal?.notes ?? "");
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "active");
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");
  const [pinned, setPinned] = useState(goal?.pinned ?? false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    onSubmit({
      title: title.trim(),
      notes: notes.trim() || null,
      status,
      target_date: targetDate || null,
      pinned,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-lg font-medium">{goal ? "Edit goal" : "New goal"}</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-soft">Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Run a half marathon"
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
          <label className="mb-1 block text-xs font-medium text-ink-soft">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as GoalStatus)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-soft">Target date</label>
          <input
            type="date"
            value={targetDate ?? ""}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        Pin to top
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-red-600 underline underline-offset-2"
            >
              Delete goal
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
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
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-16 text-center">
      <p className="font-hand text-2xl text-ink-soft">No goals yet</p>
      <p className="max-w-xs text-sm text-ink-soft">
        Add the first thing you&apos;re working toward — big or small.
      </p>
      <button
        onClick={onAdd}
        className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
      >
        + New goal
      </button>
    </div>
  );
}
