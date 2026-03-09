"use client";

import { BookOpen, Printer } from "lucide-react";
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
      <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-blue-600 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[var(--text)] tracking-tight">
                MishnahFeed
              </h1>
              <p className="text-xs text-[var(--muted)]">
                Shared on {new Date(createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <a
              href="/"
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-blue-600 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all"
            >
              Create Your Own
            </a>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-2.5">
        <p className="max-w-xl mx-auto text-sm text-[var(--muted)]">
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
