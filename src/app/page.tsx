"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Share2,
  Check,
  RefreshCw,
  Bookmark,
  BookOpen,
  ChevronRight,
  User,
  Home,
  ScrollText,
  Compass,
  Plus,
} from "lucide-react";
import { StormCard } from "@/components/storm-card";
import { TweetSkeleton } from "@/components/tweet-skeleton";
import { CommentaryView } from "@/components/commentary-view";
import { BookmarksSheet } from "@/components/bookmarks-sheet";
import { AuthModal } from "@/components/auth-modal";
import { BottomNav } from "@/components/bottom-nav";
import type { BottomNavKey } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getItemFromState, getNextRef } from "@/lib/source-data";
import type { StormTweet, SourceType, PickerState } from "@/lib/types";

type TabKey = "foryou" | "myscrolls" | "search";

const tabs: { key: TabKey; label: string }[] = [
  { key: "foryou", label: "For You" },
  { key: "myscrolls", label: "My Scrolls" },
  { key: "search", label: "Search" },
];

const defaultPickerState: PickerState = {
  categoryIndex: -1,
  itemIndex: -1,
  perek: "",
  mishnah: "",
};

interface FeedCache {
  tweets: StormTweet[];
  selection: string;
  slug?: string;
  ref?: string;
  sourceType?: SourceType;
}

interface LastStudied {
  tab: TabKey;
  slug: string;
  ref: string;
  sourceType: SourceType;
  displayName: string;
  pickerState: PickerState;
  timestamp: number;
}

const LS_PICKER_KEY = "scroll-pickers";
const LS_LAST_STUDIED_KEY = "scroll-last-studied";

function loadPickerStates(): Record<string, PickerState> {
  try {
    const saved = localStorage.getItem(LS_PICKER_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    mishnayos: { ...defaultPickerState },
    gemara: { ...defaultPickerState },
    chumash: { ...defaultPickerState },
  };
}

function savePickerStates(states: Record<string, PickerState>) {
  try {
    localStorage.setItem(LS_PICKER_KEY, JSON.stringify(states));
  } catch {}
}

function loadLastStudied(): LastStudied | null {
  try {
    const saved = localStorage.getItem(LS_LAST_STUDIED_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveLastStudied(data: LastStudied) {
  try {
    localStorage.setItem(LS_LAST_STUDIED_KEY, JSON.stringify(data));
  } catch {}
}

// ── SSE stream consumer ────────────────────────────────────
async function readStream(
  response: Response,
  signal: AbortSignal,
  onTweet: (tweet: StormTweet) => void,
  onDone: (total: number) => void,
  onError: (msg: string) => void
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop()!;

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.done) {
            onDone(parsed.total);
            return;
          }
          onTweet(parsed as StormTweet);
        } catch {
          // Skip unparseable events
        }
      }
    }
    onDone(0);
  } catch {
    if (!signal.aborted) {
      onError("Connection lost. Please try again.");
    }
  } finally {
    try {
      reader.cancel();
    } catch {}
  }
}

// ── Explore inline view ────────────────────────────────────
function ExploreInline() {
  const [scrolls, setScrolls] = useState<Array<{ id: string; title: string; description: string | null; cover_emoji: string | null; scroll_type: string; source_type: string; follower_count: number; is_public: boolean; is_template: boolean; created_at: string; updated_at: string; creator_id: string | null; config: Record<string, unknown> }>>([]);
  const [templates, setTemplates] = useState<typeof scrolls>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const cats = [
    { key: "all", label: "All" },
    { key: "mishnayos", label: "Mishnayos" },
    { key: "gemara", label: "Gemara" },
    { key: "chumash", label: "Tanakh" },
    { key: "mixed", label: "Custom" },
  ];

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ mode: "public", category });
        if (search) params.set("search", search);
        const [pubRes, tmplRes] = await Promise.all([
          fetch(`/api/scrolls?${params}`),
          fetch("/api/scrolls?mode=templates"),
        ]);
        if (pubRes.ok) setScrolls((await pubRes.json()).scrolls || []);
        if (tmplRes.ok) setTemplates((await tmplRes.json()).scrolls || []);
      } catch {} finally { setLoading(false); }
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, category]);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scrolls..."
            className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                category === c.key ? "bg-[var(--accent)] text-white" : "bg-[var(--bg)] text-[var(--muted)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-4 pb-24">
        {templates.length > 0 && !search && category === "all" && (
          <div className="mb-6">
            <h2 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Get Started</h2>
            <div className="space-y-2">
              {templates.map((s) => (
                <a key={s.id} href={`/scroll/${s.id}`} className="block w-full flex items-center gap-3 p-3.5 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-xl flex-shrink-0">{s.cover_emoji || "\uD83D\uDCDC"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[var(--text)] truncate">{s.title}</div>
                    {s.description && <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{s.description}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] skeleton-pulse" />)}</div>
        ) : scrolls.length > 0 ? (
          <div className="space-y-2">
            {scrolls.map((s) => (
              <a key={s.id} href={`/scroll/${s.id}`} className="block w-full flex items-center gap-3 p-3.5 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all">
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-xl flex-shrink-0">{s.cover_emoji || "\uD83D\uDCDC"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--text)] truncate">{s.title}</div>
                  {s.description && <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{s.description}</p>}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--muted)]">
              {search ? "No scrolls found" : "No public scrolls yet"}
            </p>
            <a href="/create" className="inline-flex items-center gap-2 mt-3 px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold">
              <Plus className="w-4 h-4" /> Create a Scroll
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Library inline view ───────────────────────────────────
function LibraryInline({ user, onShowAuth }: { user: { id: string; email?: string } | null; onShowAuth: () => void }) {
  const [userScrolls, setUserScrolls] = useState<Array<{ id: string; scroll_id: string; is_creator: boolean; scroll: { id: string; title: string; description: string | null; cover_emoji: string | null; scroll_type: string; follower_count: number; source_type: string } }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch("/api/scrolls?mode=mine", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setUserScrolls((await res.json()).scrolls || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [user]);

  const created = userScrolls.filter(us => us.is_creator);
  const followed = userScrolls.filter(us => !us.is_creator);

  return (
    <div>
      <div className="px-4 py-4 pb-24">
        {!user ? (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
              <ScrollText className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text)] mb-2" style={{ fontFamily: "var(--font-display)" }}>Your Learning Library</h2>
            <p className="text-sm text-[var(--muted)] max-w-xs mb-4">Sign in to create scrolls and track your progress.</p>
            <button onClick={onShowAuth} className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm cursor-pointer">Sign In</button>
          </div>
        ) : loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] skeleton-pulse" />)}</div>
        ) : userScrolls.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text)] mb-2" style={{ fontFamily: "var(--font-display)" }}>No scrolls yet</h2>
            <p className="text-sm text-[var(--muted)] max-w-xs mb-4">Create your first scroll to start your learning journey.</p>
            <a href="/create" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm">
              <Plus className="w-4 h-4" /> Create a Scroll
            </a>
          </div>
        ) : (
          <>
            {created.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">My Scrolls</h2>
                <div className="space-y-2">
                  {created.map(us => (
                    <a key={us.id} href={`/scroll/${us.scroll_id}`} className="block w-full flex items-center gap-3 p-3.5 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all">
                      <div className="w-11 h-11 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-xl flex-shrink-0">{us.scroll.cover_emoji || "\uD83D\uDCDC"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[var(--text)] truncate">{us.scroll.title}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {followed.length > 0 && (
              <div>
                <h2 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Following</h2>
                <div className="space-y-2">
                  {followed.map(us => (
                    <a key={us.id} href={`/scroll/${us.scroll_id}`} className="block w-full flex items-center gap-3 p-3.5 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all">
                      <div className="w-11 h-11 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-xl flex-shrink-0">{us.scroll.cover_emoji || "\uD83D\uDCDC"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[var(--text)] truncate">{us.scroll.title}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function HomePage() {
  const { user, checkUsageLimit, incrementUsage } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("foryou");
  const [tweets, setTweets] = useState<StormTweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState<StormTweet | null>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>();
  const [lastStudied, setLastStudied] = useState<LastStudied | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const imageQueueRef = useRef<Set<number>>(new Set());
  const carouselQueueRef = useRef<Set<string>>(new Set());
  const hasAutoLoaded = useRef(false);
  const feedCacheRef = useRef<Record<string, FeedCache>>({});
  const currentFeedCtx = useRef<{
    slug: string;
    ref: string;
    sourceType: SourceType;
  } | null>(null);

  const [pickerStates, setPickerStates] = useState<
    Record<string, PickerState>
  >({
    mishnayos: { ...defaultPickerState },
    gemara: { ...defaultPickerState },
    chumash: { ...defaultPickerState },
  });

  const activeStreamRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  const abortActiveStream = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
    }
  }, []);

  // Load persisted state on mount
  useEffect(() => {
    setPickerStates(loadPickerStates());
    setLastStudied(loadLastStudied());
  }, []);

  // Auto-load discovery feed on first mount
  useEffect(() => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    loadDiscoverFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save progress to Supabase and localStorage when a storm finishes loading
  const saveProgress = useCallback(
    async (slug: string, ref: string, sourceType: SourceType, displayName: string) => {
      // Always save to localStorage for anonymous tracking
      try {
        const key = "scroll-local-progress";
        const saved = localStorage.getItem(key);
        const records: { slug: string; ref: string; sourceType: SourceType; displayName: string; timestamp: number }[] = saved ? JSON.parse(saved) : [];
        // Avoid duplicates
        if (!records.some(r => r.slug === slug && r.ref === ref)) {
          records.unshift({ slug, ref, sourceType, displayName, timestamp: Date.now() });
          // Keep last 100 entries
          if (records.length > 100) records.length = 100;
          localStorage.setItem(key, JSON.stringify(records));
        }
      } catch {}

      // Also save to Supabase if logged in
      if (!user) return;
      try {
        await supabase.from("learning_progress").upsert(
          {
            user_id: user.id,
            source_type: sourceType,
            slug,
            ref,
            display_name: displayName,
          },
          { onConflict: "user_id,source_type,slug,ref" }
        );
      } catch {}
    },
    [user]
  );

  const promptAuth = useCallback((msg?: string) => {
    setAuthMessage(msg);
    setShowAuth(true);
  }, []);

  const loadDiscoverFeed = useCallback(async () => {
    if (!checkUsageLimit()) {
      promptAuth(
        `You've used all ${5} free generations today. Sign in for unlimited access.`
      );
      return;
    }

    abortActiveStream();
    const controller = new AbortController();
    activeStreamRef.current = controller;

    setIsLoading(true);
    setTweets([]);
    setError(null);
    setCurrentSelection("For You");
    setShareUrl(null);
    setCopied(false);
    setReachedEnd(false);
    currentFeedCtx.current = null;
    imageQueueRef.current = new Set();
    carouselQueueRef.current = new Set();

    incrementUsage();

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to generate");

      await readStream(
        res,
        controller.signal,
        (tweet) => {
          if (!controller.signal.aborted) {
            setTweets((prev) => [...prev, tweet]);
          }
        },
        () => {
          if (!controller.signal.aborted) {
            setTweets((prev) => {
              const refCounts = new Map<string, number>();
              prev.forEach((t) =>
                refCounts.set(t.ref, (refCounts.get(t.ref) || 0) + 1)
              );
              const updated = prev.map((t) => ({
                ...t,
                totalTweets: refCounts.get(t.ref) || 1,
              }));
              feedCacheRef.current["foryou"] = {
                tweets: updated,
                selection: "For You",
              };
              return updated;
            });
          }
        },
        (msg) => {
          if (!controller.signal.aborted) setError(msg);
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setError("Failed to load feed. Tap refresh to try again.");
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
      if (activeStreamRef.current === controller) {
        activeStreamRef.current = null;
      }
    }
  }, [abortActiveStream, checkUsageLimit, incrementUsage, promptAuth]);

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      if (tab === activeTab) return;

      abortActiveStream();

      // Cache current feed state if leaving the feed tab
      if (activeTab === "foryou" && tweets.length > 0) {
        feedCacheRef.current["foryou"] = {
          ...feedCacheRef.current["foryou"],
          tweets: [...tweets],
          selection: currentSelection,
        };
      }

      setActiveTab(tab);
      setShareUrl(null);
      setCopied(false);
      setError(null);
      setIsLoading(false);
      setLoadingMore(false);
      setReachedEnd(false);

      // Restore feed cache when switching back to For You
      if (tab === "foryou") {
        const cached = feedCacheRef.current["foryou"];
        if (cached && cached.tweets.length > 0) {
          setTweets(cached.tweets);
          setCurrentSelection(cached.selection);
          if (cached.slug && cached.ref && cached.sourceType) {
            currentFeedCtx.current = {
              slug: cached.slug,
              ref: cached.ref,
              sourceType: cached.sourceType,
            };
          } else {
            currentFeedCtx.current = null;
          }
        } else {
          loadDiscoverFeed();
        }
      }
    },
    [activeTab, tweets, currentSelection, abortActiveStream, loadDiscoverFeed]
  );

  const handleSelect = useCallback(
    async (
      slug: string,
      ref: string,
      sourceType: SourceType,
      displayName: string
    ) => {
      if (!checkUsageLimit()) {
        promptAuth(
          `You've used all ${5} free generations today. Sign in for unlimited access.`
        );
        return;
      }

      abortActiveStream();
      const controller = new AbortController();
      activeStreamRef.current = controller;

      setIsLoading(true);
      setTweets([]);
      setError(null);
      setCurrentSelection(displayName);
      setShareUrl(null);
      setCopied(false);
      setReachedEnd(false);
      imageQueueRef.current = new Set();
    carouselQueueRef.current = new Set();

      currentFeedCtx.current = { slug, ref, sourceType };

      incrementUsage();

      const studyData: LastStudied = {
        tab: activeTab as TabKey,
        slug,
        ref,
        sourceType,
        displayName,
        pickerState: pickerStates[activeTab] || defaultPickerState,
        timestamp: Date.now(),
      };
      setLastStudied(studyData);
      saveLastStudied(studyData);

      try {
        const res = await fetch("/api/tweet-storm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ref, sourceType }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to generate");

        await readStream(
          res,
          controller.signal,
          (tweet) => {
            if (!controller.signal.aborted) {
              setTweets((prev) => [...prev, tweet]);
            }
          },
          (total) => {
            if (!controller.signal.aborted) {
              setTweets((prev) => {
                const count = total || prev.length;
                const updated = prev.map((t) => ({
                  ...t,
                  totalTweets: count,
                }));
                feedCacheRef.current[activeTab] = {
                  tweets: updated,
                  selection: displayName,
                  slug,
                  ref,
                  sourceType,
                };
                return updated;
              });
              saveProgress(slug, ref, sourceType, displayName);
            }
          },
          (msg) => {
            if (!controller.signal.aborted) setError(msg);
          }
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError("Failed to load. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
        if (activeStreamRef.current === controller) {
          activeStreamRef.current = null;
        }
      }
    },
    [
      activeTab,
      abortActiveStream,
      pickerStates,
      checkUsageLimit,
      incrementUsage,
      promptAuth,
      saveProgress,
    ]
  );

  // Load next section (infinite scroll)
  const loadNextSection = useCallback(async () => {
    const ctx = currentFeedCtx.current;
    if (!ctx || isLoading || loadingMore || reachedEnd) return;

    const item = getItemFromState(
      ctx.sourceType,
      pickerStates[activeTab]?.categoryIndex ?? -1,
      pickerStates[activeTab]?.itemIndex ?? -1
    );
    if (!item) return;

    const next = getNextRef(ctx.ref, item);
    if (!next) {
      setReachedEnd(true);
      return;
    }

    if (!checkUsageLimit()) {
      setReachedEnd(true);
      promptAuth(
        `You've used all ${5} free generations today. Sign in for unlimited access.`
      );
      return;
    }

    const controller = new AbortController();
    activeStreamRef.current = controller;
    setLoadingMore(true);

    currentFeedCtx.current = { ...ctx, ref: next.ref };
    incrementUsage();

    const studyData: LastStudied = {
      tab: activeTab as TabKey,
      slug: ctx.slug,
      ref: next.ref,
      sourceType: ctx.sourceType,
      displayName: next.displayName,
      pickerState: pickerStates[activeTab] || defaultPickerState,
      timestamp: Date.now(),
    };
    setLastStudied(studyData);
    saveLastStudied(studyData);

    const appendStartIndex = tweets.length;

    try {
      const res = await fetch("/api/tweet-storm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: ctx.slug,
          ref: next.ref,
          sourceType: ctx.sourceType,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to generate");

      await readStream(
        res,
        controller.signal,
        (tweet) => {
          if (!controller.signal.aborted) {
            setTweets((prev) => [...prev, tweet]);
          }
        },
        (total) => {
          if (!controller.signal.aborted) {
            setTweets((prev) => {
              const count = total || prev.length - appendStartIndex;
              const updated = prev.map((t, i) => {
                if (i >= appendStartIndex) {
                  return { ...t, totalTweets: count };
                }
                return t;
              });
              setCurrentSelection(next.displayName);
              feedCacheRef.current[activeTab] = {
                tweets: updated,
                selection: next.displayName,
                slug: ctx.slug,
                ref: next.ref,
                sourceType: ctx.sourceType,
              };
              return updated;
            });
            saveProgress(ctx.slug, next.ref, ctx.sourceType, next.displayName);
          }
        },
        (msg) => {
          if (!controller.signal.aborted) setError(msg);
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setError("Failed to load next section.");
      }
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
      if (activeStreamRef.current === controller) {
        activeStreamRef.current = null;
      }
    }
  }, [
    activeTab,
    isLoading,
    loadingMore,
    reachedEnd,
    pickerStates,
    tweets.length,
    checkUsageLimit,
    incrementUsage,
    promptAuth,
    saveProgress,
  ]);

  const handleUpdateTweet = useCallback(
    (index: number, updates: Partial<StormTweet>) => {
      setTweets((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
      );
    },
    []
  );

  // Async image loading
  useEffect(() => {
    if (tweets.length === 0) return;

    const tweetsNeedingImages = tweets
      .map((t, i) => ({ tweet: t, index: i }))
      .filter(
        ({ tweet, index }) =>
          tweet.needsImage &&
          tweet.imagePrompt &&
          !tweet.imageData &&
          !tweet.imageLoading &&
          !imageQueueRef.current.has(index)
      );

    if (tweetsNeedingImages.length === 0) return;

    const MAX_CONCURRENT = 2;
    let active = 0;
    const queue = [...tweetsNeedingImages];

    const processNext = () => {
      while (active < MAX_CONCURRENT && queue.length > 0) {
        const item = queue.shift()!;
        active++;
        imageQueueRef.current.add(item.index);
        handleUpdateTweet(item.index, { imageLoading: true });

        fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: item.tweet.imagePrompt }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.imageData) {
              handleUpdateTweet(item.index, {
                imageData: data.imageData,
                imageMimeType: data.mimeType,
                imageLoading: false,
              });
            } else {
              handleUpdateTweet(item.index, {
                needsImage: false,
                imageLoading: false,
              });
            }
          })
          .catch(() => {
            handleUpdateTweet(item.index, {
              needsImage: false,
              imageLoading: false,
            });
          })
          .finally(() => {
            active--;
            processNext();
          });
      }
    };

    processNext();
  }, [tweets, handleUpdateTweet]);

  // Async carousel image loading
  useEffect(() => {
    if (tweets.length === 0) return;

    const carouselTweets = tweets
      .map((t, i) => ({ tweet: t, index: i }))
      .filter(({ tweet }) => tweet.carousel && tweet.carousel.length > 0);

    if (carouselTweets.length === 0) return;

    const MAX_CONCURRENT = 2;
    let active = 0;

    interface CarouselJob {
      tweetIndex: number;
      imageIndex: number;
      prompt: string;
    }

    const queue: CarouselJob[] = [];
    for (const { tweet, index: tweetIndex } of carouselTweets) {
      for (let imgIdx = 0; imgIdx < tweet.carousel!.length; imgIdx++) {
        const img = tweet.carousel![imgIdx];
        const key = `${tweetIndex}-${imgIdx}`;
        if (!img.data && !img.loading && !carouselQueueRef.current.has(key)) {
          queue.push({ tweetIndex, imageIndex: imgIdx, prompt: img.prompt });
        }
      }
    }

    if (queue.length === 0) return;

    const processNext = () => {
      while (active < MAX_CONCURRENT && queue.length > 0) {
        const job = queue.shift()!;
        active++;
        const key = `${job.tweetIndex}-${job.imageIndex}`;
        carouselQueueRef.current.add(key);

        // Mark this carousel image as loading
        setTweets((prev) =>
          prev.map((t, i) => {
            if (i !== job.tweetIndex || !t.carousel) return t;
            const newCarousel = [...t.carousel];
            newCarousel[job.imageIndex] = { ...newCarousel[job.imageIndex], loading: true };
            return { ...t, carousel: newCarousel };
          })
        );

        fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: job.prompt }),
        })
          .then((res) => res.json())
          .then((data) => {
            setTweets((prev) =>
              prev.map((t, i) => {
                if (i !== job.tweetIndex || !t.carousel) return t;
                const newCarousel = [...t.carousel];
                if (data.imageData) {
                  newCarousel[job.imageIndex] = {
                    ...newCarousel[job.imageIndex],
                    data: data.imageData,
                    mimeType: data.mimeType,
                    loading: false,
                  };
                } else {
                  newCarousel[job.imageIndex] = {
                    ...newCarousel[job.imageIndex],
                    loading: false,
                  };
                }
                return { ...t, carousel: newCarousel };
              })
            );
          })
          .catch(() => {
            setTweets((prev) =>
              prev.map((t, i) => {
                if (i !== job.tweetIndex || !t.carousel) return t;
                const newCarousel = [...t.carousel];
                newCarousel[job.imageIndex] = {
                  ...newCarousel[job.imageIndex],
                  loading: false,
                };
                return { ...t, carousel: newCarousel };
              })
            );
          })
          .finally(() => {
            active--;
            processNext();
          });
      }
    };

    processNext();
  }, [tweets]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !loadingMore) {
          loadNextSection();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, loadingMore, loadNextSection]);

  // Swipe handlers — only swipe tabs when horizontal movement clearly dominates vertical
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
    touchEndRef.current = null;
    touchEndYRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
    touchEndYRef.current = e.targetTouches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || touchEndRef.current === null || touchEndYRef.current === null) return;
    const distanceX = touchStartRef.current.x - touchEndRef.current;
    const distanceY = touchStartRef.current.y - (touchEndYRef.current ?? 0);

    // Only trigger horizontal swipe if:
    // 1. Horizontal distance is at least 80px (more forgiving threshold)
    // 2. Horizontal movement is at least 2x the vertical movement (clearly intentional)
    if (Math.abs(distanceX) < 80 || Math.abs(distanceX) < Math.abs(distanceY) * 2) return;

    const tabKeys = tabs.map((t) => t.key);
    const currentIndex = tabKeys.indexOf(activeTab);

    if (distanceX > 0 && currentIndex < tabKeys.length - 1) {
      handleTabChange(tabKeys[currentIndex + 1]);
    } else if (distanceX < 0 && currentIndex > 0) {
      handleTabChange(tabKeys[currentIndex - 1]);
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
    touchEndYRef.current = null;
  }, [activeTab, handleTabChange]);

  const handleShare = async () => {
    if (tweets.length === 0) return;
    setIsSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: currentSelection, tweets }),
      });
      if (!res.ok) throw new Error("Failed to share");
      const data = await res.json();
      setShareUrl(data.url);
    } catch {
      setError("Failed to create share link.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePickerStateChange = useCallback(
    (newState: PickerState) => {
      setPickerStates((prev) => {
        const updated = { ...prev, [activeTab]: newState };
        savePickerStates(updated);
        return updated;
      });
    },
    [activeTab]
  );

  const handleContinueLearning = useCallback(() => {
    if (!lastStudied) return;
    setActiveTab("foryou");
    handleSelect(
      lastStudied.slug,
      lastStudied.ref,
      lastStudied.sourceType,
      lastStudied.displayName
    );
  }, [lastStudied, handleSelect]);

  const hasTweets = tweets.length > 0;
  const showFeed = hasTweets;
  const showEmpty = false; // Source pickers removed; feed always loads via For You
  const showSkeletons = isLoading && !hasTweets;
  const carouselImageCount = tweets.reduce(
    (acc, t) => acc + (t.carousel ? t.carousel.length : 0),
    0
  );
  const carouselImagesDone = tweets.reduce(
    (acc, t) =>
      acc + (t.carousel ? t.carousel.filter((img) => img.data).length : 0),
    0
  );
  const imagesLoading =
    tweets.some((t) => t.imageLoading) ||
    tweets.some((t) => t.carousel?.some((img) => img.loading));
  const imagesTotal =
    tweets.filter((t) => t.needsImage).length + carouselImageCount;
  const imagesDone =
    tweets.filter((t) => t.needsImage && t.imageData).length +
    carouselImagesDone;
  const activeTabIndex = tabs.findIndex((t) => t.key === activeTab);

  const sidebarNavItems: { key: string; label: string; icon: typeof Home }[] = [
    { key: "foryou", label: "For You", icon: Home },
    { key: "search", label: "Search", icon: Compass },
    { key: "myscrolls", label: "My Scrolls", icon: ScrollText },
    { key: "bookmarks", label: "Bookmarks", icon: Bookmark },
  ];

  const handleSidebarNav = useCallback((key: string) => {
    if (key === "bookmarks") {
      setShowBookmarks(true);
    } else {
      handleTabChange(key as TabKey);
    }
  }, [handleTabChange]);

  const activeSidebarKey = activeTab;

  const handleBottomNav = useCallback((key: BottomNavKey) => {
    if (key === "bookmarks") {
      setShowBookmarks(true);
    } else {
      handleTabChange(key as TabKey);
    }
  }, [handleTabChange]);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-16 sm:pb-0 sm:flex sm:justify-center">
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden sm:flex sm:flex-col sm:w-[220px] lg:w-[260px] sm:fixed sm:left-[max(0px,calc(50%-450px))] sm:top-0 sm:bottom-0 sm:border-r sm:border-[var(--border)] sm:bg-[var(--card-bg)] sm:z-20 no-print">
        {/* Logo */}
        <div className="px-5 pt-5 pb-2">
          <h1
            className="text-xl font-bold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Scroll
          </h1>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {sidebarNavItems.map(({ key, label, icon: Icon }) => {
            const active = activeSidebarKey === key;
            return (
              <button
                key={key}
                onClick={() => handleSidebarNav(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[15px] transition-colors cursor-pointer ${
                  active
                    ? "font-bold text-[var(--text)] bg-[var(--bg)]"
                    : "font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Create scroll button */}
        <div className="px-3 mt-4">
          <a
            href="/create"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Scroll
          </a>
        </div>

        {/* User section at bottom */}
        <div className="px-3 pb-4 mt-auto">
          {!user ? (
            <button
              onClick={() => setShowAuth(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[15px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              <User className="w-[22px] h-[22px]" />
              Sign In
            </button>
          ) : (
            <button
              onClick={() => handleSidebarNav("library")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full hover:bg-[var(--bg)] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(user.email || "U")[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-[var(--text)] truncate">{user.email}</span>
            </button>
          )}
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="sm:ml-[220px] lg:ml-[260px] sm:max-w-[600px] w-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)] no-print">
          {/* Mobile header */}
          <div className="sm:hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1 flex items-center justify-between">
            <h1
              className="text-xl font-bold text-[var(--accent)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Scroll
            </h1>

            <div className="flex items-center gap-1">
              {activeTab === "foryou" && (
                <button
                  onClick={loadDiscoverFeed}
                  disabled={isLoading}
                  className="w-9 h-9 rounded-full hover:bg-[var(--bg)] active:bg-[var(--border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Refresh feed"
                >
                  <RefreshCw
                    className={`w-[18px] h-[18px] text-[var(--muted)] ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              )}
              {activeTab === "foryou" && showFeed && !isLoading && (
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-9 h-9 rounded-full hover:bg-[var(--bg)] active:bg-[var(--border)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Share"
                >
                  <Share2 className="w-[18px] h-[18px] text-[var(--muted)]" />
                </button>
              )}
              {!user ? (
                <button
                  onClick={() => setShowAuth(true)}
                  className="w-9 h-9 rounded-full hover:bg-[var(--bg)] active:bg-[var(--border)] flex items-center justify-center transition-colors cursor-pointer"
                  title="Sign In"
                >
                  <User className="w-[18px] h-[18px] text-[var(--muted)]" />
                </button>
              ) : (
                <button
                  onClick={() => handleTabChange("myscrolls")}
                  className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold cursor-pointer active:scale-95 transition-transform"
                  title={user.email || "Profile"}
                >
                  {(user.email || "U")[0].toUpperCase()}
                </button>
              )}
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden sm:flex px-4 pt-3 pb-3 items-center justify-between">
            <h2
              className="text-lg font-bold text-[var(--text)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {tabs.find(t => t.key === activeTab)?.label || "Feed"}
            </h2>
            <div className="flex gap-0.5">
              {activeTab === "foryou" && (
                <button
                  onClick={loadDiscoverFeed}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Refresh feed"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-[var(--muted)] ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              )}
              {activeTab === "foryou" && showFeed && !isLoading && (
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  title="Share"
                >
                  <Share2 className="w-4 h-4 text-[var(--muted)]" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile: show current tab name */}
          <div className="sm:hidden px-4 pb-2">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              {tabs.find(t => t.key === activeTab)?.label || "Feed"}
            </span>
          </div>
        </div>

      {/* ─── FOR YOU FEED ─── */}
      {activeTab === "foryou" && (
        <>

          {/* Usage bar removed — no rate limiting */}

          {/* Feed info bar */}
          {showFeed && currentSelection && (
            <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-2">
              <div className="max-w-2xl mx-auto flex items-center gap-2">
                <p className="text-sm text-[var(--muted)]">
                  <span className="font-semibold text-[var(--text)]">
                    {currentSelection}
                  </span>{" "}
                  &middot; {tweets.length} tweets
                  {isLoading && (
                    <span className="text-[var(--accent)]">
                      {" "}
                      &middot; generating...
                    </span>
                  )}
                </p>
                {imagesLoading && (
                  <span className="text-[11px] text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full font-medium">
                    {imagesDone}/{imagesTotal} images
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Share URL bar */}
          {shareUrl && (
            <div className="bg-[var(--accent-light)] border-b border-[var(--accent-muted)] px-4 py-2.5 no-print">
              <div className="max-w-2xl mx-auto flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--accent-muted)] bg-[var(--card-bg)] text-sm text-[var(--text)] font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : null}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="max-w-2xl mx-auto mt-4 px-4 no-print">
              <div className="rounded-2xl border px-4 py-3 text-sm font-medium" style={{ backgroundColor: "var(--comm-4-bg)", borderColor: "var(--comm-4-border)", color: "var(--comm-4-text)" }}>
                {error}
              </div>
            </div>
          )}

          {/* Swipeable content area */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Continue learning card */}
            {activeTab === "foryou" &&
              lastStudied &&
              !isLoading &&
              hasTweets && (
                <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-3">
                  <div className="max-w-2xl mx-auto">
                    <button
                      onClick={handleContinueLearning}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-muted)] hover:border-[var(--accent)] transition-colors cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                          Continue learning
                        </p>
                        <p className="text-[14px] font-medium text-[var(--text)] truncate">
                          {lastStudied.displayName}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--accent)] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

            {/* Loading skeletons */}
            {showSkeletons && (
              <div>
                {Array.from({ length: 6 }, (_, i) => (
                  <TweetSkeleton key={i} index={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <p className="text-[var(--muted)] text-[15px]">
                  Pick a text above and tap{" "}
                  <strong className="text-[var(--text)]">Go</strong> to generate
                  a feed
                </p>
              </div>
            )}

            {/* Feed */}
            {showFeed && (
              <div>
                {tweets.map((tweet, i) => (
                  <div
                    key={tweet.id}
                    className="fade-in"
                    style={{
                      animationDelay: `${Math.min(i * 40, 400)}ms`,
                    }}
                  >
                    <StormCard tweet={tweet} onTap={setSelectedTweet} />
                  </div>
                ))}

                {/* Streaming indicator */}
                {(isLoading || loadingMore) && (
                  <div className="flex justify-center py-6">
                    <span className="text-xs text-[var(--muted)] bg-[var(--card-bg)] px-4 py-2 rounded-full border border-[var(--border)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                      {loadingMore
                        ? "Loading next section..."
                        : "Generating more..."}
                    </span>
                  </div>
                )}

                {/* End of content */}
                {reachedEnd && !isLoading && !loadingMore && (
                  <div className="flex justify-center py-8">
                    <span className="text-xs text-[var(--muted)] bg-[var(--card-bg)] px-4 py-2 rounded-full border border-[var(--border)]">
                      End of {currentSelection.split(" ")[0]}
                    </span>
                  </div>
                )}

                {/* Infinite scroll sentinel */}
                {!isLoading &&
                  !loadingMore &&
                  !reachedEnd &&
                  currentFeedCtx.current && (
                    <div ref={sentinelRef} className="h-1" />
                  )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── SEARCH VIEW ─── */}
      {activeTab === "search" && (
        <ExploreInline />
      )}

      {/* ─── MY SCROLLS VIEW ─── */}
      {activeTab === "myscrolls" && (
        <LibraryInline user={user} onShowAuth={() => setShowAuth(true)} />
      )}
      </div>{/* end main content area */}

      {/* Commentary page */}
      {selectedTweet && (
        <div className="fixed inset-0 z-50 bg-[var(--bg)] overflow-y-auto overscroll-contain">
          <CommentaryView
            tweet={selectedTweet}
            onBack={() => setSelectedTweet(null)}
          />
        </div>
      )}

      {/* Bookmarks sheet */}
      {showBookmarks && (
        <BookmarksSheet
          onClose={() => setShowBookmarks(false)}
          onTapTweet={(tweet) => {
            setShowBookmarks(false);
            setSelectedTweet(tweet);
          }}
        />
      )}

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          message={authMessage}
        />
      )}

      {/* Mobile bottom nav */}
      <BottomNav activeTab={activeTab} onNavigate={handleBottomNav} />
    </div>
  );
}
