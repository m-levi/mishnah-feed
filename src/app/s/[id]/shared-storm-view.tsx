"use client";

import { Printer } from "lucide-react";
import { StormCard } from "@/components/storm-card";
import type { StormTweet } from "@/lib/types";

interface Props {
  ref_: string;
  tweets: StormTweet[];
  createdAt: string;
}

export function SharedStormView({ ref_, tweets, createdAt }: Props) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold text-[var(--text)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Dvar
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Shared on {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <a
              href="/"
              className="px-4 py-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold transition-all cursor-pointer"
            >
              Try It
            </a>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-2.5">
        <p className="max-w-2xl mx-auto text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--text)]">{ref_}</span>{" "}
          &middot; {tweets.length} tweets
        </p>
      </div>

      <main>
        {tweets.map((tweet) => (
          <StormCard key={tweet.id} tweet={tweet} />
        ))}
      </main>
    </div>
  );
}
