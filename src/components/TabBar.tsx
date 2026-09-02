"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/home", label: "Home" },
  { href: "/vision", label: "Vision" },
  { href: "/goals", label: "Goals" },
  { href: "/board", label: "Board" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b border-line bg-paper/90 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/home" className="font-hand text-2xl text-accent">
            Board
          </Link>
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    active
                      ? "bg-ink text-paper"
                      : "text-ink-soft hover:bg-accent-soft hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <SignOut />
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper/95 backdrop-blur sm:hidden">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                active ? "text-accent" : "text-ink-soft"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent" : "bg-transparent"}`}
              />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function SignOut() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
    >
      Sign out
    </button>
  );
}
