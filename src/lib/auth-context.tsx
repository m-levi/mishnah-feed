"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkUsageLimit: () => boolean;
  incrementUsage: () => void;
  usageRemaining: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DAILY_LIMIT = 5;
const USAGE_KEY = "mishnah-feed-usage";

function getUsageToday(): number {
  try {
    const data = JSON.parse(localStorage.getItem(USAGE_KEY) || "{}");
    const today = new Date().toISOString().slice(0, 10);
    if (data.date === today) return data.count || 0;
    return 0;
  } catch {
    return 0;
  }
}

function setUsageToday(count: number) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(USAGE_KEY, JSON.stringify({ date: today, count }));
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    setUsageCount(getUsageToday());

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const checkUsageLimit = useCallback(() => {
    return true; // No rate limiting — free for all
  }, []);

  const incrementUsage = useCallback(() => {
    // No-op — no rate limiting
  }, []);

  const usageRemaining = Infinity;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        checkUsageLimit,
        incrementUsage,
        usageRemaining,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
