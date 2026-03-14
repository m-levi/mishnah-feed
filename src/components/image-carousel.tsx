"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { CarouselImage } from "@/lib/types";

interface ImageCarouselProps {
  images: CarouselImage[];
  alt: string;
}

export function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDelta = useRef(0);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(images.length - 1, index));
      setCurrent(clamped);
    },
    [images.length]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDelta.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDelta.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta.current) > 40) {
      if (touchDelta.current < 0) goTo(current + 1);
      else goTo(current - 1);
    }
    touchStartX.current = null;
    touchDelta.current = 0;
  };

  const allLoaded = images.every((img) => img.data);
  const anyLoaded = images.some((img) => img.data);

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-[var(--border)] relative">
      {/* Image track */}
      <div
        ref={trackRef}
        className="flex carousel-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((img, i) => (
          <div key={i} className="w-full flex-shrink-0">
            {img.data ? (
              <img
                src={`data:${img.mimeType || "image/png"};base64,${img.data}`}
                alt={`${alt} (${i + 1}/${images.length})`}
                className="w-full img-reveal"
              />
            ) : (
              <div className="relative">
                <div className="shimmer w-full" style={{ height: 200 }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                    <ImageIcon className="w-5 h-5 text-[var(--muted)] animate-pulse" />
                  </div>
                  <span className="text-xs font-medium text-[var(--muted)] bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full">
                    Generating {i + 1}/{images.length}...
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation arrows (desktop) — only show when we have loaded images */}
      {anyLoaded && images.length > 1 && (
        <>
          {current > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goTo(current - 1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {current < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goTo(current + 1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                i === current
                  ? "bg-white scale-110 shadow-sm"
                  : "bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
          {current + 1}/{images.length}
        </div>
      )}
    </div>
  );
}
