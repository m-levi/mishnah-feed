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
} from "lucide-react";
import { InlinePicker } from "@/components/mishnah-selector";
import { StormCard } from "@/components/storm-card";
import { TweetSkeleton } from "@/components/tweet-skeleton";
import { LearnMoreModal } from "@/components/learn-more-modal";
import { BookmarksSheet } from "@/components/bookmarks-sheet";
import { BottomNav, type AppView } from "@/components/bottom-nav";
import { MyLearningView } from "@/components/my-learning-view";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { getItemFromState, getNextRef } from "@/lib/source-data";
import type { StormTweet, SourceType, PickerState } from "@/lib/types";

type TabKey = "foryou" | "mishnayos" | "gemara" | "chumash";

const tabs: { key: TabKey; label: string }[] = [
  { key: "foryou", label: "For You" },
  { key: "mishnayos", label: "Mishnayos" },
  { key: "gemara", label: "Gemara" },
  { key: "chumash", label: "Tanakh" },
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

const LS_PICKER_KEY = "mishnah-feed-pickers";
const LS_LAST_STUDIED_KEY = "mishnah-feed-last-studied";

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

// ── Main component ─────────────────────────────────────────
export default function HomePage() {
  const { user, checkUsageLimit, incrementUsage, usageRemaining } = useAuth();

  const [appView, setAppView] = useState<AppView>("feed");
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

  // Save progress to Supabase when a storm finishes loading
  const saveProgress = useCallback(
    async (slug: string, ref: string, sourceType: SourceType, displayName: string) => {
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

      if (tweets.length > 0) {
        feedCacheRef.current[activeTab] = {
          ...feedCacheRef.current[activeTab],
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

      const cached = feedCacheRef.current[tab];
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
      } else if (tab === "foryou") {
        loadDiscoverFeed();
      } else {
        setTweets([]);
        setCurrentSelection("");
        currentFeedCtx.current = null;
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

  // Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
    touchEndRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || touchEndRef.current === null) return;
    const distanceX = touchStartRef.current.x - touchEndRef.current;
    if (Math.abs(distanceX) < 60) return;

    const tabKeys = tabs.map((t) => t.key);
    const currentIndex = tabKeys.indexOf(activeTab);

    if (distanceX > 0 && currentIndex < tabKeys.length - 1) {
      handleTabChange(tabKeys[currentIndex + 1]);
    } else if (distanceX < 0 && currentIndex > 0) {
      handleTabChange(tabKeys[currentIndex - 1]);
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
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
    setAppView("feed");
    const tab = lastStudied.tab as TabKey;
    setActiveTab(tab);
    setPickerStates((prev) => {
      const updated = { ...prev, [tab]: lastStudied.pickerState };
      savePickerStates(updated);
      return updated;
    });
    handleSelect(
      lastStudied.slug,
      lastStudied.ref,
      lastStudied.sourceType,
      lastStudied.displayName
    );
  }, [lastStudied, handleSelect]);

  const hasTweets = tweets.length > 0;
  const showFeed = hasTweets;
  const showEmpty =
    !isLoading && !hasTweets && activeTab !== "foryou" && !error;
  const showSkeletons = isLoading && !hasTweets;
  const imagesLoading = tweets.some((t) => t.imageLoading);
  const imagesTotal = tweets.filter((t) => t.needsImage).length;
  const imagesDone = tweets.filter(
    (t) => t.needsImage && t.imageData
  ).length;
  const activeTabIndex = tabs.findIndex((t) => t.key === activeTab);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-16 sm:pb-0">
      {/* ─── FEED VIEW ─── */}
      {appView === "feed" && (
        <>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)] no-print">
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between">
              <h1
                className="text-lg font-semibold text-[var(--text)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                MishnahFeed
              </h1>

              <div className="flex gap-0.5">
                {/* Desktop: My Learning link */}
                <button
                  onClick={() => setAppView("learning")}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--muted)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  My Learning
                </button>
                <button
                  onClick={() => setShowBookmarks(true)}
                  className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer"
                  title="Bookmarks"
                >
                  <Bookmark className="w-4 h-4 text-[var(--muted)]" />
                </button>
                {!user ? (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer"
                    title="Sign In"
                  >
                    <User className="w-4 h-4 text-[var(--muted)]" />
                  </button>
                ) : (
                  <button
                    onClick={() => setAppView("learning")}
                    className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                    title={user.email || "Profile"}
                  >
                    {(user.email || "U")[0].toUpperCase()}
                  </button>
                )}
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
                {showFeed && !isLoading && (
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

            {/* Tab row */}
            <div className="max-w-2xl mx-auto relative">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer relative ${
                      activeTab === tab.key
                        ? "text-[var(--text)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                className="absolute bottom-0 h-[3px] rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
                style={{
                  width: `${100 / tabs.length}%`,
                  left: `${(activeTabIndex * 100) / tabs.length}%`,
                }}
              />
            </div>
          </div>

          {/* Inline picker for source tabs */}
          {activeTab !== "foryou" && (
            <InlinePicker
              sourceType={activeTab as SourceType}
              onSelect={handleSelect}
              isLoading={isLoading}
              state={pickerStates[activeTab] || defaultPickerState}
              onStateChange={handlePickerStateChange}
            />
          )}

          {/* Usage bar for anonymous users */}
          {!user && activeTab !== "foryou" && usageRemaining <= 3 && usageRemaining > 0 && (
            <div className="bg-[var(--accent-light)] border-b border-[var(--accent-muted)] px-4 py-2">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                <p className="text-xs text-[var(--accent)]">
                  {usageRemaining} free generation{usageRemaining !== 1 ? "s" : ""} left today
                </p>
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Sign in for unlimited
                </button>
              </div>
            </div>
          )}

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
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
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

      {/* ─── MY LEARNING VIEW ─── */}
      {appView === "learning" && (
        <div>
          <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)] no-print">
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
              <h1
                className="text-lg font-semibold text-[var(--text)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                My Learning
              </h1>
              <button
                onClick={() => setAppView("feed")}
                className="hidden sm:flex text-sm text-[var(--accent)] font-medium hover:underline cursor-pointer"
              >
                Back to Feed
              </button>
            </div>
          </div>
          <MyLearningView onShowAuth={() => setShowAuth(true)} />
        </div>
      )}

      {/* Bottom navigation (mobile) */}
      <BottomNav activeView={appView} onNavigate={setAppView} />

      {/* Learn more modal */}
      {selectedTweet && (
        <LearnMoreModal
          tweet={selectedTweet}
          onClose={() => setSelectedTweet(null)}
        />
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
    </div>
  );
}
