"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic-link" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    const supabase = createClient();

    if (mode === "magic-link") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setStatus("idle");
      } else {
        setStatus("sent");
      }
      return;
    }

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setStatus("idle");
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
      router.push("/home");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-hand text-5xl text-accent">Board</h1>
          <p className="mt-2 text-sm text-ink-soft">A calm personal space.</p>
        </div>

        <div className="card p-6">
          {status === "sent" ? (
            <div className="animate-fade-in text-center text-sm">
              <p className="mb-1 font-medium">Check your email</p>
              <p className="text-ink-soft">
                We sent a link to <span className="text-ink">{email}</span>.
              </p>
              <button
                className="mt-4 text-sm text-accent underline underline-offset-2"
                onClick={() => setStatus("idle")}
              >
                Back
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
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== "magic-link" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-soft">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="••••••••"
                  />
                </div>
              )}

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
                    : mode === "magic-link"
                      ? "Send magic link"
                      : "Sign in"}
              </button>

              <div className="flex items-center justify-between text-xs text-ink-soft">
                {mode === "password" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMode("magic-link")}
                      className="underline underline-offset-2 hover:text-ink"
                    >
                      Use a magic link instead
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("sign-up")}
                      className="underline underline-offset-2 hover:text-ink"
                    >
                      Create account
                    </button>
                  </>
                )}
                {mode === "magic-link" && (
                  <button
                    type="button"
                    onClick={() => setMode("password")}
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Use a password instead
                  </button>
                )}
                {mode === "sign-up" && (
                  <button
                    type="button"
                    onClick={() => setMode("password")}
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
