export function TweetSkeleton({ index = 0 }: { index?: number }) {
  const showImage = index === 1 || index === 3;

  return (
    <div
      className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 animate-pulse"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="max-w-xl mx-auto flex gap-3 py-3">
        {/* Avatar + thread line */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="w-0.5 flex-1 mt-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex-1 space-y-2.5 pb-1">
          {/* Header */}
          <div className="flex gap-2 items-center">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-8 bg-gray-100 rounded" />
          </div>
          {/* Text lines */}
          <div className="space-y-1.5">
            <div className="h-[15px] w-full bg-gray-200 rounded" />
            <div className="h-[15px] w-[92%] bg-gray-200 rounded" />
            <div className="h-[15px] w-3/4 bg-gray-200 rounded" />
          </div>
          {/* Image skeleton on some */}
          {showImage && (
            <div className="h-[180px] w-full bg-gray-200 rounded-2xl" />
          )}
          {/* Action bar */}
          <div className="flex gap-16 pt-1">
            <div className="h-4 w-4 bg-gray-100 rounded-full" />
            <div className="h-4 w-4 bg-gray-100 rounded-full" />
            <div className="h-4 w-4 bg-gray-100 rounded-full" />
            <div className="h-4 w-4 bg-gray-100 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
