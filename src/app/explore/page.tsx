"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, ScrollText } from "lucide-react";
import { ScrollCard } from "@/components/scroll-card";
import type { Scroll } from "@/lib/types";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "mishnayos", label: "Mishnayos" },
  { key: "gemara", label: "Gemara" },
  { key: "chumash", label: "Tanakh" },
  { key: "mixed", label: "Custom" },
];

export default function ExplorePage() {
  const router = useRouter();
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [templates, setTemplates] = useState<Scroll[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadScrolls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: "public", category });
      if (search) params.set("search", search);

      const [publicRes, templateRes] = await Promise.all([
        fetch(`/api/scrolls?${params}`),
        fetch("/api/scrolls?mode=templates"),
      ]);

      if (publicRes.ok) {
        const data = await publicRes.json();
        setScrolls(data.scrolls || []);
      }
      if (templateRes.ok) {
        const data = await templateRes.json();
        setTemplates(data.scrolls || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const timer = setTimeout(loadScrolls, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadScrolls, search]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <h1
            className="text-lg font-semibold text-[var(--text)] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Explore Scrolls
          </h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scrolls..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                  category === cat.key
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)] active:bg-[var(--border)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {/* Featured templates */}
        {templates.length > 0 && !search && category === "all" && (
          <div className="mb-6">
            <h2 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Get Started
            </h2>
            <div className="space-y-2">
              {templates.map((s) => (
                <ScrollCard
                  key={s.id}
                  scroll={s}
                  onClick={() => router.push(`/scroll/${s.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Public scrolls */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] skeleton-pulse"
              />
            ))}
          </div>
        ) : scrolls.length > 0 ? (
          <div>
            {templates.length > 0 && !search && category === "all" && (
              <h2 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                <ScrollText className="w-3 h-3" />
                Community Scrolls
              </h2>
            )}
            <div className="space-y-2">
              {scrolls.map((s) => (
                <ScrollCard
                  key={s.id}
                  scroll={s}
                  onClick={() => router.push(`/scroll/${s.id}`)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-12">
            <ScrollText className="w-10 h-10 text-[var(--muted)] mb-3" />
            <p className="text-sm text-[var(--muted)]">
              {search
                ? "No scrolls found for your search"
                : "No public scrolls yet. Be the first to create one!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
