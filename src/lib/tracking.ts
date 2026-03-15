"use client";

import { supabase } from "./supabase";

const ANON_KEY = "mishnah-feed-anon-id";
const BATCH_INTERVAL = 4000;
const MAX_BATCH = 30;

function getAnonymousId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

export interface TrackingEvent {
  event_type: string;
  tweet_id?: string;
  slug?: string;
  ref?: string;
  source_type?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

let eventBuffer: TrackingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
let isFlushing = false;

export function setTrackingUser(id: string | null) {
  currentUserId = id;
}

export function trackEvent(event: TrackingEvent) {
  eventBuffer.push(event);

  if (eventBuffer.length >= MAX_BATCH) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, BATCH_INTERVAL);
  }
}

// Convenience trackers
export function trackView(tweet: {
  id: string;
  slug?: string;
  ref?: string;
  sourceRef?: string;
  label?: string;
}) {
  trackEvent({
    event_type: "view",
    tweet_id: tweet.id,
    slug: tweet.slug,
    ref: tweet.sourceRef || tweet.ref,
    label: tweet.label,
  });
}

export function trackDwell(
  tweet: {
    id: string;
    slug?: string;
    ref?: string;
    sourceRef?: string;
  },
  dwellMs: number
) {
  if (dwellMs < 500) return; // Ignore very short dwells
  trackEvent({
    event_type: "dwell",
    tweet_id: tweet.id,
    slug: tweet.slug,
    ref: tweet.sourceRef || tweet.ref,
    metadata: { dwell_time_ms: dwellMs },
  });
}

export function trackAction(
  action:
    | "like"
    | "unlike"
    | "bookmark"
    | "unbookmark"
    | "share"
    | "learn_more"
    | "copy",
  tweet: {
    id: string;
    slug?: string;
    ref?: string;
    sourceRef?: string;
    label?: string;
  }
) {
  trackEvent({
    event_type: action,
    tweet_id: tweet.id,
    slug: tweet.slug,
    ref: tweet.sourceRef || tweet.ref,
    label: tweet.label,
  });
}

export function trackFeedLoad(source: string, metadata?: Record<string, unknown>) {
  trackEvent({
    event_type: "feed_load",
    metadata: { source, ...metadata },
  });
}

export function trackTabSwitch(from: string, to: string) {
  trackEvent({
    event_type: "tab_switch",
    metadata: { from, to },
  });
}

async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventBuffer.length === 0 || isFlushing) return;
  isFlushing = true;

  const events = eventBuffer.splice(0, MAX_BATCH);
  const anonymousId = getAnonymousId();

  const rows = events.map((e) => ({
    user_id: currentUserId || undefined,
    anonymous_id: currentUserId ? undefined : anonymousId,
    event_type: e.event_type,
    tweet_id: e.tweet_id || undefined,
    slug: e.slug || undefined,
    ref: e.ref || undefined,
    source_type: e.source_type || undefined,
    label: e.label || undefined,
    metadata: e.metadata || {},
  }));

  try {
    await supabase.from("engagement_events").insert(rows);
  } catch {
    // Re-queue failed events (max 1 retry worth)
    if (eventBuffer.length < MAX_BATCH * 2) {
      eventBuffer.unshift(...events);
    }
  } finally {
    isFlushing = false;
    // If more events accumulated during flush, schedule another
    if (eventBuffer.length > 0 && !flushTimer) {
      flushTimer = setTimeout(flushEvents, BATCH_INTERVAL);
    }
  }
}

// Flush on page visibility change and unload
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });

  window.addEventListener("pagehide", () => {
    // Use sendBeacon for reliable delivery during page unload
    if (eventBuffer.length === 0) return;
    const anonymousId = getAnonymousId();
    const rows = eventBuffer.splice(0).map((e) => ({
      user_id: currentUserId || undefined,
      anonymous_id: currentUserId ? undefined : anonymousId,
      event_type: e.event_type,
      tweet_id: e.tweet_id || undefined,
      slug: e.slug || undefined,
      ref: e.ref || undefined,
      source_type: e.source_type || undefined,
      label: e.label || undefined,
      metadata: e.metadata || {},
    }));

    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/engagement_events`;
      navigator.sendBeacon(
        url,
        new Blob(
          [JSON.stringify(rows)],
          { type: "application/json" }
        )
      );
    } catch {
      // Best effort
    }
  });
}
