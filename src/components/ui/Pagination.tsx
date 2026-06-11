import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  current: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

export function Pagination({ current, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 pt-4 pb-2">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--color-body)] rounded-[var(--radius-sm)] border border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        上一页
      </button>

      <span className="text-xs text-[var(--color-mute)] px-3">
        {current} / {totalPages}
      </span>

      <button
        onClick={() => onChange(current + 1)}
        disabled={current >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-[var(--color-body)] rounded-[var(--radius-sm)] border border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        下一页
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
