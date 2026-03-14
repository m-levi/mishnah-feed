"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ScrollText, BookOpen, Pin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { ScrollCard } from "@/components/scroll-card";
import { supabase } from "@/lib/supabase";
import type { Scroll, UserScroll } from "@/lib/types";

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [userScrolls, setUserScrolls] = useState<(UserScroll & { scroll: Scroll })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScrolls = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch("/api/scrolls?mode=mine", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUserScrolls(data.scrolls || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadScrolls();
  }, [loadScrolls]);

  const createdScrolls = userScrolls.filter((us) => us.is_creator);
  const followedScrolls = userScrolls.filter((us) => !us.is_creator);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <h1
            className="text-lg font-semibold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            My Scrolls
          </h1>
          <button
            onClick={() => {
              if (!user) {
                setShowAuth(true);
                return;
              }
              router.push("/create");
            }}
            className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white cursor-pointer hover:bg-[var(--accent-hover)] active:scale-90 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {!user ? (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
              <ScrollText className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h2
              className="text-lg font-bold text-[var(--text)] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your Learning Library
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-xs mb-4">
              Sign in to create scrolls, track your progress, and follow others&apos; learning paths.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm cursor-pointer hover:bg-[var(--accent-hover)] transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] skeleton-pulse"
              />
            ))}
          </div>
        ) : userScrolls.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h2
              className="text-lg font-bold text-[var(--text)] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No scrolls yet
            </h2>
            <p className="text-sm text-[var(--muted)] max-w-xs mb-4">
              Create your first scroll to start your personalized Torah learning journey.
            </p>
            <button
              onClick={() => router.push("/create")}
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm cursor-pointer hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create a Scroll
            </button>
          </div>
        ) : (
          <>
            {/* Pinned / Created */}
            {createdScrolls.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  My Scrolls
                </h2>
                <div className="space-y-2">
                  {createdScrolls.map((us) => (
                    <ScrollCard
                      key={us.id}
                      scroll={us.scroll}
                      onClick={() => router.push(`/scroll/${us.scroll_id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Following */}
            {followedScrolls.length > 0 && (
              <div>
                <h2 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                  Following
                </h2>
                <div className="space-y-2">
                  {followedScrolls.map((us) => (
                    <ScrollCard
                      key={us.id}
                      scroll={us.scroll}
                      onClick={() => router.push(`/scroll/${us.scroll_id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          message="Sign in to create and manage your scrolls"
        />
      )}
    </div>
  );
}
