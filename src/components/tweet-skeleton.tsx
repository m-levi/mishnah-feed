export function TweetSkeleton({ index = 0 }: { index?: number }) {
  const showImage = index === 1 || index === 4;
  // Simulate thread grouping: indices 0-2 are one thread, 3-5 another
  const threadPos = index % 3; // 0 = first, 1 = mid, 2 = last
  const isFirst = threadPos === 0;
  const isLast = threadPos === 2;
  const showActions = isLast || index === 5;

  return (
    <div
      className={`bg-[var(--card-bg)] px-4 skeleton-pulse ${
        isLast ? "border-b border-[var(--border)]" : ""
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="max-w-2xl mx-auto flex gap-3 py-3">
        {/* Avatar + thread line */}
        <div className="flex flex-col items-center flex-shrink-0 w-10 relative">
          {!isFirst && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0.5 h-6 shimmer rounded-full" />
          )}
          {isFirst ? (
            <div className="w-10 h-10 rounded-full shimmer" />
          ) : (
            <div className="w-2 h-2 rounded-full shimmer mt-2" />
          )}
          {!isLast && (
            <div className="w-0.5 flex-1 mt-1 shimmer rounded-full" />
          )}
        </div>

        <div className="flex-1 space-y-2.5 pb-1">
          {/* Header */}
          {isFirst ? (
            <div className="flex gap-2 items-center">
              <div className="h-4 w-28 shimmer rounded" />
              <div className="h-3 w-16 shimmer rounded" />
            </div>
          ) : (
            <div className="h-3 w-8 shimmer rounded mt-1" />
          )}
          {/* Text lines */}
          <div className="space-y-1.5">
            <div className="h-[15px] w-full shimmer rounded" />
            <div className="h-[15px] w-[92%] shimmer rounded" />
            {isFirst && <div className="h-[15px] w-3/4 shimmer rounded" />}
          </div>
          {/* Image skeleton on some */}
          {showImage && (
            <div className="h-[180px] w-full shimmer rounded-2xl" />
          )}
          {/* Action bar — only on last card of thread */}
          {showActions && (
            <div className="flex gap-16 pt-1">
              <div className="h-4 w-4 shimmer rounded-full" />
              <div className="h-4 w-4 shimmer rounded-full" />
              <div className="h-4 w-4 shimmer rounded-full" />
              <div className="h-4 w-4 shimmer rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
