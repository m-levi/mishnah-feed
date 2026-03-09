"use client";

import { useState, useEffect } from "react";
import { X, Bookmark, Trash2 } from "lucide-react";
import type { StormTweet } from "@/lib/types";

interface Props {
  onClose: () => void;
  onTapTweet: (tweet: StormTweet) => void;
}

export function BookmarksSheet({ onClose, onTapTweet }: Props) {
  const [bookmarks, setBookmarks] = useState<StormTweet[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mishnah-feed-saved");
      if (saved) setBookmarks(JSON.parse(saved));
    } catch {}
  }, []);

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem("mishnah-feed-saved", JSON.stringify(updated));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 modal-overlay"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-lg max-h-[85vh] bg-[var(--card-bg)] rounded-t-2xl sm:rounded-2xl overflow-hidden modal-sheet z-10">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto max-h-[85vh] px-5 pt-4 pb-8 sm:pt-6 sm:pb-6">
          <h3
            className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Bookmark className="w-4 h-4" />
            Bookmarks
          </h3>

          {bookmarks.length === 0 && (
            <p className="text-sm text-[var(--muted)] py-8 text-center">
              No bookmarks yet. Tap the bookmark icon on any tweet to save it.
            </p>
          )}

          {bookmarks.map((tweet, i) => (
            <div
              key={tweet.id}
              className="flex gap-3 py-3 border-b border-[var(--border)] last:border-0 fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onTapTweet(tweet)}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full">
                    {tweet.ref}
                  </span>
                </div>
                <p className="text-[14px] leading-[1.5] text-[var(--text)] line-clamp-3">
                  {tweet.text}
                </p>
              </div>
              <button
                onClick={() => removeBookmark(tweet.id)}
                className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
