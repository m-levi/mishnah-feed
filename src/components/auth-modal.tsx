"use client";

import { useState, useEffect } from "react";
import { X, Mail, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface AuthModalProps {
  onClose: () => void;
  message?: string;
}

export function AuthModal({ onClose, message }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === "signup") {
      setSuccess(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 modal-overlay"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md bg-[var(--card-bg)] rounded-t-2xl sm:rounded-2xl overflow-hidden modal-sheet z-10">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-6 pb-8 sm:pt-8">
          <h2
            className="text-xl font-bold text-[var(--text)] mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            {message ||
              "Sign in to track progress, sync bookmarks, and get unlimited access."}
          </p>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              Check your email to confirm your account, then sign in.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                />
              </div>

              {error && <p className="text-sm text-red-500 px-1">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? "..."
                  : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setSuccess(false);
              }}
              className="text-sm text-[var(--accent)] hover:underline cursor-pointer"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
