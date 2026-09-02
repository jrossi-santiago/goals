import Link from "next/link";
import { format } from "date-fns";
import type { Goal, Task, CalendarEvent, VisionItem } from "@/types/database";
import { TypeBadge } from "@/components/ui/TypeBadge";

type VisionImage = VisionItem & { imageUrl: string };

const STATUS_LABEL: Record<Goal["status"], string> = {
  active: "Active",
  paused: "Paused",
  done: "Done",
};

export function HomeView({
  visionImages,
  goals,
  weekTasks,
  upcomingTasks,
  upcomingEvents,
}: {
  visionImages: VisionImage[];
  goals: Goal[];
  weekTasks: Task[];
  upcomingTasks: Task[];
  upcomingEvents: CalendarEvent[];
}) {
  const upcoming = [
    ...upcomingTasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      date: t.due_date as string,
      type: t.type,
    })),
    ...upcomingEvents.map((e) => ({
      kind: "event" as const,
      id: e.id,
      title: e.title,
      date: e.start_at,
      type: e.type,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="font-hand text-4xl text-accent">Hello</h1>
        <p className="text-sm text-ink-soft">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      <Section title="Vision" href="/vision" empty={visionImages.length === 0} emptyText="Add some images to your vision board.">
        {visionImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {visionImages.map((img) => (
              <Link
                key={img.id}
                href="/vision"
                className="aspect-square overflow-hidden rounded-lg border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Active goals" href="/goals" empty={goals.length === 0} emptyText="No active goals yet — add one on the Goals tab.">
        <div className="space-y-1.5">
          {goals.map((g) => (
            <Link
              key={g.id}
              href="/goals"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent-soft/50"
            >
              <span className="flex items-center gap-2">
                {g.pinned && <span className="text-accent">★</span>}
                {g.title}
              </span>
              <span className="text-xs text-ink-soft">{STATUS_LABEL[g.status]}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="This week"
        href="/board"
        empty={weekTasks.length === 0}
        emptyText="Nothing planned for this week yet."
      >
        <div className="space-y-1.5">
          {weekTasks.map((t) => (
            <Link
              key={t.id}
              href="/board"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent-soft/50"
            >
              <span>{t.title}</span>
              <TypeBadge type={t.type} />
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Upcoming 7 days"
        href="/board?view=calendar"
        empty={upcoming.length === 0}
        emptyText="Nothing on the calendar this week."
      >
        <div className="space-y-1.5">
          {upcoming.map((item) => (
            <Link
              key={`${item.kind}-${item.id}`}
              href="/board?view=calendar"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent-soft/50"
            >
              <span>{item.title}</span>
              <span className="flex items-center gap-2 text-xs text-ink-soft">
                {format(new Date(item.date), "EEE, MMM d")}
                <TypeBadge type={item.type} />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  href,
  empty,
  emptyText,
  children,
}: {
  title: string;
  href: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-soft">{title}</h2>
        <Link href={href} className="text-xs text-accent underline underline-offset-2">
          View all
        </Link>
      </div>
      {empty ? (
        <div className="card px-4 py-6 text-center text-sm text-ink-soft">{emptyText}</div>
      ) : (
        <div className="card p-2">{children}</div>
      )}
    </section>
  );
}
