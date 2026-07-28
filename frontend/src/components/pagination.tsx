"use client";

// `page` must be the caller's page STATE, not the page echoed by the server —
// server data lags in-flight fetches and stale values swallow rapid clicks.
export function Pagination({
  page,
  totalPages,
  onPageChange,
  compact = false,
  prevLabel = "← Prev",
  nextLabel = "Next →",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
  prevLabel?: string;
  nextLabel?: string;
}) {
  if (totalPages <= 1) return null;

  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));

  if (compact) {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
        <button
          onClick={prev}
          disabled={page <= 1}
          className="text-xs text-white/60 hover:text-white disabled:opacity-30"
        >
          {prevLabel}
        </button>
        <span className="text-xs text-white/40 tabular-nums">
          {page}/{totalPages}
        </span>
        <button
          onClick={next}
          disabled={page >= totalPages}
          className="text-xs text-white/60 hover:text-white disabled:opacity-30"
        >
          {nextLabel}
        </button>
      </div>
    );
  }

  const buttonClass =
    "px-4 py-2 rounded-lg text-sm bg-white/5 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors";

  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <button onClick={prev} disabled={page <= 1} className={buttonClass}>
        {prevLabel}
      </button>
      <span className="text-sm text-white/60 tabular-nums">
        Page {page} of {totalPages}
      </span>
      <button onClick={next} disabled={page >= totalPages} className={buttonClass}>
        {nextLabel}
      </button>
    </div>
  );
}
