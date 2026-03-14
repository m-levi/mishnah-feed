"use client";

import { Users } from "lucide-react";
import type { Scroll } from "@/lib/types";

interface ScrollCardProps {
  scroll: Scroll;
  onClick?: () => void;
  showFollowers?: boolean;
}

export function ScrollCard({ scroll, onClick, showFollowers = true }: ScrollCardProps) {
  const typeLabel =
    scroll.scroll_type === "structured"
      ? "Text Study"
      : scroll.scroll_type === "calendar"
        ? "Calendar"
        : "Custom";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/50 hover:shadow-sm transition-all cursor-pointer text-left"
    >
      <div className="w-11 h-11 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-xl flex-shrink-0">
        {scroll.cover_emoji || "\uD83D\uDCDC"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[var(--text)] truncate">
          {scroll.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-medium text-[var(--accent)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded-full">
            {typeLabel}
          </span>
          {showFollowers && scroll.follower_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-[var(--muted)]">
              <Users className="w-3 h-3" />
              {scroll.follower_count}
            </span>
          )}
        </div>
        {scroll.description && (
          <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">
            {scroll.description}
          </p>
        )}
      </div>
    </button>
  );
}
