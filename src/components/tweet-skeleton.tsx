export function TweetSkeleton({ index = 0 }: { index?: number }) {
  const showImage = index === 1 || index === 3;

  return (
    <div
      className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 skeleton-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="max-w-2xl mx-auto flex gap-3 py-3">
        {/* Avatar + thread line */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-10 h-10 rounded-full shimmer" />
          <div className="w-0.5 flex-1 mt-1 shimmer rounded-full" />
        </div>

        <div className="flex-1 space-y-2.5 pb-1">
          {/* Header */}
          <div className="flex gap-2 items-center">
            <div className="h-4 w-28 shimmer rounded" />
            <div className="h-3 w-8 shimmer rounded" />
          </div>
          {/* Text lines */}
          <div className="space-y-1.5">
            <div className="h-[15px] w-full shimmer rounded" />
            <div className="h-[15px] w-[92%] shimmer rounded" />
            <div className="h-[15px] w-3/4 shimmer rounded" />
          </div>
          {/* Image skeleton on some */}
          {showImage && (
            <div className="h-[180px] w-full shimmer rounded-2xl" />
          )}
          {/* Action bar */}
          <div className="flex gap-16 pt-1">
            <div className="h-4 w-4 shimmer rounded-full" />
            <div className="h-4 w-4 shimmer rounded-full" />
            <div className="h-4 w-4 shimmer rounded-full" />
            <div className="h-4 w-4 shimmer rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
