"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Share2, Check, RefreshCw } from "lucide-react";
import { InlinePicker } from "@/components/mishnah-selector";
import { StormCard } from "@/components/storm-card";
import { TweetSkeleton } from "@/components/tweet-skeleton";
import { LearnMoreModal } from "@/components/learn-more-modal";
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

    // Stream ended without done event — finalize anyway
    onDone(0);
  } catch {
    if (!signal.aborted) {
      onError("Connection lost. Please try again.");
    }
  } finally {
    try {
      reader.cancel();
    } catch {
      // Already closed
    }
  }
}

// ── Main component ─────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("foryou");
  const [tweets, setTweets] = useState<StormTweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState<StormTweet | null>(null);
  const imageQueueRef = useRef<Set<number>>(new Set());
  const hasAutoLoaded = useRef(false);

  // Feed cache per tab
  const feedCacheRef = useRef<Record<string, FeedCache>>({});

  // Picker state per tab
  const [pickerStates, setPickerStates] = useState<Record<string, PickerState>>(
    {
      mishnayos: { ...defaultPickerState },
      gemara: { ...defaultPickerState },
      chumash: { ...defaultPickerState },
    }
  );

  // Active stream abort controller
  const activeStreamRef = useRef<AbortController | null>(null);

  const abortActiveStream = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
    }
  }, []);

  // Swipe tracking
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<number | null>(null);

  // Auto-load discovery feed on first mount
  useEffect(() => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    loadDiscoverFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDiscoverFeed = useCallback(async () => {
    abortActiveStream();
    const controller = new AbortController();
    activeStreamRef.current = controller;

    setIsLoading(true);
    setTweets([]);
    setError(null);
    setCurrentSelection("For You");
    setShareUrl(null);
    setCopied(false);
    imageQueueRef.current = new Set();

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
              // Compute per-ref totals for discover feed
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
      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      )
        return;
      if (!controller.signal.aborted) {
        setError("Failed to load feed. Tap refresh to try again.");
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
      if (activeStreamRef.current === controller) {
        activeStreamRef.current = null;
      }
    }
  }, [abortActiveStream]);

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      if (tab === activeTab) return;

      abortActiveStream();

      // Save current tab's feed to cache
      if (tweets.length > 0) {
        feedCacheRef.current[activeTab] = {
          tweets: [...tweets],
          selection: currentSelection,
        };
      }

      setActiveTab(tab);
      setShareUrl(null);
      setCopied(false);
      setError(null);
      setIsLoading(false);

      // Restore from cache or load fresh
      const cached = feedCacheRef.current[tab];
      if (cached && cached.tweets.length > 0) {
        setTweets(cached.tweets);
        setCurrentSelection(cached.selection);
      } else if (tab === "foryou") {
        loadDiscoverFeed();
      } else {
        setTweets([]);
        setCurrentSelection("");
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
      abortActiveStream();
      const controller = new AbortController();
      activeStreamRef.current = controller;

      setIsLoading(true);
      setTweets([]);
      setError(null);
      setCurrentSelection(displayName);
      setShareUrl(null);
      setCopied(false);
      imageQueueRef.current = new Set();

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
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        )
          return;
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
    [activeTab, abortActiveStream]
  );

  const handleUpdateTweet = useCallback(
    (index: number, updates: Partial<StormTweet>) => {
      setTweets((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
      );
    },
    []
  );

  // Async image loading — fires as tweets stream in
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
      setPickerStates((prev) => ({ ...prev, [activeTab]: newState }));
    },
    [activeTab]
  );

  const hasTweets = tweets.length > 0;
  const showFeed = hasTweets;
  const showEmpty =
    !isLoading && !hasTweets && activeTab !== "foryou" && !error;
  const showSkeletons = isLoading && !hasTweets;
  const imagesLoading = tweets.some((t) => t.imageLoading);
  const imagesTotal = tweets.filter((t) => t.needsImage).length;
  const imagesDone = tweets.filter((t) => t.needsImage && t.imageData).length;
  const activeTabIndex = tabs.findIndex((t) => t.key === activeTab);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
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
          {/* Sliding tab indicator */}
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

      {/* Feed info bar */}
      {showFeed && currentSelection && (
        <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <p className="text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">
                {currentSelection}
              </span>
              {" "}&middot; {tweets.length} tweets
              {isLoading && (
                <span className="text-[var(--accent)]"> &middot; generating...</span>
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
        {/* Loading skeletons — only when no tweets yet */}
        {showSkeletons && (
          <div>
            {Array.from({ length: 6 }, (_, i) => (
              <TweetSkeleton key={i} index={i} />
            ))}
          </div>
        )}

        {/* Empty state for source tabs */}
        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <p className="text-[var(--muted)] text-[15px]">
              Pick a text above and tap{" "}
              <strong className="text-[var(--text)]">Go</strong> to generate a
              feed
            </p>
          </div>
        )}

        {/* Feed — shows progressively as tweets stream in */}
        {showFeed && (
          <div>
            {tweets.map((tweet, i) => (
              <div
                key={tweet.id}
                className="fade-in"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <StormCard tweet={tweet} onTap={setSelectedTweet} />
              </div>
            ))}

            {/* Streaming indicator */}
            {isLoading && (
              <div className="flex justify-center py-6">
                <span className="text-xs text-[var(--muted)] bg-[var(--card-bg)] px-4 py-2 rounded-full border border-[var(--border)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  Generating more...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Learn more modal */}
      {selectedTweet && (
        <LearnMoreModal
          tweet={selectedTweet}
          onClose={() => setSelectedTweet(null)}
        />
      )}
    </div>
  );
}
