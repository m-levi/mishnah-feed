"use client";

import { Home, Compass, ScrollText, Bookmark } from "lucide-react";

export type BottomNavKey = "foryou" | "search" | "myscrolls" | "bookmarks";

interface BottomNavProps {
  activeTab: string;
  onNavigate: (key: BottomNavKey) => void;
}

const items: { key: BottomNavKey; icon: typeof Home; label: string }[] = [
  { key: "foryou", icon: Home, label: "For You" },
  { key: "search", icon: Compass, label: "Search" },
  { key: "myscrolls", icon: ScrollText, label: "My Scrolls" },
  { key: "bookmarks", icon: Bookmark, label: "Bookmarks" },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-bg)]/98 backdrop-blur-lg border-t border-[var(--border)] sm:hidden no-print">
      <div className="flex items-center justify-around h-[52px] max-w-lg mx-auto">
        {items.map(({ key, icon: Icon, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-colors cursor-pointer active:scale-95 ${
                active ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-[var(--accent)]" />
              )}
              <Icon
                className="w-[22px] h-[22px]"
                strokeWidth={active ? 2.5 : 1.8}
                fill={active ? "currentColor" : "none"}
              />
              <span className={`text-[10px] mt-0.5 ${active ? "font-bold" : "font-medium"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div className="h-[env(safe-area-inset-bottom)] bg-[var(--card-bg)]" />
    </nav>
  );
}
