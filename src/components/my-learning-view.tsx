"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Flame, Target, Trophy, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getCategories } from "@/lib/source-data";
import type { SourceType } from "@/lib/types";

interface ProgressRecord {
  source_type: SourceType;
  slug: string;
  ref: string;
  display_name: string;
  completed_at: string;
}

interface ProgressStats {
  totalSections: number;
  uniqueTexts: number;
  streak: number;
  recentActivity: ProgressRecord[];
  bySourceType: Record<SourceType, Record<string, string[]>>;
}

function calculateStreak(records: ProgressRecord[]): number {
  if (records.length === 0) return 0;
  const dates = [
    ...new Set(records.map((r) => r.completed_at.slice(0, 10))),
  ]
    .sort()
    .reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff =
      new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime();
    if (diff <= 86400000 * 1.5) streak++;
    else break;
  }
  return streak;
}

export function MyLearningView({
  onShowAuth,
}: {
  onShowAuth: () => void;
}) {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("learning_progress")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const records = data as ProgressRecord[];
    const bySourceType: Record<string, Record<string, string[]>> = {
      mishnayos: {},
      gemara: {},
      chumash: {},
    };

    const uniqueTexts = new Set<string>();

    for (const r of records) {
      if (!bySourceType[r.source_type]) bySourceType[r.source_type] = {};
      if (!bySourceType[r.source_type][r.slug])
        bySourceType[r.source_type][r.slug] = [];
      if (!bySourceType[r.source_type][r.slug].includes(r.ref)) {
        bySourceType[r.source_type][r.slug].push(r.ref);
      }
      uniqueTexts.add(`${r.source_type}:${r.slug}`);
    }

    setStats({
      totalSections: records.length,
      uniqueTexts: uniqueTexts.size,
      streak: calculateStreak(records),
      recentActivity: records.slice(0, 15),
      bySourceType: bySourceType as Record<
        SourceType,
        Record<string, string[]>
      >,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Not logged in — show local progress if available
  if (!user) {
    let localRecords: { slug: string; ref: string; sourceType: string; displayName: string; timestamp: number }[] = [];
    try {
      const saved = localStorage.getItem("scroll-local-progress");
      if (saved) localRecords = JSON.parse(saved);
    } catch {}

    return (
      <div className="px-4 py-4 pb-24">
        {/* Sign in prompt */}
        <div className="flex flex-col items-center text-center mb-6 py-6">
          <div className="w-14 h-14 rounded-full bg-[var(--accent-light)] flex items-center justify-center mb-3">
            <BookOpen className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h2
            className="text-lg font-bold text-[var(--text)] mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Track Your Learning
          </h2>
          <p className="text-sm text-[var(--muted)] mb-4 max-w-xs">
            Sign in to sync your progress across devices and track streaks.
          </p>
          <button
            onClick={onShowAuth}
            className="px-6 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>

        {/* Show local progress */}
        {localRecords.length > 0 && (
          <div>
            <h3
              className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recent Activity (this device)
            </h3>
            <div className="space-y-1">
              {localRecords.slice(0, 12).map((r, i) => (
                <div
                  key={`${r.slug}-${r.ref}-${i}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg)] transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text)] flex-1 truncate">
                    {r.displayName}
                  </span>
                  <span className="text-[11px] text-[var(--muted)] flex-shrink-0">
                    {new Date(r.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (!stats || stats.totalSections === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-[var(--accent)]" />
        </div>
        <h2
          className="text-lg font-bold text-[var(--text)] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start Learning
        </h2>
        <p className="text-sm text-[var(--muted)] max-w-xs">
          Head to the Home tab, pick a text, and start learning. Your progress
          will be tracked here automatically.
        </p>
      </div>
    );
  }

  const sourceLabels: Record<string, string> = {
    mishnayos: "Mishnayos",
    gemara: "Gemara",
    chumash: "Tanakh",
  };

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto pb-24">
      {/* Profile row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            className="text-lg font-bold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            My Learning
          </h2>
          <p className="text-xs text-[var(--muted)]">{user.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-red-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-3 text-center">
          <div
            className="text-2xl font-bold text-[var(--accent)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {stats.totalSections}
          </div>
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-0.5">
            Sections
          </div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-3 text-center">
          <div
            className="text-2xl font-bold text-[var(--accent)] flex items-center justify-center gap-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {stats.streak}
            {stats.streak > 0 && (
              <Flame className="w-5 h-5 text-orange-500" />
            )}
          </div>
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-0.5">
            Day Streak
          </div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-3 text-center">
          <div
            className="text-2xl font-bold text-[var(--accent)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {stats.uniqueTexts}
          </div>
          <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-0.5">
            Texts
          </div>
        </div>
      </div>

      {/* Progress by source */}
      {(["mishnayos", "gemara", "chumash"] as SourceType[]).map(
        (sourceType) => {
          const slugMap = stats.bySourceType[sourceType];
          if (!slugMap || Object.keys(slugMap).length === 0) return null;

          const categories = getCategories(sourceType);
          const allItems = categories.flatMap((c) => c.items);

          return (
            <div key={sourceType} className="mb-6">
              <h3
                className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <Trophy className="w-4 h-4" />
                {sourceLabels[sourceType]}
              </h3>
              <div className="space-y-2">
                {Object.entries(slugMap).map(([slug, refs]) => {
                  const item = allItems.find((i) => i.slug === slug);
                  const total = item?.chapters || 1;
                  const completed = refs.length;
                  const pct = Math.min(
                    100,
                    Math.round((completed / total) * 100)
                  );

                  return (
                    <div
                      key={slug}
                      className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[var(--text)]">
                          {item?.name || slug.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {completed}/{total} · {pct}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
      )}

      {/* Recent activity */}
      {stats.recentActivity.length > 0 && (
        <div>
          <h3
            className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Recent Activity
          </h3>
          <div className="space-y-1">
            {stats.recentActivity.map((r, i) => (
              <div
                key={`${r.slug}-${r.ref}-${i}`}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg)] transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="text-sm text-[var(--text)] flex-1 truncate">
                  {r.display_name || `${r.slug.replace(/_/g, " ")} ${r.ref}`}
                </span>
                <span className="text-[11px] text-[var(--muted)] flex-shrink-0">
                  {new Date(r.completed_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
