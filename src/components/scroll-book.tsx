"use client";

interface ScrollBookProps {
  title: string;
  emoji: string;
  color: string;
  size?: "sm" | "md";
}

export function ScrollBook({ title, emoji, color, size = "md" }: ScrollBookProps) {
  const isSm = size === "sm";
  const w = isSm ? 52 : 72;
  const h = isSm ? 68 : 92;
  const spine = isSm ? 8 : 12;
  const pages = isSm ? 4 : 6;

  return (
    <div
      className="book-3d"
      style={{
        width: w,
        height: h,
        perspective: 300,
      }}
    >
      {/* Page edges (visible behind the cover) */}
      <div
        className="book-pages"
        style={{
          position: "absolute",
          right: 0,
          top: 2,
          width: w - spine + 2,
          height: h - 4,
          borderRadius: "0 3px 3px 0",
          background: `repeating-linear-gradient(
            to bottom,
            #f5f0e8 0px,
            #f5f0e8 2px,
            #e8e0d4 2px,
            #e8e0d4 3px
          )`,
          transform: "translateZ(-2px)",
          boxShadow: "1px 1px 3px rgba(0,0,0,0.15)",
        }}
      />

      {/* Book cover */}
      <div
        className="book-cover"
        style={{
          position: "relative",
          width: w,
          height: h,
          background: `linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 100%)`,
          borderRadius: "2px 4px 4px 2px",
          transform: "rotateY(-12deg)",
          transformOrigin: "left center",
          boxShadow: `
            2px 2px 6px rgba(0,0,0,0.3),
            inset -1px 0 1px rgba(255,255,255,0.1)
          `,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isSm ? 2 : 4,
          overflow: "hidden",
        }}
      >
        {/* Spine highlight */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: spine,
            height: "100%",
            background: `linear-gradient(90deg, ${adjustBrightness(color, -30)} 0%, ${adjustBrightness(color, -10)} 100%)`,
            borderRight: `1px solid ${adjustBrightness(color, -35)}`,
          }}
        />

        {/* Cover emboss lines */}
        <div
          style={{
            position: "absolute",
            top: isSm ? 4 : 6,
            left: spine + 4,
            right: 4,
            height: 1,
            background: "rgba(255,255,255,0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: isSm ? 4 : 6,
            left: spine + 4,
            right: 4,
            height: 1,
            background: "rgba(255,255,255,0.15)",
          }}
        />

        {/* Emoji */}
        <span
          style={{
            fontSize: isSm ? 16 : 22,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
            marginLeft: spine / 2,
          }}
        >
          {emoji}
        </span>

        {/* Title */}
        <span
          style={{
            fontSize: isSm ? 7 : 9,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: w - spine - 8,
            marginLeft: spine / 2,
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {title}
        </span>
      </div>

      {/* Bottom page edge */}
      <div
        style={{
          position: "absolute",
          bottom: -pages,
          left: spine - 1,
          right: -1,
          height: pages,
          background: `linear-gradient(to bottom, #e8e0d4, #ddd5c8)`,
          borderRadius: "0 0 2px 0",
          transform: "rotateX(90deg)",
          transformOrigin: "top center",
        }}
      />
    </div>
  );
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
