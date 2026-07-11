export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-28 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-36" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm animate-pulse">
      <div className="p-4 border-b border-gray-100">
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50 last:border-0">
          <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-48" />
            <div className="h-2.5 bg-gray-100 rounded w-32" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonLine() {
  return (
    <div className="animate-pulse flex items-center gap-3 py-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}