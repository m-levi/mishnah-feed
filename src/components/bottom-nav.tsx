"use client";

import { Home, BookOpen } from "lucide-react";

export type AppView = "feed" | "learning";

interface BottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

const items: { key: AppView; icon: typeof Home; label: string }[] = [
  { key: "feed", icon: Home, label: "Home" },
  { key: "learning", icon: BookOpen, label: "My Learning" },
];

export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-bg)]/95 backdrop-blur-md border-t border-[var(--border)] sm:hidden no-print">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-4">
        {items.map(({ key, icon: Icon, label }) => {
          const active = activeView === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`flex flex-col items-center gap-0.5 px-6 py-1 transition-colors cursor-pointer ${
                active ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={active ? 2.5 : 2}
                fill={active ? "currentColor" : "none"}
              />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
