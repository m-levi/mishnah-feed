"use client";

import { Home, Compass, BookOpen, User } from "lucide-react";

export type AppView = "feed" | "explore" | "library" | "profile";

interface BottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const items: { key: AppView; icon: typeof Home; label: string }[] = [
  { key: "feed", icon: Home, label: "Feed" },
  { key: "explore", icon: Compass, label: "Explore" },
  { key: "library", icon: BookOpen, label: "Library" },
  { key: "profile", icon: User, label: "Profile" },
];

export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-bg)]/98 backdrop-blur-lg border-t border-[var(--border)] sm:hidden no-print">
      <div className="flex items-center justify-around h-[52px] max-w-lg mx-auto">
        {items.map(({ key, icon: Icon, label }) => {
          const active = activeView === key;
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
