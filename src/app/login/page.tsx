"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    const supabase = createClient();

    if (mode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setStatus("idle");
      } else if (data.session) {
        // Email confirmation is off — signed in immediately.
        router.push("/vision");
        router.refresh();
      } else {
        setStatus("sent");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      router.push("/vision");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-hand text-6xl italic text-ink">Board</h1>
          <p className="mt-2 text-sm text-ink-soft">A calm personal space.</p>
        </div>

        <div className="card p-6">
          {status === "sent" ? (
            <div className="animate-fade-in text-center text-sm">
              <p className="mb-1 font-medium">Check your email</p>
              <p className="text-ink-soft">
                Confirm your account via the link we sent to{" "}
                <span className="text-ink">{email}</span>, then sign in.
              </p>
              <button
                className="mt-4 text-sm text-ink underline underline-offset-2"
                onClick={() => {
                  setStatus("idle");
                  setMode("sign-in");
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
              >
                {status === "loading"
                  ? "Please wait…"
                  : mode === "sign-up"
                    ? "Create account"
                    : "Sign in"}
              </button>

              <div className="flex items-center justify-center text-xs text-ink-soft">
                {mode === "sign-in" ? (
                  <button
                    type="button"
                    onClick={() => setMode("sign-up")}
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Create account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode("sign-in")}
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Already have an account? Sign in
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
